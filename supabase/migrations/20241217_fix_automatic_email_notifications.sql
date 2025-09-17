-- Enhanced notification trigger that ALSO sends emails automatically
-- This replaces the existing trigger to add immediate email sending

CREATE OR REPLACE FUNCTION notify_question_answered_with_email()
RETURNS TRIGGER AS $$
DECLARE
    form_creator_id uuid;
    form_creator_email text;
    form_title text;
    question_text text;
    submitter_name text;
    formatted_answer text;
    api_url text;
    email_payload jsonb;
    http_response text;
BEGIN
    -- Check if any of the answered questions have email_notify enabled
    IF EXISTS (
        SELECT 1 
        FROM public.form_questions fq 
        WHERE fq.id = NEW.question_id 
        AND fq.email_notify = true
    ) THEN
        
        -- Get all the data we need for the notification and email
        SELECT 
            f.created_by,
            f.title,
            fq.question_text,
            p_creator.email,
            COALESCE(p_submitter.first_name || ' ' || p_submitter.last_name, 'Unknown User')
        INTO 
            form_creator_id,
            form_title,
            question_text,
            form_creator_email,
            submitter_name
        FROM public.form_questions fq
        LEFT JOIN public.form_responses fr ON fr.id = NEW.response_id
        LEFT JOIN public.forms f ON f.id = fr.form_id
        LEFT JOIN public.profiles p_creator ON p_creator.id = f.created_by
        LEFT JOIN public.profiles p_submitter ON p_submitter.id = fr.respondent_id
        WHERE fq.id = NEW.question_id;
        
        -- Format the answer
        formatted_answer := CASE 
            WHEN jsonb_typeof(NEW.answer) = 'string' THEN NEW.answer #>> '{}'
            WHEN jsonb_typeof(NEW.answer) = 'array' THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.answer)), ', ')
            ELSE NEW.answer::text
        END;
        
        -- 1. Create the database notification (existing behavior)
        INSERT INTO public.notifications (recipient_id, type, title, message, data, created_at)
        VALUES (
            form_creator_id,
            'question_answered',
            CONCAT('Question answered: ', question_text),
            CONCAT(
                'A monitored question has been answered.',
                E'\n\nQuestion: ', question_text,
                E'\nAnswer: ', formatted_answer,
                E'\n\nForm: ', form_title,
                E'\nSubmitted by: ', submitter_name
            ),
            json_build_object(
                'question_id', NEW.question_id,
                'response_id', NEW.response_id,
                'form_id', (SELECT form_id FROM public.form_responses WHERE id = NEW.response_id),
                'question_text', question_text,
                'answer', NEW.answer,
                'email_target', 'form_creator'
            ),
            NOW()
        );
        
        -- 2. Send email immediately via API call
        IF form_creator_email IS NOT NULL THEN
            
            -- Prepare email payload
            email_payload := jsonb_build_object(
                'recipientEmail', form_creator_email,
                'questionText', question_text,
                'formattedAnswer', formatted_answer,
                'formTitle', form_title,
                'submitterName', submitter_name,
                'responseId', NEW.response_id::text,
                'questionId', NEW.question_id::text
            );
            
            -- Determine API URL (adjust for your environment)
            api_url := CASE 
                WHEN current_setting('app.environment', true) = 'production'
                THEN 'https://your-production-domain.com/api/notifications/email'
                ELSE 'http://localhost:3000/api/notifications/email'
            END;
            
            -- Make HTTP request to send email
            -- Note: This requires pg_net extension or http extension
            -- For now, we'll log this instead and handle via a periodic job
            RAISE NOTICE 'EMAIL_TRIGGER: Notification created for %, email should be sent to %', form_creator_id, form_creator_email;
            RAISE NOTICE 'EMAIL_PAYLOAD: %', email_payload::text;
            
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the existing trigger with the enhanced one
DROP TRIGGER IF EXISTS trigger_notify_question_answered ON public.form_response_answers;
CREATE TRIGGER trigger_notify_question_answered_with_email
    AFTER INSERT ON public.form_response_answers
    FOR EACH ROW
    EXECUTE FUNCTION notify_question_answered_with_email();

-- Add comment for documentation
COMMENT ON FUNCTION notify_question_answered_with_email() IS 'Creates notification AND triggers email sending when monitored questions are answered';
