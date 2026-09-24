import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import blaService from '../services/blaService.js';

export async function getDashboardAnalytics(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const sessionsWhereClauses = [];
    const joinedWhereClauses = [];
    const params = [];

    if (startDate) {
      params.push(startDate);
      sessionsWhereClauses.push(`created_at >= $${params.length}`);
      joinedWhereClauses.push(`s.created_at >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      sessionsWhereClauses.push(`created_at <= $${params.length}`);
      joinedWhereClauses.push(`s.created_at <= $${params.length}`);
    }

    const sessionsWhereSql = sessionsWhereClauses.length > 0 ? `WHERE ${sessionsWhereClauses.join(' AND ')}` : '';
    const joinedWhereSql = joinedWhereClauses.length > 0 ? `WHERE ${joinedWhereClauses.join(' AND ')}` : '';

    // 1. Core KPIs
    const dncCountRes = await query('SELECT COUNT(*) as total_dnc FROM master_dnc');
    const sessionsAggRes = await query(`
      SELECT
        COUNT(*) as total_sessions,
        COALESCE(SUM(total_rows), 0) as total_leads_checked,
        COALESCE(SUM(clean_count), 0) as total_clean,
        COALESCE(SUM(local_dnc_count), 0) as total_local_dnc,
        COALESCE(SUM(bla_dnc_count), 0) as total_bla_dnc,
        COALESCE(SUM(clean_count + bla_dnc_count), 0) as total_bla_checked,
        COALESCE(SUM(invalid_numbers), 0) as total_invalid,
        COALESCE(SUM(duplicate_numbers), 0) as total_duplicates,
        COALESCE(SUM(api_calls_saved), 0) as total_api_saved,
        COUNT(CASE WHEN status IN ('QUEUED', 'PROCESSING') THEN 1 END) as active_sessions,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_sessions
      FROM checking_sessions
      ${sessionsWhereSql}
    `, params);

    // Today specific BLA checked count
    const todayBlaRes = await query(`
      SELECT
        COALESCE(SUM(clean_count + bla_dnc_count), 0) as today_bla_checked,
        COALESCE(SUM(total_rows), 0) as today_total_leads,
        COALESCE(SUM(clean_count), 0) as today_clean,
        COALESCE(SUM(local_dnc_count), 0) as today_local_dnc,
        COALESCE(SUM(bla_dnc_count), 0) as today_bla_dnc
      FROM checking_sessions
      WHERE created_at >= CURRENT_DATE
    `);

    const usersCountRes = await query("SELECT COUNT(*) as total_users FROM users WHERE status = 'active'");

    const totalDnc = parseInt(dncCountRes.rows[0].total_dnc, 10);
    const agg = sessionsAggRes.rows[0];
    const todayAgg = todayBlaRes.rows[0];

    const totalLeads = parseInt(agg.total_leads_checked, 10);
    const totalClean = parseInt(agg.total_clean, 10);
    const totalLocalDnc = parseInt(agg.total_local_dnc, 10);
    const totalBlaDnc = parseInt(agg.total_bla_dnc, 10);
    const totalBlaChecked = parseInt(agg.total_bla_checked, 10);
    const totalDncMatched = totalLocalDnc + totalBlaDnc;
    const totalApiSaved = parseInt(agg.total_api_saved, 10);

    const totalVerified = totalClean + totalDncMatched;
    const cleanRate = totalVerified > 0 ? ((totalClean / totalVerified) * 100).toFixed(1) : 0;
    const estimatedCostSaved = (totalApiSaved * 0.005).toFixed(2); // $0.005 per saved API call

    // 2. Timeline chart (filtered or last 30 days)
    const timelineWhere = sessionsWhereSql || "WHERE created_at >= NOW() - INTERVAL '30 days'";
    const timelineRes = await query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD') as day,
        COUNT(*) as session_count,
        COALESCE(SUM(total_rows), 0) as total_leads,
        COALESCE(SUM(clean_count), 0) as clean_leads,
        COALESCE(SUM(clean_count + bla_dnc_count), 0) as bla_checked_leads,
        COALESCE(SUM(local_dnc_count + bla_dnc_count), 0) as dnc_leads,
        COALESCE(SUM(local_dnc_count), 0) as local_dnc_leads,
        COALESCE(SUM(bla_dnc_count), 0) as bla_dnc_leads,
        COALESCE(SUM(invalid_numbers), 0) as invalid_leads,
        COALESCE(SUM(duplicate_numbers), 0) as duplicate_leads,
        COALESCE(SUM(api_calls_saved), 0) as api_saved
      FROM checking_sessions
      ${timelineWhere}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY day ASC
    `, sessionsWhereSql ? params : []);

    // 3. Recent Sessions (with date filter if applied)
    const recentSessionsRes = await query(`
      SELECT s.id, s.session_name, s.original_filename, s.total_rows, s.clean_count,
             s.local_dnc_count, s.bla_dnc_count, (s.clean_count + s.bla_dnc_count) as bla_checked,
             s.status, s.stage, s.progress_percent,
             s.api_calls_saved, s.created_at, u.name as user_name, u.email as user_email
      FROM checking_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      ${joinedWhereSql}
      ORDER BY s.created_at DESC
      LIMIT 10
    `, params);

    // 4. Source Breakdown in Master DNC
    const sourceBreakdownRes = await query(`
      SELECT source, COUNT(*) as count
      FROM master_dnc
      GROUP BY source
      ORDER BY count DESC
    `);

    return res.json({
      kpis: {
        totalMasterDnc: totalDnc,
        totalLeadsChecked: totalLeads,
        totalCleanLeads: totalClean,
        totalDncMatched,
        totalLocalDnc,
        totalBlaDnc,
        totalBlaChecked,
        totalInvalid: parseInt(agg.total_invalid, 10),
        totalDuplicates: parseInt(agg.total_duplicates, 10),
        totalSessions: parseInt(agg.total_sessions, 10),
        todayBlaChecked: parseInt(todayAgg.today_bla_checked, 10),
        todayTotalLeads: parseInt(todayAgg.today_total_leads, 10),
        todayClean: parseInt(todayAgg.today_clean, 10),
        todayLocalDnc: parseInt(todayAgg.today_local_dnc, 10),
        todayBlaDnc: parseInt(todayAgg.today_bla_dnc, 10),
        cleanRatePercent: parseFloat(cleanRate),
        apiCallsSaved: totalApiSaved,
        estimatedCostSavedUsd: parseFloat(estimatedCostSaved),
        activeSessions: parseInt(agg.active_sessions, 10),
        completedSessions: parseInt(agg.completed_sessions, 10),
        totalActiveUsers: parseInt(usersCountRes.rows[0].total_users, 10),
      },
      timeline: timelineRes.rows,
      recentSessions: recentSessionsRes.rows,
      dncSourceBreakdown: sourceBreakdownRes.rows,
    });
  } catch (error) {
    console.error('[ADMIN] Analytics error:', error);
    return res.status(500).json({ message: 'Failed to generate dashboard analytics.' });
  }
}

export async function listUsers(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();

    let whereSql = '';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      whereSql = 'WHERE u.name ILIKE $1 OR u.email ILIKE $1';
    }

    const countRes = await query(`SELECT COUNT(*) as total FROM users u ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const dataParams = [...params, limit, offset];
    const dataRes = await query(
      `SELECT u.id, u.email, u.name, u.role, u.status, u.lead_quota, u.created_at,
              COUNT(s.id) as sessions_count,
              COALESCE(SUM(s.total_rows), 0) as total_leads_scrubbed
       FROM users u
       LEFT JOIN checking_sessions s ON u.id = s.user_id
       ${whereSql}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    return res.json({
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[ADMIN] List users error:', error);
    return res.status(500).json({ message: 'Failed to fetch users list.' });
  }
}

export async function createUser(req, res) {
  try {
    const { email, password, name, role, lead_quota } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'user';
    const quota = parseInt(lead_quota || '250000', 10);

    const insertRes = await query(
      `INSERT INTO users (email, password_hash, name, role, status, lead_quota, created_at)
       VALUES ($1, $2, $3, $4, 'active', $5, NOW())
       RETURNING id, email, name, role, status, lead_quota, created_at`,
      [email.trim().toLowerCase(), passwordHash, name.trim(), userRole, quota]
    );

    const newUser = insertRes.rows[0];

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'ADMIN_CREATE_USER', 'USER', $3, $4)`,
      [req.user.id, req.user.email, String(newUser.id), JSON.stringify({ email: newUser.email, role: newUser.role })]
    );

    return res.status(201).json({ message: 'User created successfully.', user: newUser });
  } catch (error) {
    console.error('[ADMIN] Create user error:', error);
    return res.status(500).json({ message: 'Failed to create user.' });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, role, status, lead_quota, newPassword } = req.body;

    const userRes = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updates = [];
    const params = [id];

    if (name) {
      params.push(name.trim());
      updates.push(`name = $${params.length}`);
    }
    if (role && ['admin', 'user'].includes(role)) {
      params.push(role);
      updates.push(`role = $${params.length}`);
    }
    if (status && ['active', 'suspended'].includes(status)) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (lead_quota !== undefined) {
      params.push(parseInt(lead_quota, 10));
      updates.push(`lead_quota = $${params.length}`);
    }
    if (newPassword && newPassword.trim().length >= 6) {
      const hash = await bcrypt.hash(newPassword.trim(), 10);
      params.push(hash);
      updates.push(`password_hash = $${params.length}`);
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $1`, params);
    }

    const updatedUser = await query(
      'SELECT id, email, name, role, status, lead_quota, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'ADMIN_UPDATE_USER', 'USER', $3, $4)`,
      [req.user.id, req.user.email, id, JSON.stringify({ role, status, lead_quota })]
    );

    return res.json({ message: 'User updated successfully.', user: updatedUser.rows[0] });
  } catch (error) {
    console.error('[ADMIN] Update user error:', error);
    return res.status(500).json({ message: 'Failed to update user.' });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own administrator account.' });
    }

    const userRes = await query('SELECT email FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await query('DELETE FROM users WHERE id = $1', [id]);

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'ADMIN_DELETE_USER', 'USER', $3, $4)`,
      [req.user.id, req.user.email, id, JSON.stringify({ email: userRes.rows[0].email })]
    );

    return res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('[ADMIN] Delete user error:', error);
    return res.status(500).json({ message: 'Failed to delete user.' });
  }
}

export async function getApiConfig(req, res) {
  try {
    const config = await blaService.getConfig();
    return res.json({ config });
  } catch (error) {
    console.error('[ADMIN] Get API config error:', error);
    return res.status(500).json({ message: 'Failed to retrieve API configuration.' });
  }
}

export async function updateApiConfig(req, res) {
  try {
    const { base_url, api_key, batch_size, rate_limit_per_sec, is_mock_mode, mock_dnc_rate } = req.body;

    const result = await query(
      `INSERT INTO api_configurations
       (service_name, base_url, api_key, batch_size, rate_limit_per_sec, is_mock_mode, mock_dnc_rate, updated_by, updated_at)
       VALUES ('BLA_API', $1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (service_name) DO UPDATE SET
         base_url = EXCLUDED.base_url,
         api_key = EXCLUDED.api_key,
         batch_size = EXCLUDED.batch_size,
         rate_limit_per_sec = EXCLUDED.rate_limit_per_sec,
         is_mock_mode = EXCLUDED.is_mock_mode,
         mock_dnc_rate = EXCLUDED.mock_dnc_rate,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [
        base_url?.trim() || 'https://api.externalbla.com/v1/dnc-check',
        api_key?.trim() || '',
        parseInt(batch_size || '100', 10),
        parseInt(rate_limit_per_sec || '10', 10),
        Boolean(is_mock_mode),
        parseInt(mock_dnc_rate || '18', 10),
        req.user.id,
      ]
    );

    blaService.clearConfigCache();

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'API_CONFIG_UPDATED', 'CONFIG', 'BLA_API', $3)`,
      [
        req.user.id,
        req.user.email,
        JSON.stringify({ is_mock_mode, batch_size, rate_limit_per_sec, mock_dnc_rate }),
      ]
    );

    return res.json({ message: 'BLA API configuration updated successfully.', config: result.rows[0] });
  } catch (error) {
    console.error('[ADMIN] Update API config error:', error);
    return res.status(500).json({ message: 'Failed to update API configuration.' });
  }
}

export async function testApiConnection(req, res) {
  try {
    const customConfig = req.body?.config || null;
    const testResult = await blaService.testConnection(customConfig);
    return res.json(testResult);
  } catch (error) {
    console.error('[ADMIN] Test connection error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAuditLogs(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = (page - 1) * limit;
    const action = req.query.action?.trim();
    const search = req.query.search?.trim();

    const whereClauses = [];
    const params = [];

    if (action && action !== 'ALL') {
      params.push(action);
      whereClauses.push(`action = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(user_email ILIKE $${params.length} OR resource_id ILIKE $${params.length} OR details::text ILIKE $${params.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) as total FROM audit_logs ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const dataParams = [...params, limit, offset];
    const dataRes = await query(
      `SELECT * FROM audit_logs
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    return res.json({
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[ADMIN] Audit logs error:', error);
    return res.status(500).json({ message: 'Failed to fetch audit logs.' });
  }
}
