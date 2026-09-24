import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import csvParser from 'csv-parser';
import { query, pool } from '../config/db.js';
import { normalizePhone, detectPhoneColumn } from '../utils/phoneNormalizer.js';
import { copyIntoTable } from '../utils/bulkCopy.js';

export async function uploadMasterDnc(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Please upload a CSV, XLSX, or TXT file.' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();
  const sourceName = req.body.campaignName?.trim() || `Upload_${path.basename(originalName, ext)}`;
  const notes = req.body.notes?.trim() || 'Bulk uploaded via DNC Management';

  try {
    let rawNumbers = [];

    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      if (rows.length > 0) {
        const phoneCol = req.body.phoneColumn || detectPhoneColumn(rows[0]) || Object.keys(rows[0])[0];
        rawNumbers = rows.map((r) => r[phoneCol]);
      }
    } else if (ext === '.txt') {
      const content = fs.readFileSync(filePath, 'utf-8');
      rawNumbers = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    } else {
      // CSV
      const rows = await new Promise((resolve, reject) => {
        const items = [];
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (d) => items.push(d))
          .on('end', () => resolve(items))
          .on('error', reject);
      });
      if (rows.length > 0) {
        const phoneCol = req.body.phoneColumn || detectPhoneColumn(rows[0]) || Object.keys(rows[0])[0];
        rawNumbers = rows.map((r) => r[phoneCol]);
      }
    }

    const totalRaw = rawNumbers.length;
    if (totalRaw === 0) {
      return res.status(400).json({ message: 'Uploaded file contains no phone number rows.' });
    }

    // Normalize & Deduplicate within file
    const uniqueMap = new Map();
    let invalidCount = 0;

    for (const raw of rawNumbers) {
      const norm = normalizePhone(raw);
      if (!norm.isValid) {
        invalidCount++;
      } else {
        if (!uniqueMap.has(norm.normalized)) {
          uniqueMap.set(norm.normalized, norm.raw);
        }
      }
    }

    const uniqueCount = uniqueMap.size;
    console.log(`[DNC] Bulk COPY of ${uniqueCount} unique normalized DNC numbers...`);

    // Ingest via PostgreSQL COPY into a temp table, then a single de-duplicating INSERT.
    // This replaces hundreds of INSERT round trips and is the fastest path for millions of rows.
    let addedCount = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'CREATE TEMP TABLE tmp_dnc_import (phone_number varchar, normalized_phone varchar) ON COMMIT DROP'
      );

      await copyIntoTable(
        client,
        'COPY tmp_dnc_import (phone_number, normalized_phone) FROM STDIN WITH (FORMAT csv)',
        uniqueMap, // iterates as [normalized, raw]
        ([norm, raw]) => [raw, norm]
      );

      const insertRes = await client.query(
        `INSERT INTO master_dnc (phone_number, normalized_phone, source, campaign_or_file, notes, created_at)
         SELECT phone_number, normalized_phone, $1, $2, $3, NOW()
         FROM tmp_dnc_import
         ON CONFLICT (normalized_phone) DO NOTHING`,
        [sourceName, originalName, notes]
      );
      addedCount = insertRes.rowCount;

      await client.query('COMMIT');
    } catch (copyErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw copyErr;
    } finally {
      client.release();
    }

    const existingDuplicates = uniqueCount - addedCount;

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'MASTER_DNC_UPLOADED', 'MASTER_DNC', $3, $4)`,
      [
        req.user.id,
        req.user.email,
        sourceName,
        JSON.stringify({
          filename: originalName,
          totalRows: totalRaw,
          addedNew: addedCount,
          duplicatesAlreadyInDb: existingDuplicates,
          invalidCount,
        }),
      ]
    );

    return res.json({
      message: `Successfully processed DNC file. Added ${addedCount} new records.`,
      stats: {
        totalRows: totalRaw,
        addedNew: addedCount,
        duplicatesOrExisting: existingDuplicates,
        invalidCount,
      },
    });
  } catch (error) {
    console.error('[DNC] Upload error:', error);
    return res.status(500).json({ message: 'Failed to process DNC upload file: ' + error.message });
  } finally {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      // ignore
    }
  }
}

export async function listMasterDnc(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();
    const source = req.query.source?.trim();

    const whereClauses = [];
    const params = [];

    if (search) {
      params.push(`%${search.replace(/\D/g, '') || search}%`);
      whereClauses.push(`(normalized_phone LIKE $${params.length} OR phone_number LIKE $${params.length})`);
    }

    if (source && source !== 'ALL') {
      params.push(source);
      whereClauses.push(`source = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total Count
    const countRes = await query(`SELECT COUNT(*) as total FROM master_dnc ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].total, 10);

    // Records
    const dataParams = [...params, limit, offset];
    const dataRes = await query(
      `SELECT id, phone_number, normalized_phone, source, campaign_or_file, notes, created_at
       FROM master_dnc
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
    console.error('[DNC] List error:', error);
    return res.status(500).json({ message: 'Failed to fetch Master DNC records.' });
  }
}

export async function addSingleDnc(req, res) {
  try {
    const { phone, campaign, notes } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const norm = normalizePhone(phone);
    if (!norm.isValid) {
      return res.status(400).json({ message: `Invalid phone number: ${norm.reason}` });
    }

    const insertRes = await query(
      `INSERT INTO master_dnc (phone_number, normalized_phone, source, campaign_or_file, notes, created_at)
       VALUES ($1, $2, 'MANUAL_ENTRY', $3, $4, NOW())
       ON CONFLICT (normalized_phone) DO NOTHING
       RETURNING *`,
      [norm.formatted || phone, norm.normalized, campaign?.trim() || 'Manual Entry', notes?.trim() || 'Single manual entry']
    );

    if (insertRes.rows.length === 0) {
      return res.status(409).json({ message: 'Phone number is already in the Master DNC database.' });
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'SINGLE_DNC_ADDED', 'MASTER_DNC', $3, $4)`,
      [req.user.id, req.user.email, norm.normalized, JSON.stringify({ phone: norm.formatted })]
    );

    return res.status(201).json({
      message: 'Phone number added to Master DNC database.',
      record: insertRes.rows[0],
    });
  } catch (error) {
    console.error('[DNC] Add single error:', error);
    return res.status(500).json({ message: 'Failed to add phone number to DNC.' });
  }
}

export async function deleteDnc(req, res) {
  try {
    const { id } = req.params;
    const deleteRes = await query('DELETE FROM master_dnc WHERE id = $1 RETURNING *', [id]);

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ message: 'DNC record not found.' });
    }

    const deleted = deleteRes.rows[0];

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'DNC_DELETED', 'MASTER_DNC', $3, $4)`,
      [req.user.id, req.user.email, String(id), JSON.stringify({ phone: deleted.normalized_phone })]
    );

    return res.json({ message: 'DNC record deleted successfully.' });
  } catch (error) {
    console.error('[DNC] Delete error:', error);
    return res.status(500).json({ message: 'Failed to delete DNC record.' });
  }
}

export async function getDncStats(req, res) {
  try {
    const totalRes = await query('SELECT COUNT(*) as total FROM master_dnc');
    const sourceRes = await query(`
      SELECT source, COUNT(*) as count
      FROM master_dnc
      GROUP BY source
      ORDER BY count DESC
    `);
    const recent24hRes = await query(`
      SELECT COUNT(*) as recent_count
      FROM master_dnc
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);

    return res.json({
      total: parseInt(totalRes.rows[0].total, 10),
      bySource: sourceRes.rows,
      addedLast24h: parseInt(recent24hRes.rows[0].recent_count, 10),
    });
  } catch (error) {
    console.error('[DNC] Stats error:', error);
    return res.status(500).json({ message: 'Failed to fetch DNC stats.' });
  }
}

export async function exportMasterDnc(req, res) {
  try {
    const source = req.query.source?.trim();
    const whereClauses = [];
    const params = [];

    if (source && source !== 'ALL') {
      params.push(source);
      whereClauses.push(`source = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const records = await query(
      `SELECT phone_number, normalized_phone, source, campaign_or_file, notes, created_at
       FROM master_dnc
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT 100000`,
      params
    );

    let csv = 'Phone Number,Normalized Phone,Source,Campaign or File,Notes,Date Added\n';
    for (const r of records.rows) {
      const line = [
        `"${(r.phone_number || '').replace(/"/g, '""')}"`,
        `"${(r.normalized_phone || '').replace(/"/g, '""')}"`,
        `"${(r.source || '').replace(/"/g, '""')}"`,
        `"${(r.campaign_or_file || '').replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        `"${new Date(r.created_at).toISOString()}"`,
      ].join(',');
      csv += line + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="master_dnc_export.csv"');
    return res.send(csv);
  } catch (error) {
    console.error('[DNC] Export error:', error);
    return res.status(500).json({ message: 'Failed to export DNC database.' });
  }
}
