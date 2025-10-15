-- Create table for caching Xero financial data to improve load times
CREATE TABLE IF NOT EXISTS xero_financial_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  avg_turnover NUMERIC(12, 2) DEFAULT 0,
  gross_margin NUMERIC(5, 2) DEFAULT 0,
  material_cost NUMERIC(12, 2) DEFAULT 0,
  subcontractor_use NUMERIC(12, 2) DEFAULT 0,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on month to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_xero_financial_cache_month ON xero_financial_cache (month);

-- Create index on cached_at for quick freshness checks
CREATE INDEX IF NOT EXISTS idx_xero_financial_cache_cached_at ON xero_financial_cache (cached_at);

-- RLS Policies
ALTER TABLE xero_financial_cache ENABLE ROW LEVEL SECURITY;

-- Admin users can read cached financial data
CREATE POLICY "Admins can view xero financial cache" ON xero_financial_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin users can insert/update cached data
CREATE POLICY "Admins can manage xero financial cache" ON xero_financial_cache
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE xero_financial_cache IS 'Caches Xero financial data to improve load times (refreshed daily)';

