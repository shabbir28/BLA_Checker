import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createIntegrationRouter, validateCheck } from '../src/routes/integrationRoutes.js';

test('JSON checks validate input and retain audit identifiers', () => {
  assert.equal(validateCheck({ phones: ['+1 (212) 555-1234'], externalUserId: 'agent-7' }).externalUserId, 'agent-7');
  for (const body of [null, {}, { phones: [] }, { phones: [123] }, { phones: ['a\nb'] }, { phones: Array(10001).fill('1') }, { phones: ['1'], reference: {} }]) {
    assert.throws(() => validateCheck(body));
  }
});

async function fixture(t, { failAudit = false, configured = true } = {}) {
  const statements = [], files = [], jobs = [];
  const owner = { id: 7, email: 'owner@example.com', status: 'active', role: 'admin' };
  const app = express();
  app.use(express.json());
  app.use('/api/v1', createIntegrationRouter({
    config: () => ({ key: configured ? 'k'.repeat(40) : '', owner: owner.email }),
    query: async (sql) => ({ rows: sql.includes('FROM users') ? [owner] : [] }),
    connect: async () => ({
      query: async (sql, params) => {
        statements.push({ sql, params });
        if (failAudit && sql.includes('INSERT INTO audit_logs')) throw new Error('audit unavailable');
        return { rows: sql.includes('INSERT INTO checking_sessions') ? [{ id: params[0], user_id: params[1], status: 'QUEUED' }] : [] };
      },
      release: () => {},
    }),
    files: { writeFile: async (...args) => files.push(args), unlink: async () => files.push('deleted') },
    processSession: async (...args) => jobs.push(args),
  }));
  app.use((error, req, res, next) => res.status(500).json({ message: 'Failed' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  return {
    statements, files, jobs,
    request: (route, body, key = 'k'.repeat(40)) => fetch(`http://127.0.0.1:${server.address().port}/api/v1${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  };
}

test('accepted API checks atomically save owner session and audit before processing', async (t) => {
  const f = await fixture(t);
  const res = await f.request('/checks', { phones: ['2125551234', 'invalid'], externalUserId: 'agent-7', reference: 'lead-9' });
  assert.equal(res.status, 202);
  const body = await res.json();
  await new Promise(setImmediate);
  assert.equal(body.session.user_id, 7);
  assert.equal(f.jobs.length, 1);
  assert.equal(f.jobs[0][0], body.sessionId);
  assert.equal(f.jobs[0][3].role, 'user');
  assert.equal(f.statements.at(-1).sql, 'COMMIT');
  const audit = f.statements.find((s) => s.sql.includes('INSERT INTO audit_logs'));
  assert.equal(JSON.parse(audit.params[3]).externalUserId, 'agent-7');
  assert.match(f.files[0][1], /"invalid"/);
});

test('audit failure rolls back session and removes file without launching checks', async (t) => {
  const f = await fixture(t, { failAudit: true });
  assert.equal((await f.request('/checks', { phones: ['2125551234'] })).status, 500);
  assert.equal(f.statements.at(-1).sql, 'ROLLBACK');
  assert.equal(f.files.at(-1), 'deleted');
  assert.equal(f.jobs.length, 0);
});

test('invalid keys, invalid input and sessions outside API ownership are rejected', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request('/checks', { phones: ['1'] }, 'wrong')).status, 401);
  assert.equal((await f.request('/checks', { phones: [] })).status, 400);
  assert.equal((await f.request('/checks/not-a-uuid')).status, 400);
  assert.equal((await f.request('/checks/00000000-0000-4000-8000-000000000000')).status, 404);
  assert.equal(f.jobs.length, 0);
});

test('integration stays disabled without server configuration', async (t) => {
  const f = await fixture(t, { configured: false });
  assert.equal((await f.request('/checks', { phones: ['1'] })).status, 503);
});
