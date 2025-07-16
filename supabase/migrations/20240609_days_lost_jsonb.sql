-- Migration: Update days lost model to use jsonb answers and new question type

-- 1. Change answer column to jsonb (if not already)
ALTER TABLE form_response_answers
  ALTER COLUMN answer TYPE jsonb
  USING 
    CASE 
      WHEN jsonb_typeof(answer::jsonb) IS NOT NULL THEN answer::jsonb
      ELSE jsonb_build_object('weather', 0, 'technical', 0, 'other', 0)
    END;

-- 2. Update question_type for days lost questions to 'days_lost'
UPDATE form_questions
SET question_type = 'days_lost'
WHERE question_type IN ('multiselect', 'number')
  AND (question_text ILIKE '%days lost%' OR question_text ILIKE '%weather%' OR question_text ILIKE '%technical%' OR question_text ILIKE '%other%'); 