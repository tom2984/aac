-- Add composite question type to existing question_type enum
ALTER TYPE question_type ADD VALUE 'composite';

-- Add answer_format column to form_questions table  
-- This determines if the answer should be text or number format
ALTER TABLE form_questions 
ADD COLUMN answer_format text CHECK (answer_format IN ('text', 'number')) DEFAULT 'text';

-- Add sub_questions column to form_questions table
-- This stores the sub-questions for composite question types
ALTER TABLE form_questions 
ADD COLUMN sub_questions jsonb DEFAULT '[]'::jsonb;

-- Create indexes for better query performance
CREATE INDEX idx_form_questions_question_type ON form_questions(question_type);
CREATE INDEX idx_form_questions_answer_format ON form_questions(answer_format);

-- Add comments for documentation
COMMENT ON COLUMN form_questions.answer_format IS 'Format for question answers: text or number';
COMMENT ON COLUMN form_questions.sub_questions IS 'Array of sub-questions for composite question types';

-- Example of composite question structure in sub_questions:
-- [
--   {"key": "weather", "label": "Weather", "default_value": 0},
--   {"key": "technical", "label": "Technical problems", "default_value": 0},
--   {"key": "other", "label": "Other reasons", "default_value": 0}
-- ] 