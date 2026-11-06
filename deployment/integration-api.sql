-- Additive migration for existing production databases; safe to run again.
ALTER TABLE checking_sessions ADD COLUMN IF NOT EXISTS integration_metadata JSONB;
