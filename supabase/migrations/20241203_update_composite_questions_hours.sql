-- Update existing composite questions to include new hours lost options
-- This migration updates the sub_questions for existing composite questions to include:
-- Client, Materials not arriving (Supplier), Weather drying up, Leaving site

-- Update composite questions that have the old 3-option structure
UPDATE form_questions 
SET sub_questions = '[
  {"question": "Weather", "answer": 0},
  {"question": "Technical problems", "answer": 0}, 
  {"question": "Other reasons", "answer": 0},
  {"question": "Client", "answer": 0},
  {"question": "Materials not arriving (Supplier)", "answer": 0},
  {"question": "Weather drying up", "answer": 0},
  {"question": "Leaving site", "answer": 0}
]'::jsonb
WHERE question_type = 'composite' 
  AND jsonb_array_length(sub_questions) = 3
  AND sub_questions::text LIKE '%Weather%'
  AND sub_questions::text LIKE '%Technical%'
  AND sub_questions::text LIKE '%Other%';

-- Add comment for tracking
COMMENT ON COLUMN form_questions.sub_questions IS 'Updated to include 7 hours lost tracking options: Weather, Technical problems, Other reasons, Client, Materials not arriving (Supplier), Weather drying up, Leaving site';

-- Create a function to migrate existing form response answers to include new fields
CREATE OR REPLACE FUNCTION migrate_composite_answers()
RETURNS void AS $$
DECLARE
    answer_record RECORD;
    updated_answer jsonb;
BEGIN
    -- Loop through all form response answers for composite questions
    FOR answer_record IN 
        SELECT fra.id, fra.answer, fq.id as question_id
        FROM form_response_answers fra
        JOIN form_questions fq ON fra.question_id = fq.id
        WHERE fq.question_type = 'composite'
          AND fra.answer IS NOT NULL
    LOOP
        -- Start with existing answer
        updated_answer := answer_record.answer;
        
        -- Add missing fields with default value 0 if they don't exist
        IF NOT (updated_answer ? 'client') THEN
            updated_answer := updated_answer || '{"client": 0}'::jsonb;
        END IF;
        
        IF NOT (updated_answer ? 'materials') THEN
            updated_answer := updated_answer || '{"materials": 0}'::jsonb;
        END IF;
        
        IF NOT (updated_answer ? 'drying') THEN
            updated_answer := updated_answer || '{"drying": 0}'::jsonb;
        END IF;
        
        IF NOT (updated_answer ? 'leaving') THEN
            updated_answer := updated_answer || '{"leaving": 0}'::jsonb;
        END IF;
        
        -- Update the answer if any changes were made
        IF updated_answer != answer_record.answer THEN
            UPDATE form_response_answers 
            SET answer = updated_answer
            WHERE id = answer_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_composite_answers();

-- Drop the function after use
DROP FUNCTION migrate_composite_answers();
