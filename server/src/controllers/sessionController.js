import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import xlsx from 'xlsx';
import { query } from '../config/db.js';
import scrubbingEngine from '../services/scrubbingEngine.js';

export async function previewLeadFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Please upload a CSV, XLSX, or TXT file.' });
  }

  const filePath = req.file.path;
  const originalFilename = req.file.originalname;

  try {
    const previewData = await scrubbingEngine.previewFile(filePath, originalFilename);

    return res.json({
      tempFileId: path.basename(filePath),
      originalFilename,
      previewRows: previewData.previewRows,
      columns: previewData.columns,
      detectedPhoneColumn: previewData.detectedPhoneColumn,
    });
  } catch (error) {
    console.error('[SESSION] Preview error:', error);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {}
    return res.status(500).json({ message: 'Failed to inspect lead file: ' + error.message });
  }
}

export async function startLeadSession(req, res) {
  const { tempFileId, sessionName, phoneColumn, originalFilename } = req.body;

  if (!tempFileId) {
    return res.status(400).json({ message: 'Uploaded file reference (tempFileId) is required.' });
  }

  const filePath = path.join('uploads', tempFileId);
  if (!fs.existsSync(filePath)) {
    return res.status(400).json({ message: 'Uploaded file has expired or was not found on server.' });
  }

  const sessionId = uuidv4();
  const name = sessionName?.trim() || `Scrub_${path.basename(originalFilename || tempFileId, path.extname(tempFileId))}`;

  try {
    const insertRes = await query(
      `INSERT INTO checking_sessions
       (id, user_id, session_name, original_filename, file_type, status, stage, progress_percent, created_at)
       VALUES ($1, $2, $3, $4, $5, 'QUEUED', 'PARSING', 5, NOW())
       RETURNING *`,
      [
        sessionId,
        req.user.id,
        name,
        originalFilename || tempFileId,
        path.extname(originalFilename || tempFileId).toLowerCase(),
      ]
    );

    const session = insertRes.rows[0];

    // Launch background asynchronous scrubbing process
    setImmediate(() => {
      scrubbingEngine.processSession(sessionId, filePath, phoneColumn, req.user);
    });

    return res.status(201).json({
      message: 'Checking session created and processing queued.',
      session,
    });
  } catch (error) {
    console.error('[SESSION] Start error:', error);
    return res.status(500).json({ message: 'Failed to start lead checking session: ' + error.message });
  }
}

export async function listSessions(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    const isAdmin = req.user.role === 'admin';
    const scopeAll = isAdmin && req.query.scope === 'all';

    let countSql = 'SELECT COUNT(*) as total FROM checking_sessions';
    let dataSql = `
      SELECT s.*, u.name as user_name, u.email as user_email
      FROM checking_sessions s
      LEFT JOIN users u ON s.user_id = u.id
    `;
    const params = [];

    if (!scopeAll) {
      params.push(req.user.id);
      countSql += ' WHERE user_id = $1';
      dataSql += ' WHERE s.user_id = $1';
    }

    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const dataParams = [...params, limit, offset];
    dataSql += ` ORDER BY s.created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
    const dataRes = await query(dataSql, dataParams);

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
    console.error('[SESSION] List error:', error);
    return res.status(500).json({ message: 'Failed to fetch sessions.' });
  }
}

export async function getSession(req, res) {
  try {
    const { id } = req.params;
    const sessionRes = await query(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM checking_sessions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ message: 'Checking session not found.' });
    }

    const session = sessionRes.rows[0];

    // Authorization check
    if (req.user.role !== 'admin' && session.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to view this session.' });
    }

    return res.json({ session });
  } catch (error) {
    console.error('[SESSION] Get error:', error);
    return res.status(500).json({ message: 'Failed to retrieve session details.' });
  }
}

export async function getSessionRecords(req, res) {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = (page - 1) * limit;
    const status = req.query.status?.trim();
    const search = req.query.search?.trim();

    // Verify ownership or admin
    const sessionRes = await query('SELECT user_id FROM checking_sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    if (req.user.role !== 'admin' && sessionRes.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const whereClauses = ['session_id = $1'];
    const params = [id];

    if (status && status !== 'ALL') {
      params.push(status);
      whereClauses.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.replace(/\D/g, '') || search}%`);
      whereClauses.push(`(normalized_phone LIKE $${params.length} OR raw_phone LIKE $${params.length})`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countRes = await query(`SELECT COUNT(*) as total FROM session_records ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const dataParams = [...params, limit, offset];
    const dataRes = await query(
      `SELECT id, session_id, raw_phone, normalized_phone, original_row_data, status, reason, bla_response_raw, created_at
       FROM session_records
       ${whereSql}
       ORDER BY id ASC
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
    console.error('[SESSION] Records error:', error);
    return res.status(500).json({ message: 'Failed to retrieve session records.' });
  }
}

export async function exportSessionClean(req, res) {
  try {
    const { id } = req.params;
    const format = (req.query.format || 'csv').toLowerCase();

    const sessionRes = await query('SELECT * FROM checking_sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ message: 'Session not found.' });
    const session = sessionRes.rows[0];

    if (req.user.role !== 'admin' && session.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const recordsRes = await query(
      `SELECT raw_phone, normalized_phone, original_row_data
       FROM session_records
       WHERE session_id = $1 AND status = 'CLEAN'
       ORDER BY id ASC`,
      [id]
    );

    const rows = recordsRes.rows;
    const exportData = rows.map((r) => {
      const orig = typeof r.original_row_data === 'string' ? JSON.parse(r.original_row_data) : r.original_row_data || {};
      return {
        ...orig,
        'Clean_Phone': r.normalized_phone,
        'Scrub_Status': 'CLEAN',
      };
    });

    const safeSessionName = session.session_name.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'xlsx') {
      const worksheet = xlsx.utils.json_to_sheet(exportData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Clean Leads');
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${safeSessionName}_CLEAN.xlsx"`);
      return res.send(buffer);
    }

    // Default CSV
    let csv = '';
    if (exportData.length > 0) {
      const headers = Object.keys(exportData[0]);
      csv += headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
      for (const row of exportData) {
        csv += headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
      }
    } else {
      csv = 'No clean records found for this session.\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeSessionName}_CLEAN.csv"`);
    return res.send(csv);
  } catch (error) {
    console.error('[SESSION] Clean export error:', error);
    return res.status(500).json({ message: 'Failed to export clean leads.' });
  }
}

export async function exportSessionFull(req, res) {
  try {
    const { id } = req.params;
    const format = (req.query.format || 'csv').toLowerCase();

    const sessionRes = await query('SELECT * FROM checking_sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ message: 'Session not found.' });
    const session = sessionRes.rows[0];

    if (req.user.role !== 'admin' && session.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const recordsRes = await query(
      `SELECT raw_phone, normalized_phone, status, reason, original_row_data, created_at
       FROM session_records
       WHERE session_id = $1
       ORDER BY id ASC`,
      [id]
    );

    const rows = recordsRes.rows;
    const exportData = rows.map((r) => {
      const orig = typeof r.original_row_data === 'string' ? JSON.parse(r.original_row_data) : r.original_row_data || {};
      return {
        'Raw_Phone': r.raw_phone,
        'Normalized_Phone': r.normalized_phone,
        'Scrub_Status': r.status,
        'Reason': r.reason,
        ...orig,
        'Checked_At': new Date(r.created_at).toISOString(),
      };
    });

    const safeSessionName = session.session_name.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'xlsx') {
      const worksheet = xlsx.utils.json_to_sheet(exportData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Full Audit Report');
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${safeSessionName}_AUDIT_REPORT.xlsx"`);
      return res.send(buffer);
    }

    // CSV
    let csv = '';
    if (exportData.length > 0) {
      const headers = Object.keys(exportData[0]);
      csv += headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
      for (const row of exportData) {
        csv += headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
      }
    } else {
      csv = 'No records found for this session.\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeSessionName}_AUDIT_REPORT.csv"`);
    return res.send(csv);
  } catch (error) {
    console.error('[SESSION] Full export error:', error);
    return res.status(500).json({ message: 'Failed to export full audit report.' });
  }
}

export async function deleteSession(req, res) {
  try {
    const { id } = req.params;
    const sessionRes = await query('SELECT user_id, session_name FROM checking_sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ message: 'Session not found.' });

    if (req.user.role !== 'admin' && sessionRes.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    await query('DELETE FROM checking_sessions WHERE id = $1', [id]);

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'SESSION_DELETED', 'SESSION', $3, $4)`,
      [req.user.id, req.user.email, id, JSON.stringify({ name: sessionRes.rows[0].session_name })]
    );

    return res.json({ message: 'Checking session deleted successfully.' });
  } catch (error) {
    console.error('[SESSION] Delete error:', error);
    return res.status(500).json({ message: 'Failed to delete session.' });
  }
}
