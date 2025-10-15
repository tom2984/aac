-- Create table for storing Xero OAuth tokens
CREATE TABLE IF NOT EXISTS xero_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  tenant_id TEXT NOT NULL,
  tenant_name TEXT,
  connected_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only allow one active connection (single-tenant internal tool)
CREATE UNIQUE INDEX IF NOT EXISTS idx_xero_connection_singleton ON xero_connection ((true));

-- RLS Policies
ALTER TABLE xero_connection ENABLE ROW LEVEL SECURITY;

-- Admin users can read the connection status
CREATE POLICY "Admins can view xero connection" ON xero_connection
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin users can insert/update the connection
CREATE POLICY "Admins can manage xero connection" ON xero_connection
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE xero_connection IS 'Stores Xero OAuth tokens for financial data integration (single connection for internal tool)';

