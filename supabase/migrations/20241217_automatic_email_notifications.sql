-- Enable automatic email notifications via pg_net HTTP calls
-- This creates a database trigger that automatically sends emails when notifications are created

-- Enable the pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to automatically send emails when notifications are created
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
        
        -- Get the Make.com webhook URL from environment/settings
        -- Note: You'll need to set this in your Supabase dashboard under Settings > Vault
        SELECT decrypted_secret INTO webhook_url 
        FROM vault.decrypted_secrets 
        WHERE name = 'MAKE_NOTIFICATION_WEBHOOK_URL';
        
        -- If no webhook URL configured, skip email sending
        IF webhook_url IS NULL OR webhook_url = '' THEN
            RAISE NOTICE 'No MAKE_NOTIFICATION_WEBHOOK_URL configured, skipping email';
            RETURN NEW;
        END IF;
        
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
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically send emails when notifications are created
DROP TRIGGER IF EXISTS trigger_send_notification_email_automatically ON public.notifications;
CREATE TRIGGER trigger_send_notification_email_automatically
    AFTER INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION send_notification_email_automatically();

-- Add comment for documentation
COMMENT ON FUNCTION send_notification_email_automatically() IS 'Automatically sends email notifications via Make.com when database notifications are created';

-- Ensure processed_at column exists (from previous migration)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_processed_at 
ON public.notifications(processed_at, type) 
WHERE processed_at IS NOT NULL;
