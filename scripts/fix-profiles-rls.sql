-- Fix profiles table RLS policies
-- Run this in your Supabase Dashboard > SQL Editor

-- First, let's check the current state of the profiles table
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    policies
FROM pg_tables 
LEFT JOIN (
    SELECT 
        schemaname,
        tablename,
        string_agg(policyname, ', ') as policies
    FROM pg_policies 
    GROUP BY schemaname, tablename
) pol USING (schemaname, tablename)
WHERE tablename = 'profiles';

-- Check if profiles table exists and has RLS enabled
SELECT 
    table_name,
    row_security
FROM information_schema.tables
LEFT JOIN (
    SELECT 
        table_name,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_class c 
                JOIN pg_namespace n ON n.oid = c.relnamespace 
                WHERE c.relname = table_name 
                AND n.nspname = 'public' 
                AND c.relrowsecurity = true
            ) THEN 'enabled'
            ELSE 'disabled'
        END as row_security
    FROM information_schema.tables
    WHERE table_name = 'profiles'
) rls USING (table_name)
WHERE table_name = 'profiles';

-- Create the profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view invited employees" ON profiles;
DROP POLICY IF EXISTS "Admins can update invited employees" ON profiles;

-- Create new policies
-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT 
    USING (auth.uid() = id);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE 
    USING (auth.uid() = id);

-- Policy 3: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Policy 4: Admins can view profiles of employees they invited
CREATE POLICY "Admins can view invited employees" ON profiles
    FOR SELECT 
    USING (
        -- Allow viewing own profile
        auth.uid() = id 
        OR 
        -- Allow admins to view employees they invited
        (
            auth.uid() = invited_by 
            AND role = 'employee'
        )
    );

-- Policy 5: Admins can update profiles of employees they invited
CREATE POLICY "Admins can update invited employees" ON profiles
    FOR UPDATE 
    USING (
        -- Allow updating own profile
        auth.uid() = id 
        OR 
        -- Allow admins to update employees they invited
        (
            auth.uid() = invited_by 
            AND role = 'employee'
        )
    );

-- Verify the policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Test the policies by checking what profiles are visible
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    status,
    invited_by,
    CASE 
        WHEN invited_by IS NOT NULL THEN 'Employee'
        ELSE 'Admin/User'
    END as user_type
FROM profiles
ORDER BY role, email; 