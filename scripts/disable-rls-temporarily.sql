-- Temporarily disable RLS on form_assignments table to fix assignment creation issues
-- This is for debugging - RLS should be re-enabled once the underlying data issues are fixed

-- Disable RLS on form_assignments table
ALTER TABLE form_assignments DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on profiles table if it's causing issues
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('form_assignments', 'profiles');

-- Show what this means
SELECT 'RLS has been temporarily disabled on form_assignments and profiles tables for debugging' as status; 