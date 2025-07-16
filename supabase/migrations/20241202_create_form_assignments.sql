-- Create form_assignments table with proper schema
-- This table tracks which employees are assigned to which forms

-- Create assignment status enum
CREATE TYPE assignment_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');

-- Create form_assignments table
CREATE TABLE form_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    status assignment_status NOT NULL DEFAULT 'pending',
    due_date DATE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(form_id, employee_id) -- One assignment per employee per form
);

-- Create indexes for performance
CREATE INDEX idx_form_assignments_form_id ON form_assignments(form_id);
CREATE INDEX idx_form_assignments_employee_id ON form_assignments(employee_id);
CREATE INDEX idx_form_assignments_assigned_by ON form_assignments(assigned_by);
CREATE INDEX idx_form_assignments_status ON form_assignments(status);
CREATE INDEX idx_form_assignments_due_date ON form_assignments(due_date);

-- Add updated_at trigger
CREATE TRIGGER update_form_assignments_updated_at
    BEFORE UPDATE ON form_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE form_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Employees can view their own assignments
CREATE POLICY "Employees can view own assignments" ON form_assignments
    FOR SELECT 
    USING (auth.uid() = employee_id);

-- Admins can view assignments they created
CREATE POLICY "Admins can view assignments they created" ON form_assignments
    FOR SELECT 
    USING (auth.uid() = assigned_by);

-- Admins can create assignments for their employees
CREATE POLICY "Admins can create assignments for their employees" ON form_assignments
    FOR INSERT 
    WITH CHECK (
        auth.uid() = assigned_by 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = employee_id 
            AND role = 'employee' 
            AND invited_by = auth.uid()
        )
    );

-- Admins can update assignments they created
CREATE POLICY "Admins can update assignments they created" ON form_assignments
    FOR UPDATE 
    USING (auth.uid() = assigned_by);

-- Employees can update their own assignment status
CREATE POLICY "Employees can update own assignment status" ON form_assignments
    FOR UPDATE 
    USING (auth.uid() = employee_id);

-- Admins can delete assignments they created
CREATE POLICY "Admins can delete assignments they created" ON form_assignments
    FOR DELETE 
    USING (auth.uid() = assigned_by);

-- Create a profiles table if it doesn't exist (for the RLS policy)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'employee',
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create basic policies for profiles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON profiles
            FOR SELECT 
            USING (auth.uid() = id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins can view invited users'
    ) THEN
        CREATE POLICY "Admins can view invited users" ON profiles
            FOR SELECT 
            USING (auth.uid() = invited_by OR auth.uid() = id);
    END IF;
END $$; 