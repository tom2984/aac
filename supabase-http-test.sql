-- Test if Supabase supports HTTP extensions for direct webhook calls

-- Check if pg_net extension is available (Supabase's preferred HTTP extension)
SELECT * FROM pg_available_extensions WHERE name = 'pg_net';

-- Check if http extension is available  
SELECT * FROM pg_available_extensions WHERE name = 'http';

-- Check currently installed extensions
SELECT extname FROM pg_extension WHERE extname IN ('pg_net', 'http');

-- Test function to make HTTP calls directly from PostgreSQL
-- This would be the ideal solution for automatic email sending
CREATE OR REPLACE FUNCTION test_http_availability()
RETURNS TEXT AS $$
BEGIN
    -- Try to use pg_net if available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        RETURN 'pg_net is installed and can be used for HTTP calls';
    END IF;
    
    -- Try to use http extension if available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') THEN
        RETURN 'http extension is installed and can be used for HTTP calls';
    END IF;
    
    RETURN 'No HTTP extensions available - cannot make direct HTTP calls from database';
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT test_http_availability();
