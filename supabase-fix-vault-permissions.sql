-- Fix the automatic email trigger to handle vault permission issues
-- This makes the trigger fault-tolerant so it doesn't break form submissions

CREATE OR REPLACE FUNCTION send_notification_email_automatically()
RETURNS TRIGGER AS $$
DECLARE
    form_creator_email text;
    form_title text;
    question_text text;
    submitter_name text;
    formatted_answer text;
    webhook_url text;
    email_payload jsonb;
    request_id bigint;
BEGIN
    -- Only process question_answered notifications
    IF NEW.type = 'question_answered' AND NEW.data ? 'email_target' THEN
        
        -- Try to get the Make.com webhook URL from vault with error handling
        BEGIN
            SELECT decrypted_secret INTO webhook_url 
            FROM vault.decrypted_secrets 
            WHERE name = 'MAKE_NOTIFICATION_WEBHOOK_URL';
        EXCEPTION 
            WHEN insufficient_privilege OR OTHERS THEN
                -- If vault access fails, log and skip email but don't fail the transaction
                RAISE NOTICE 'Cannot access vault for webhook URL, skipping email notification';
                RETURN NEW;
        END;
        
        -- If no webhook URL configured, skip email sending
        IF webhook_url IS NULL OR webhook_url = '' THEN
            RAISE NOTICE 'No MAKE_NOTIFICATION_WEBHOOK_URL configured, skipping email';
            RETURN NEW;
        END IF;
        
        -- Wrap the entire email sending in a try-catch to prevent form submission failures
        BEGIN
            -- Get recipient email
            SELECT email INTO form_creator_email
            FROM public.profiles 
            WHERE id = NEW.recipient_id;
            
            -- Skip if no email found
            IF form_creator_email IS NULL THEN
                RAISE NOTICE 'No email found for recipient_id: %', NEW.recipient_id;
                RETURN NEW;
            END IF;
            
            -- Extract notification data
            question_text := NEW.data->>'question_text';
            
            -- Get form title
            SELECT title INTO form_title
            FROM public.forms 
            WHERE id = (NEW.data->>'form_id')::uuid;
            
            -- Get submitter name from form response
            SELECT CONCAT(COALESCE(p.first_name, 'Unknown'), ' ', COALESCE(p.last_name, 'User'))
            INTO submitter_name
            FROM public.profiles p
            JOIN public.form_responses fr ON fr.respondent_id = p.id
            WHERE fr.id = (NEW.data->>'response_id')::uuid;
            
            -- Format the answer
            formatted_answer := CASE 
                WHEN jsonb_typeof(NEW.data->'answer') = 'string' THEN NEW.data->>'answer'
                WHEN jsonb_typeof(NEW.data->'answer') = 'array' THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.data->'answer')), ', ')
                ELSE (NEW.data->'answer')::text
            END;
            
            -- Prepare email payload for Make.com
            email_payload := jsonb_build_object(
                'recipientEmail', form_creator_email,
                'questionText', question_text,
                'formattedAnswer', formatted_answer,
                'formTitle', COALESCE(form_title, 'Unknown Form'),
                'submitterName', COALESCE(submitter_name, 'Unknown User'),
                'responseId', NEW.data->>'response_id',
                'questionId', NEW.data->>'question_id'
            );
            
            -- Make async HTTP request to Make.com webhook
            SELECT net.http_post(
                url := webhook_url,
                body := email_payload,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json'
                )
            ) INTO request_id;
            
            -- Log success
            RAISE NOTICE 'Email notification sent automatically for notification %, request_id: %', NEW.id, request_id;
            
            -- Mark notification as processed immediately
            UPDATE public.notifications 
            SET processed_at = NOW() 
            WHERE id = NEW.id;
            
        EXCEPTION 
            WHEN OTHERS THEN
                -- If anything fails in email sending, log the error but don't fail the form submission
                RAISE NOTICE 'Email notification failed for notification %: %', NEW.id, SQLERRM;
                -- Still return NEW to allow the notification to be created successfully
        END;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger function
DROP TRIGGER IF EXISTS trigger_send_notification_email_automatically ON public.notifications;
CREATE TRIGGER trigger_send_notification_email_automatically
    AFTER INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION send_notification_email_automatically();
