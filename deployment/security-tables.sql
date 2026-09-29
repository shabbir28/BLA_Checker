-- Run once on production PostgreSQL (does not change existing DNC/session/user data).
-- Safe to re-run: CREATE IF NOT EXISTS + ALTER ADD COLUMN IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS security_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ip_allowlist_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO security_settings (id, ip_allowlist_enabled)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS allowed_ips (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- If the table already exists from an earlier deploy, add the new column:
ALTER TABLE allowed_ips ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_allowed_ips_address ON allowed_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_allowed_ips_status ON allowed_ips(status);
