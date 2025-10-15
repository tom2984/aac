-- Create table for storing signup confirmation tokens
CREATE TABLE IF NOT EXISTS signup_confirmation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_signup_confirmation_tokens_token ON signup_confirmation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_signup_confirmation_tokens_email ON signup_confirmation_tokens(email);
CREATE INDEX IF NOT EXISTS idx_signup_confirmation_tokens_expires_at ON signup_confirmation_tokens(expires_at);

-- RLS policies (restrict access to service role only for security)
ALTER TABLE signup_confirmation_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can manage these tokens
CREATE POLICY "Service role can manage signup confirmation tokens" ON signup_confirmation_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_signup_confirmation_tokens_updated_at 
  BEFORE UPDATE ON signup_confirmation_tokens 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
