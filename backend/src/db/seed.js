import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

export async function runSeeds() {
  const client = await pool.connect();
  try {
    console.log('[SEED] Starting database seeding...');
    await client.query('BEGIN');

    // 1. Seed Admin User
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const userPasswordHash = await bcrypt.hash('User123!', 10);

    const adminRes = await client.query(`
      INSERT INTO users (email, password_hash, name, role, status, lead_quota)
      VALUES ($1, $2, $3, 'admin', 'active', 1000000)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role
      RETURNING id;
    `, ['admin@blachecker.com', adminPasswordHash, 'System Administrator']);
    const adminId = adminRes.rows[0].id;

    // 2. Seed Regular User
    await client.query(`
      INSERT INTO users (email, password_hash, name, role, status, lead_quota)
      VALUES ($1, $2, $3, 'user', 'active', 250000)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role
      RETURNING id;
    `, ['user@blachecker.com', userPasswordHash, 'Lead Operations Specialist']);

    // 3. Seed Default BLA API Configuration
    await client.query(`
      INSERT INTO api_configurations (service_name, base_url, api_key, batch_size, rate_limit_per_sec, is_mock_mode, mock_dnc_rate, updated_by)
      VALUES ('BLA_API', 'https://api.externalbla.com/v1/dnc-check', 'bla_sec_test_enterprise_9981', 100, 10, true, 18, $1)
      ON CONFLICT (service_name) DO UPDATE SET
        base_url = EXCLUDED.base_url,
        api_key = EXCLUDED.api_key,
        batch_size = EXCLUDED.batch_size,
        rate_limit_per_sec = EXCLUDED.rate_limit_per_sec,
        is_mock_mode = EXCLUDED.is_mock_mode,
        mock_dnc_rate = EXCLUDED.mock_dnc_rate;
    `, [adminId]);

    // 4. Master DNC initialized clean (no dummy records)
    console.log('[SEED] Master DNC is clean and ready for user uploads.');

    // 5. Seed Initial Audit Log
    await client.query(`
      INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address)
      VALUES ($1, 'admin@blachecker.com', 'SYSTEM_INITIALIZATION', 'SYSTEM', '0', $2, '127.0.0.1')
    `, [adminId, JSON.stringify({ message: 'BLA Checker initialized with seeded Master DNC entries and system accounts' })]);

    await client.query('COMMIT');
    console.log('[SEED] Seeding completed! Seeded users and API config successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[SEED] Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith('seed.js')) {
  runSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
