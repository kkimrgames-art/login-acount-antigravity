-- Enhanced schema with additional security and performance features

-- Create accounts table with better indexing
CREATE TABLE IF NOT EXISTS antigravity_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  project_id TEXT,
  expires_in INTEGER,
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_to_local BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 1,
  last_login_ip TEXT,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create codex accounts table (GPT Codex)
CREATE TABLE IF NOT EXISTS codex_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  id_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT DEFAULT 'openid profile email offline_access',
  expires_in INTEGER DEFAULT 3599,
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_to_local BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 1,
  last_login_ip TEXT
);

-- Create auth links table with better constraints
CREATE TABLE IF NOT EXISTS auth_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id TEXT NOT NULL UNIQUE,
  created_by_chat_id BIGINT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_ip TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT valid_chat_id CHECK (created_by_chat_id > 0)
);

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  UNIQUE(ip_address, endpoint)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_email ON antigravity_accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_synced ON antigravity_accounts(synced_to_local) WHERE synced_to_local = false;
CREATE INDEX IF NOT EXISTS idx_accounts_created ON antigravity_accounts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_codex_email ON codex_accounts(email);
CREATE INDEX IF NOT EXISTS idx_codex_synced ON codex_accounts(synced_to_local) WHERE synced_to_local = false;
CREATE INDEX IF NOT EXISTS idx_codex_created ON codex_accounts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_link_id ON auth_links(link_id);
CREATE INDEX IF NOT EXISTS idx_links_used ON auth_links(used) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_links_expires ON auth_links(expires_at) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip_address, endpoint);

-- Enable Row Level Security
ALTER TABLE antigravity_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE codex_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for service role)
CREATE POLICY "Service role full access accounts" ON antigravity_accounts
  FOR ALL USING (true);

CREATE POLICY "Service role full access codex" ON codex_accounts
  FOR ALL USING (true);

CREATE POLICY "Service role full access links" ON auth_links
  FOR ALL USING (true);

CREATE POLICY "Service role full access audit" ON audit_logs
  FOR ALL USING (true);

CREATE POLICY "Service role full access rate_limits" ON rate_limits
  FOR ALL USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON antigravity_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_codex_updated_at
  BEFORE UPDATE ON codex_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired links (run daily)
CREATE OR REPLACE FUNCTION clean_expired_links()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_links 
  WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean old audit logs (run weekly)
CREATE OR REPLACE FUNCTION clean_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type TEXT,
  p_user_email TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_logs (
    event_type,
    user_email,
    ip_address,
    user_agent,
    success,
    error_message,
    metadata
  ) VALUES (
    p_event_type,
    p_user_email,
    p_ip_address,
    p_user_agent,
    p_success,
    p_error_message,
    p_metadata
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for statistics
CREATE OR REPLACE VIEW account_statistics AS
SELECT
  COUNT(*) as total_accounts,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') as accounts_today,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as accounts_this_week,
  COUNT(*) FILTER (WHERE synced_to_local = false) as pending_sync,
  MAX(created_at) as last_account_created
FROM antigravity_accounts;

-- Create view for codex statistics
CREATE OR REPLACE VIEW codex_statistics AS
SELECT
  COUNT(*) as total_accounts,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') as accounts_today,
  COUNT(*) FILTER (WHERE synced_to_local = false) as pending_sync,
  MAX(created_at) as last_account_created
FROM codex_accounts;

-- Create view for link statistics
CREATE OR REPLACE VIEW link_statistics AS
SELECT
  COUNT(*) as total_links,
  COUNT(*) FILTER (WHERE used = false AND expires_at > NOW()) as active_links,
  COUNT(*) FILTER (WHERE used = true) as used_links,
  COUNT(*) FILTER (WHERE expires_at < NOW() AND used = false) as expired_links
FROM auth_links;

-- Grant permissions on views
GRANT SELECT ON account_statistics TO authenticated, anon;
GRANT SELECT ON codex_statistics TO authenticated, anon;
GRANT SELECT ON link_statistics TO authenticated, anon;

-- Add new columns if they don't exist (for migrations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'antigravity_accounts' AND column_name = 'expires_in') THEN
    ALTER TABLE antigravity_accounts ADD COLUMN expires_in INTEGER DEFAULT 3599;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'antigravity_accounts' AND column_name = 'token_type') THEN
    ALTER TABLE antigravity_accounts ADD COLUMN token_type TEXT DEFAULT 'Bearer';
  END IF;
END $$;
