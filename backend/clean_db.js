import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || undefined,
  database: process.env.DB_NAME || 'bla_checker',
  connectionTimeoutMillis: 5000,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL successfully.');
    // Check if there are locks
    const locks = await client.query(`
      SELECT pid, query, state, age(clock_timestamp(), query_start) 
      FROM pg_stat_activity 
      WHERE datname = 'bla_checker' AND pid <> pg_backend_pid();
    `);
    console.log('Active queries in bla_checker:', locks.rows);

    for (const row of locks.rows) {
      if (row.state === 'idle in transaction' || row.state === 'active') {
        console.log('Terminating stale pid:', row.pid);
        await client.query('SELECT pg_terminate_backend($1)', [row.pid]);
      }
    }

    console.log('Trunctating/deleting tables...');
    await client.query('TRUNCATE session_records, checking_sessions, master_dnc, audit_logs CASCADE;');
    console.log('ALL TABLES TRUNCATED SUCCESSFULLY!');

    const countDnc = await client.query('SELECT COUNT(*) FROM master_dnc;');
    const countSessions = await client.query('SELECT COUNT(*) FROM checking_sessions;');
    const countRecords = await client.query('SELECT COUNT(*) FROM session_records;');
    const countUsers = await client.query('SELECT COUNT(*), array_agg(email) as emails FROM users;');

    await client.query('DELETE FROM api_configurations WHERE service_name = $1;', ['BLA_API']);
    await client.query(
      `INSERT INTO api_configurations (service_name, base_url, api_key, batch_size, is_mock_mode)
       VALUES ($1, $2, $3, $4, $5);`,
      ['BLA_API', 'https://api.blacklistalliance.net/bulklookup', 'KePFGNcVHPpzjxU88nWD', 500, false]
    );

    const apiConfig = await client.query('SELECT service_name, base_url, api_key, is_mock_mode FROM api_configurations;');
    console.log('- api_configurations:', apiConfig.rows[0]);
    console.log('Current Counts:');
    console.log('- master_dnc:', countDnc.rows[0].count);
    console.log('- checking_sessions:', countSessions.rows[0].count);
    console.log('- session_records:', countRecords.rows[0].count);
    console.log('- users preserved:', countUsers.rows[0]);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
