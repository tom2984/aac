-- Add email notification support to form_questions table
ALTER TABLE public.form_questions 
ADD COLUMN IF NOT EXISTS email_notify BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN public.form_questions.email_notify IS 'If true, sends email to the form creator when this question is answered';

-- Create function to send email notifications for specific questions
CREATE OR REPLACE FUNCTION notify_question_answered()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if any of the answered questions have email_notify enabled
    IF EXISTS (
        SELECT 1 
        FROM public.form_questions fq 
        WHERE fq.id = NEW.question_id 
        AND fq.email_notify = true
    ) THEN
        -- Insert notification for the form creator (admin who created the form)
        INSERT INTO public.notifications (recipient_id, type, title, message, data)
        SELECT 
            f.created_by,
            'question_answered' as type,
            CONCAT('Question answered: ', fq.question_text) as title,
            CONCAT(
                'A monitored question has been answered.',
                E'\n\nQuestion: ', fq.question_text,
                E'\nAnswer: ', 
                CASE 
                    WHEN jsonb_typeof(NEW.answer) = 'string' THEN NEW.answer #>> '{}'
                    WHEN jsonb_typeof(NEW.answer) = 'array' THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.answer)), ', ')
                    ELSE NEW.answer::text
                END,
                E'\n\nForm: ', f.title,
                E'\nSubmitted by: ', COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User')
            ) as message,
            json_build_object(
                'question_id', NEW.question_id,
                'response_id', NEW.response_id,
                'form_id', fr.form_id,
                'question_text', fq.question_text,
                'answer', NEW.answer,
                'email_target', 'form_creator'
            ) as data
        FROM public.form_questions fq
        LEFT JOIN public.form_responses fr ON fr.id = NEW.response_id
        LEFT JOIN public.forms f ON f.id = fr.form_id
        LEFT JOIN public.profiles p ON p.id = fr.respondent_id
        WHERE fq.id = NEW.question_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for question answer notifications
DROP TRIGGER IF EXISTS trigger_notify_question_answered ON public.form_response_answers;
CREATE TRIGGER trigger_notify_question_answered
    AFTER INSERT ON public.form_response_answers
    FOR EACH ROW
    EXECUTE FUNCTION notify_question_answered();

-- Add index for faster email notification lookups
CREATE INDEX IF NOT EXISTS idx_form_questions_email_notify 
ON public.form_questions(email_notify) 
WHERE email_notify = true;