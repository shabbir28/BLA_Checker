import { pool } from '../config/db.js';

export async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('[MIGRATION] Starting PostgreSQL schema migration...');
    await client.query('BEGIN');

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
        lead_quota INT DEFAULT 500000,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Master DNC Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_dnc (
        id BIGSERIAL PRIMARY KEY,
        phone_number VARCHAR(30) NOT NULL,
        normalized_phone VARCHAR(20) UNIQUE NOT NULL,
        source VARCHAR(50) DEFAULT 'MANUAL_UPLOAD',
        campaign_or_file VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_master_dnc_norm_phone ON master_dnc(normalized_phone);
      CREATE INDEX IF NOT EXISTS idx_master_dnc_source ON master_dnc(source);
      CREATE INDEX IF NOT EXISTS idx_master_dnc_created ON master_dnc(created_at DESC);
    `);

    // 3. Checking Sessions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS checking_sessions (
        id UUID PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        session_name VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_type VARCHAR(50),
        total_rows INT DEFAULT 0,
        valid_numbers INT DEFAULT 0,
        invalid_numbers INT DEFAULT 0,
        duplicate_numbers INT DEFAULT 0,
        local_dnc_count INT DEFAULT 0,
        bla_dnc_count INT DEFAULT 0,
        clean_count INT DEFAULT 0,
        api_calls_saved INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
        stage VARCHAR(50) DEFAULT 'IDLE',
        progress_percent NUMERIC(5, 2) DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_checking_sessions_user_id ON checking_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_checking_sessions_status ON checking_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_checking_sessions_created ON checking_sessions(created_at DESC);
    `);

    // 4. Session Records Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_records (
        id BIGSERIAL PRIMARY KEY,
        session_id UUID REFERENCES checking_sessions(id) ON DELETE CASCADE,
        raw_phone VARCHAR(50),
        normalized_phone VARCHAR(30),
        original_row_data JSONB,
        status VARCHAR(30) NOT NULL CHECK (status IN ('CLEAN', 'LOCAL_DNC', 'BLA_DNC', 'INVALID', 'DUPLICATE')),
        reason TEXT,
        bla_response_raw JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_session_records_session_status ON session_records(session_id, status);
      CREATE INDEX IF NOT EXISTS idx_session_records_phone ON session_records(normalized_phone);
    `);

    // 5. API Configurations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_configurations (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(50) UNIQUE DEFAULT 'BLA_API',
        base_url VARCHAR(255) NOT NULL,
        api_key TEXT,
        batch_size INT DEFAULT 100,
        rate_limit_per_sec INT DEFAULT 10,
        is_mock_mode BOOLEAN DEFAULT true,
        mock_dnc_rate INT DEFAULT 18,
        updated_by INT REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Audit Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        user_email VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(100),
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION] All tables and indexes created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION] Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
