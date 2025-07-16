-- Update existing form_assignments table with missing columns (FIXED VERSION)
-- Run this in your Supabase Dashboard > SQL Editor

-- Check current structure of form_assignments table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'form_assignments'
ORDER BY ordinal_position;

-- Check existing enum values for assignment_status
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'assignment_status'
);

-- Add missing enum values to assignment_status if they don't exist
DO $$
BEGIN
    -- Add 'in_progress' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'in_progress' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assignment_status')
    ) THEN
        ALTER TYPE assignment_status ADD VALUE 'in_progress';
    END IF;
    
    -- Add 'overdue' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'overdue' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assignment_status')
    ) THEN
        ALTER TYPE assignment_status ADD VALUE 'overdue';
    END IF;
END $$;

-- Add missing columns if they don't exist
-- Check if due_date column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_assignments' 
        AND column_name = 'due_date'
    ) THEN
        ALTER TABLE form_assignments ADD COLUMN due_date DATE;
    END IF;
END $$;

-- Check if assigned_at column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_assignments' 
        AND column_name = 'assigned_at'
    ) THEN
        ALTER TABLE form_assignments ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Check if completed_at column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_assignments' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE form_assignments ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Check if created_at column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_assignments' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE form_assignments ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Check if updated_at column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_assignments' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE form_assignments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Remove the check constraint that was causing issues (since we're using enum)
-- DO NOT add the check constraint - the enum already handles validation

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_form_assignments_form_id ON form_assignments(form_id);
CREATE INDEX IF NOT EXISTS idx_form_assignments_employee_id ON form_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_form_assignments_assigned_by ON form_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_form_assignments_status ON form_assignments(status);
CREATE INDEX IF NOT EXISTS idx_form_assignments_due_date ON form_assignments(due_date);

-- Add updated_at trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_form_assignments_updated_at'
    ) THEN
        CREATE TRIGGER update_form_assignments_updated_at
            BEFORE UPDATE ON form_assignments
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE form_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
-- Employees can view their own assignments
DROP POLICY IF EXISTS "Employees can view own assignments" ON form_assignments;
CREATE POLICY "Employees can view own assignments" ON form_assignments
    FOR SELECT 
    USING (auth.uid() = employee_id);

-- Admins can view assignments they created
DROP POLICY IF EXISTS "Admins can view assignments they created" ON form_assignments;
CREATE POLICY "Admins can view assignments they created" ON form_assignments
    FOR SELECT 
    USING (auth.uid() = assigned_by);

-- Admins can create assignments for their employees
DROP POLICY IF EXISTS "Admins can create assignments for their employees" ON form_assignments;
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
DROP POLICY IF EXISTS "Admins can update assignments they created" ON form_assignments;
CREATE POLICY "Admins can update assignments they created" ON form_assignments
    FOR UPDATE 
    USING (auth.uid() = assigned_by);

-- Employees can update their own assignment status
DROP POLICY IF EXISTS "Employees can update own assignment status" ON form_assignments;
CREATE POLICY "Employees can update own assignment status" ON form_assignments
    FOR UPDATE 
    USING (auth.uid() = employee_id);

-- Admins can delete assignments they created
DROP POLICY IF EXISTS "Admins can delete assignments they created" ON form_assignments;
CREATE POLICY "Admins can delete assignments they created" ON form_assignments
    FOR DELETE 
    USING (auth.uid() = assigned_by);

-- Verify the final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'form_assignments'
ORDER BY ordinal_position;

-- Show the updated enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'assignment_status'
)
ORDER BY enumsortorder; 