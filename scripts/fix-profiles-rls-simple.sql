-- Fix profiles table RLS policies
-- Run this in your Supabase Dashboard > SQL Editor

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view invited employees" ON profiles;
DROP POLICY IF EXISTS "Admins can update invited employees" ON profiles;

-- Policy 1: Users can view their own profile OR profiles of employees they invited
CREATE POLICY "Users can view own profile or invited employees" ON profiles
    FOR SELECT 
    USING (
        auth.uid() = id 
        OR 
        auth.uid() = invited_by
    );

-- Policy 2: Users can update their own profile OR profiles of employees they invited
CREATE POLICY "Users can update own profile or invited employees" ON profiles
    FOR UPDATE 
    USING (
        auth.uid() = id 
        OR 
        auth.uid() = invited_by
    );

-- Policy 3: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Policy 4: Users can delete their own profile (optional)
CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE 
    USING (auth.uid() = id);

-- Verify the policies are created
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname; 