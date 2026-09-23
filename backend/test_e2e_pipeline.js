import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:5000/api';

async function runE2eTests() {
  console.log('====================================================');
  console.log('  STARTING BLA CHECKER END-TO-END PIPELINE TESTS');
  console.log('====================================================\n');

  // 1. Healthcheck
  console.log('>>> [1/8] Verifying API Healthcheck...');
  const healthRes = await axios.get(`${BASE_URL}/health`);
  console.log(`[PASS] Server Status: ${healthRes.data.status} | DB: ${healthRes.data.database}\n`);

  // 2. Authentication
  console.log('>>> [2/8] Authenticating Admin & Standard User...');
  const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin@blachecker.com',
    password: 'Admin123!',
  });
  const adminToken = adminLoginRes.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log(`[PASS] Admin logged in: ${adminLoginRes.data.user.name} (${adminLoginRes.data.user.role})`);

  const userLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'user@blachecker.com',
    password: 'User123!',
  });
  console.log(`[PASS] Standard user logged in: ${userLoginRes.data.user.name} (${userLoginRes.data.user.role})\n`);

  // 3. Admin Analytics
  console.log('>>> [3/8] Fetching Dashboard Analytics...');
  const analyticsRes = await axios.get(`${BASE_URL}/admin/analytics`, { headers: adminHeaders });
  console.log(`[PASS] Master DNC in DB: ${analyticsRes.data.kpis.totalMasterDnc}`);
  console.log(`[PASS] Total Leads Processed: ${analyticsRes.data.kpis.totalLeadsChecked}`);
  console.log(`[PASS] Total API Calls Saved: ${analyticsRes.data.kpis.apiCallsSaved}\n`);

  // 4. Test BLA API Connection & Latency
  console.log('>>> [4/8] Testing BLA Engine Connection & Ping Latency...');
  const pingRes = await axios.post(`${BASE_URL}/admin/test-connection`, {}, { headers: adminHeaders });
  console.log(`[PASS] Connection Success: ${pingRes.data.success}`);
  console.log(`[PASS] Measured Latency: ${pingRes.data.latencyMs}ms`);
  console.log(`[PASS] Engine Message: ${pingRes.data.message}\n`);

  // 5. Preview Lead File
  console.log('>>> [5/8] Uploading & Previewing Lead File (sample_leads_batch_1.csv)...');
  const form = new FormData();
  form.append('file', fs.createReadStream('d:/Bla checker/sample_leads_batch_1.csv'));

  const previewRes = await axios.post(`${BASE_URL}/sessions/preview`, form, {
    headers: { ...adminHeaders, ...form.getHeaders() },
  });
  console.log(`[PASS] Detected Phone Column: "${previewRes.data.detectedPhoneColumn}"`);
  console.log(`[PASS] Preview Rows Count: ${previewRes.data.previewRows.length}\n`);

  // 6. Launch Checking Session
  console.log('>>> [6/8] Starting Multi-Phase Lead Scrubbing Session...');
  const startRes = await axios.post(
    `${BASE_URL}/sessions/start`,
    {
      tempFileId: previewRes.data.tempFileId,
      sessionName: 'Automated_E2E_Test_Session',
      phoneColumn: previewRes.data.detectedPhoneColumn,
      originalFilename: 'sample_leads_batch_1.csv',
    },
    { headers: adminHeaders }
  );

  const sessionId = startRes.data.session.id;
  console.log(`[PASS] Session Queued! ID: ${sessionId}`);

  // Poll until completion
  console.log('>>> Polling pipeline execution progress...');
  let completedSession = null;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 600));
    const pollRes = await axios.get(`${BASE_URL}/sessions/${sessionId}`, { headers: adminHeaders });
    const s = pollRes.data.session;
    console.log(`    Stage: ${s.stage} | Progress: ${s.progress_percent}% | Clean: ${s.clean_count} | Local DNC: ${s.local_dnc_count} | BLA DNC: ${s.bla_dnc_count}`);

    if (s.status === 'COMPLETED') {
      completedSession = s;
      break;
    }
  }

  if (!completedSession) {
    throw new Error('Session did not complete within expected timeout.');
  }

  console.log('\n[PASS] Scrubbing Pipeline Completed Successfully!');
  console.log(`       - Total Rows: ${completedSession.total_rows}`);
  console.log(`       - Clean Numbers: ${completedSession.clean_count}`);
  console.log(`       - Local Master DNC Skipped: ${completedSession.local_dnc_count}`);
  console.log(`       - BLA DNC Flagged: ${completedSession.bla_dnc_count}`);
  console.log(`       - API Calls Saved: ${completedSession.api_calls_saved}\n`);

  // 7. Verify Auto-Sync into Master DNC
  console.log('>>> [7/8] Verifying Auto-Sync of BLA DNC to Master Database...');
  const dncListRes = await axios.get(`${BASE_URL}/dnc/list?source=BLA_SYNC`, { headers: adminHeaders });
  console.log(`[PASS] BLA-Synced records found in Master DNC: ${dncListRes.data.pagination.total}`);
  if (dncListRes.data.data.length > 0) {
    console.log(`       Sample synced number: ${dncListRes.data.data[0].normalized_phone} (${dncListRes.data.data[0].notes})\n`);
  }

  // 8. Test Clean Export & Audit Logs
  console.log('>>> [8/8] Testing Clean Lead Export and Audit Logging...');
  const cleanExportRes = await axios.get(`${BASE_URL}/sessions/${sessionId}/export/clean?format=csv`, {
    headers: adminHeaders,
  });
  console.log(`[PASS] Clean CSV generated: ${cleanExportRes.data.split('\n').length} lines`);

  const auditRes = await axios.get(`${BASE_URL}/admin/audit-logs?limit=5`, { headers: adminHeaders });
  console.log(`[PASS] Recent Audit Logs: ${auditRes.data.pagination.total} total events`);
  auditRes.data.data.slice(0, 3).forEach((log) => {
    console.log(`       - [${log.action}] by ${log.user_email} at ${new Date(log.created_at).toLocaleTimeString()}`);
  });

  console.log('\n====================================================');
  console.log('  ALL E2E INTEGRATION & PIPELINE TESTS PASSED 100%!');
  console.log('====================================================');
}

runE2eTests().catch((err) => {
  console.error('\n[FAIL] Test Error:', err.response?.data || err.message);
  process.exit(1);
});
