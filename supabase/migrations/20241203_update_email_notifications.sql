-- Update the email notification function to send to form creator instead of Katie
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
