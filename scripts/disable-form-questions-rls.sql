-- Disable RLS on form_questions table temporarily for debugging
-- Run this in your Supabase Dashboard > SQL Editor if questions still fail to create

-- First, let's check the current enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'question_type'
)
ORDER BY enumsortorder;

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'form_questions';

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'form_questions';

-- TEMPORARILY disable RLS on form_questions (for debugging only)
ALTER TABLE form_questions DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'form_questions';

-- Test insert (this should work if RLS was the issue)
-- You can uncomment this to test:
/*
INSERT INTO form_questions (
    form_id,
    question_text,
    question_type,
    is_required,
    order_index
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- dummy form_id
    'Test question',
    'text',
    false,
    0
);
*/

-- TO RE-ENABLE RLS LATER (run this after testing):
-- ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY; 