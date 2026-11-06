import { Router } from 'express';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import { pool, query } from '../config/db.js';
import { UPLOADS_DIR } from '../config/uploads.js';
import scrubbingEngine from '../services/scrubbingEngine.js';
import { getClientIp } from '../utils/clientIp.js';
import { getSession, getSessionRecords, exportSessionClean, exportSessionFull } from '../controllers/sessionController.js';

const digest = (value) => createHash('sha256').update(value).digest();

export function validateCheck(body) {
  if (!body || !Array.isArray(body.phones) || body.phones.length < 1 || body.phones.length > 10000) {
    throw new Error('phones must be an array of 1 to 10000 phone strings.');
  }
  if (body.phones.some((phone) => typeof phone !== 'string' || phone.length > 50 || /[\r\n\0]/.test(phone))) {
    throw new Error('Each phone must be a string of at most 50 characters without line breaks.');
  }
  for (const field of ['sessionName', 'externalUserId', 'reference']) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || body[field].length > 150 || /[\r\n\0]/.test(body[field]))) {
      throw new Error(`${field} must be a string of at most 150 characters without line breaks.`);
    }
  }
  return {
    phones: body.phones,
    sessionName: body.sessionName?.trim() || 'External check',
    externalUserId: body.externalUserId?.trim() || null,
    reference: body.reference?.trim() || null,
  };
}

// Dependencies are injectable so tests never call the paid BLA service or production DB.
export function createIntegrationRouter(deps = {}) {
  const db = deps.query || query;
  const connect = deps.connect || (() => pool.connect());
  const files = deps.files || fs;
  const processSession = deps.processSession || scrubbingEngine.processSession.bind(scrubbingEngine);
  const config = deps.config || (() => ({ key: process.env.INTEGRATION_API_KEY, owner: process.env.INTEGRATION_OWNER_EMAIL }));
  const router = Router();
  router.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
  router.use(async (req, res, next) => {
    const { key, owner } = config();
    if (!key || key.length < 32 || !owner) return res.status(503).json({ message: 'Integration is not configured.' });
    const supplied = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1] || '';
    if (!timingSafeEqual(digest(supplied), digest(key))) return res.status(401).json({ message: 'Invalid API key.' });
    try {
      const result = await db('SELECT id, email, name, role, status, lead_quota FROM users WHERE email = $1 LIMIT 1', [owner]);
      if (!result.rows[0] || result.rows[0].status !== 'active') return res.status(403).json({ message: 'Integration owner is unavailable.' });
      // Keys never inherit administrator privileges, even when owned by an admin.
      req.user = { ...result.rows[0], role: 'user' };
      next();
    } catch (error) { next(error); }
  });

  router.post('/checks', rateLimit({ windowMs: 60000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }), async (req, res, next) => {
    let input;
    try { input = validateCheck(req.body); }
    catch (error) { return res.status(400).json({ message: error.message }); }
    const id = randomUUID();
    const filename = `api-${id}.csv`;
    const filePath = path.join(UPLOADS_DIR, filename);
    const metadata = { source: 'INTEGRATION_API', externalUserId: input.externalUserId, reference: input.reference };
    let client;
    let committed = false;
    try {
      const csv = 'phone\n' + input.phones.map((phone) => `"${phone.replaceAll('"', '""')}"`).join('\n') + '\n';
      await files.writeFile(filePath, csv, { flag: 'wx', mode: 0o600 });
      client = await connect();
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO checking_sessions (id, user_id, session_name, original_filename, file_type, status, stage, progress_percent, integration_metadata)
         VALUES ($1, $2, $3, $4, '.csv', 'QUEUED', 'PARSING', 0, $5) RETURNING *`,
        [id, req.user.id, `[API] ${input.sessionName}`, filename, JSON.stringify(metadata)]
      );
      await client.query(
        `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, 'API_CHECK_REQUESTED', 'SESSION', $3, $4, $5)`,
        [req.user.id, req.user.email, id, JSON.stringify({ ...metadata, totalRows: input.phones.length }), getClientIp(req)]
      );
      await client.query('COMMIT');
      committed = true;
      setImmediate(() => {
        Promise.resolve().then(() => processSession(id, filePath, 'phone', req.user))
          .catch((error) => console.error('[INTEGRATION] Worker failed:', error));
      });
      res.location(`/api/v1/checks/${id}`);
      return res.status(202).json({ sessionId: id, session: result.rows[0], statusUrl: `/api/v1/checks/${id}`, recordsUrl: `/api/v1/checks/${id}/records` });
    } catch (error) {
      if (client && !committed) await client.query('ROLLBACK').catch(() => {});
      if (!committed) await files.unlink(filePath).catch(() => {});
      next(error);
    } finally { client?.release(); }
  });

  router.use('/checks/:id', async (req, res, next) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid session ID.' });
    }
    try {
      const result = await db(`SELECT id FROM checking_sessions WHERE id = $1 AND user_id = $2 AND integration_metadata->>'source' = 'INTEGRATION_API'`, [req.params.id, req.user.id]);
      if (!result.rows.length) return res.status(404).json({ message: 'API session not found.' });
      next();
    } catch (error) { next(error); }
  });
  router.get('/checks/:id', getSession);
  router.get('/checks/:id/records', getSessionRecords);
  router.get('/checks/:id/export/clean', exportSessionClean);
  router.get('/checks/:id/export/full', exportSessionFull);
  return router;
}

export default createIntegrationRouter();
