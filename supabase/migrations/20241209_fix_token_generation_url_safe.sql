-- Fix token generation to use URL-safe characters
-- Replace base64 encoding with hex encoding to avoid + and / characters

CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
    -- Generate a secure random token using hex encoding (URL-safe)
    -- 32 bytes = 64 hex characters (more secure than original 24 bytes base64)
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;
