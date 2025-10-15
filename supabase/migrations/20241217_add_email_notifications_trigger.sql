-- Add automatic email sending when notifications are created
-- This connects the database notifications to the email API

-- First, we need to enable the http extension for making HTTP requests from PostgreSQL
-- NOTE: This might need to be enabled by Supabase support in some cases
CREATE EXTENSION IF NOT EXISTS http;

-- Create function to send notification emails automatically
CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER AS $$
DECLARE
    email_data jsonb;
    form_data jsonb;
    question_data jsonb;
    recipient_email text;
    api_url text;
    response_data text;
BEGIN
    -- Only process question_answered notifications that have email_target
    IF NEW.type = 'question_answered' AND NEW.data ? 'email_target' THEN
        
        -- Get recipient email
        SELECT email INTO recipient_email
        FROM public.profiles 
        WHERE id = NEW.recipient_id;
        
        -- Skip if no email found
        IF recipient_email IS NULL THEN
            RAISE WARNING 'No email found for recipient_id: %', NEW.recipient_id;
            RETURN NEW;
        END IF;
        
        -- Extract data from notification
        question_data := NEW.data;
        
        -- Get form title
        SELECT title INTO form_data
        FROM public.forms 
        WHERE id = (question_data->>'form_id')::uuid;
        
        -- Get submitter name
        SELECT CONCAT(COALESCE(first_name, 'Unknown'), ' ', COALESCE(last_name, 'User')) 
        INTO email_data
        FROM public.profiles p
        JOIN public.form_responses fr ON fr.respondent_id = p.id
        WHERE fr.id = (question_data->>'response_id')::uuid;
        
        -- Prepare email data
        email_data := jsonb_build_object(
            'recipientEmail', recipient_email,
            'questionText', question_data->>'question_text',
            'formattedAnswer', CASE 
                WHEN jsonb_typeof(question_data->'answer') = 'string' THEN question_data->>'answer'
                WHEN jsonb_typeof(question_data->'answer') = 'array' THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(question_data->'answer')), ', ')
                ELSE (question_data->'answer')::text
            END,
            'formTitle', form_data,
            'submitterName', email_data,
            'responseId', question_data->>'response_id',
            'questionId', question_data->>'question_id'
        );
        
        -- Construct API URL (assuming localhost for development)
        -- Note: In production, you'd use your actual domain
        api_url := CASE 
            WHEN current_setting('app.environment', true) = 'production' 
            THEN 'https://your-domain.com/api/notifications/email'
            ELSE 'http://localhost:3000/api/notifications/email'
        END;
        
        -- Make HTTP request to email API
        BEGIN
            SELECT content INTO response_data 
            FROM http_post(
                api_url,
                email_data::text,
                'application/json'
            );
            
            RAISE NOTICE 'Email notification sent successfully for notification ID: %', NEW.id;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to send email notification for notification ID: %. Error: %', NEW.id, SQLERRM;
        END;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically send emails when notifications are created
DROP TRIGGER IF EXISTS trigger_send_notification_email ON public.notifications;
CREATE TRIGGER trigger_send_notification_email
    AFTER INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION send_notification_email();

-- Add comment for documentation
COMMENT ON FUNCTION send_notification_email() IS 'Automatically sends email notifications via the API when database notifications are created';
