-- Create invite_tokens table for secure invitations
CREATE TABLE IF NOT EXISTS public.invite_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'employee',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON public.invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_email ON public.invite_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_invited_by ON public.invite_tokens(invited_by);

-- Enable RLS
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view their own sent invitations
CREATE POLICY "Admins can view own invitations" ON public.invite_tokens
    FOR SELECT 
    USING (auth.uid() = invited_by);

-- Admins can create invitations
CREATE POLICY "Admins can create invitations" ON public.invite_tokens
    FOR INSERT 
    WITH CHECK (auth.uid() = invited_by);

-- Admins can update their own invitations
CREATE POLICY "Admins can update own invitations" ON public.invite_tokens
    FOR UPDATE 
    USING (auth.uid() = invited_by);

-- Anyone can view invitation by token (needed for accepting invites)
CREATE POLICY "Anyone can view invitation by token" ON public.invite_tokens
    FOR SELECT 
    USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_invite_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_invite_tokens_updated_at
    BEFORE UPDATE ON public.invite_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_invite_tokens_updated_at();

-- Function to clean up expired tokens (run manually or via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_invite_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired tokens
    DELETE FROM public.invite_tokens 
    WHERE expires_at < NOW() 
    AND status = 'pending';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure random token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
    -- Generate a secure random token (32 characters)
    RETURN encode(gen_random_bytes(24), 'base64');
END;
$$ LANGUAGE plpgsql; 