import axios from 'axios';
import { BlacklistAlliance } from 'blacklist-alliance-client';
import { validateBulkResponse } from '../utils/blaValidation.js';

const BLACKLIST_CODES = new Set([
  'anti-telemarketing',
  'plaintiff-primary',
  'plaintiff-secondary',
  'attorney-primary',
  'attorney-secondary',
  'prelitigation1',
  'prelitigation2',
  'gov',
  'blacklist',
  'blacklisted',
]);

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function nanp(value) {
  let digits = digitsOnly(value);
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.length === 10 ? digits : '';
}

function reasonText(reasonsMap, phone) {
  if (!reasonsMap || typeof reasonsMap !== 'object') return '';
  const raw = reasonsMap[phone] || reasonsMap[`1${phone}`];
  if (raw == null) return '';
  if (Array.isArray(raw)) return raw.map((part) => String(part)).join(',');
  if (typeof raw === 'object') return String(raw.code || raw.reason || raw.message || '');
  return String(raw);
}

function portalLabel(reasonRaw) {
  const codes = String(reasonRaw || '')
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(Boolean);
  const labels = [];
  if (codes.some((code) => BLACKLIST_CODES.has(code) || code.includes('prelitigation') || code.includes('plaintiff') || code.includes('attorney') || code.includes('blacklist'))) {
    labels.push('Blacklist');
  }
  if (codes.some((code) => code.includes('suppress'))) labels.push('Suppress');
  if (codes.some((code) => (code.endsWith('-dnc') && code !== 'federal-dnc') || code === 'statednc')) {
    labels.push('State DNC');
  }
  if (codes.includes('federal-dnc') || codes.includes('federaldnc')) labels.push('Federal DNC');
  return labels.length > 0 ? labels.join(', ') : 'Blacklist';
}

function stamp(extra) {
  return {
    provider: 'Blacklist Alliance',
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export class BlaService {
  constructor(clientFactory = (key, options) => new BlacklistAlliance(key, options)) {
    this.clientFactory = clientFactory;
    this.configCache = null;
    this.lastCacheTime = 0;
  }

  async getConfig() {
    const now = Date.now();
    if (this.configCache && now - this.lastCacheTime < 10000) {
      return this.configCache;
    }

    let apiUrl = process.env.BLA_API_URL || 'https://api.blacklistalliance.net/bulklookup';
    let apiKey = process.env.BLA_API_KEY || '';
    let batchSize = 5000;
    let rateLimit = 10;
    let isMockMode = false;
    let mockDncRate = 18;

    try {
      const { query: dbQuery } = await import('../config/db.js');
      const dbRes = await dbQuery('SELECT * FROM api_configurations WHERE service_name = $1 LIMIT 1', ['BLA_API']);
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        if (row.base_url && !row.base_url.includes('externalbla.com')) {
          apiUrl = row.base_url;
        }
        if (row.api_key && row.api_key !== 'bla_sec_test_enterprise_9981') {
          apiKey = row.api_key;
        }
        if (row.batch_size) batchSize = row.batch_size;
        if (row.rate_limit_per_sec) rateLimit = row.rate_limit_per_sec;
        if (typeof row.is_mock_mode === 'boolean') isMockMode = row.is_mock_mode;
        if (row.mock_dnc_rate) mockDncRate = row.mock_dnc_rate;
      }
    } catch (e) {
      // Fallback to env
    }

    const config = {
      service_name: 'BLA_API',
      base_url: apiUrl,
      api_key: apiKey,
      batch_size: Math.max(batchSize, 1000),
      rate_limit_per_sec: rateLimit,
      is_mock_mode: isMockMode && !apiKey,
      mock_dnc_rate: mockDncRate,
    };

    this.configCache = config;
    this.lastCacheTime = now;
    return config;
  }

  clearConfigCache() {
    this.configCache = null;
    this.lastCacheTime = 0;
  }

  /**
   * Verify phone numbers in bulk using the Blacklist Alliance client with validated, repeated batches
   * @param {string[]} phoneNumbers Array of normalized 10-digit phone numbers
   * @param {function} onProgress Optional progress callback (completed, total)
   * @returns {Promise<Map<string, { isDnc: boolean, status: string, reason: string, raw: object }>>}
   */
  async verifyBulk(phoneNumbers, onProgress = null) {
    const config = await this.getConfig();
    const results = new Map();

    if (!phoneNumbers || phoneNumbers.length === 0) return results;

    if (!config.api_key || config.api_key === 'bla_live_sec_key_demo_enterprise' || config.api_key === 'bla_sec_default') {
      throw new Error('Blacklist Alliance API Key is required for BLA verification.');
    }

    const normalized = phoneNumbers.map(nanp);
    if (normalized.some((phone) => !phone)) {
      throw new Error('BLA verification received an invalid phone number.');
    }
    const uniquePhones = Array.from(new Set(normalized));
    const client = this.clientFactory(config.api_key, {
      timeout: 60000,
      retries: 3,
      defaultVersion: 'v5',
      logger: null,
    });
    // Own the batching: the SDK merger can conceal unsuccessful/partial batches.
    const batchSize = Math.min(5000, Math.max(1, Number(config.batch_size) || 5000));
    const passes = 2;
    const requestInterval = Math.ceil(1000 / Math.max(1, Number(config.rate_limit_per_sec) || 1));
    let lastRequestAt = 0;
    let completed = 0;
    console.log(`[BLA SERVICE] Verifying ${uniquePhones.length} numbers with ${passes} bulk passes.`);

    for (let offset = 0; offset < uniquePhones.length; offset += batchSize) {
      const batch = uniquePhones.slice(offset, offset + batchSize);
      const responses = [];
      for (let pass = 0; pass < passes; pass++) {
        const wait = requestInterval - (Date.now() - lastRequestAt);
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        lastRequestAt = Date.now();
        let response;
        try {
          response = await client.bulkLookupSimple(batch, { responseFormat: 'json', autoBatch: false });
        } catch {
          // Do not expose SDK errors containing the API key in request URLs.
          throw new Error('BLA request failed. No clean list was approved; please retry checking.');
        }
        responses.push(validateBulkResponse(response, batch));
        completed += batch.length;
        if (onProgress) await onProgress(completed, uniquePhones.length * passes);
      }
      for (const phone of batch) {
        const observations = responses.map((r) => ({
          suppressed: r.suppressed.has(phone),
          code: reasonText(r.reasons, phone) || null,
          line: r.wireless.has(phone) ? 'Wireless' : 'Landline',
        }));
        const isDnc = observations.some((r) => r.suppressed);
        const conflict = observations.some((r) => r.suppressed !== observations[0].suppressed);
        // BLA API can legitimately return slightly different results on consecutive calls.
        // Instead of hard-failing the entire session, log the conflict and use conservative
        // logic: if ANY pass says DNC, treat as DNC (safer for compliance).
        if (conflict) {
          console.warn(`[BLA] Conflicting results for ${phone} across passes — using conservative DNC result (isDnc=${isDnc}). observations:`, JSON.stringify(observations));
        }
        const evidence = { verification: 'bulk-double-check-v1', observations, conflict };
        if (isDnc) {
          const code = [...new Set(observations.filter((r) => r.suppressed && r.code).map((r) => r.code))].join(',');
          const reason = portalLabel(code);
          results.set(phone, {
            isDnc: true, status: 'BLA_DNC', reason,
            raw: stamp({ suppressed: true, reason, code: code || null, ...evidence }),
          });
        } else {
          // A changing line type is not a verified wireless/landline classification.
          const line = observations.every((r) => r.line === observations[0].line) ? observations[0].line : 'Unknown';
          results.set(phone, {
            isDnc: false, status: 'CLEAN', reason: `Good - ${line}`,
            raw: stamp({ suppressed: false, status: 'CLEAN', line, ...evidence }),
          });
        }
      }
    }
    for (let i = 0; i < phoneNumbers.length; i++) {
      if (phoneNumbers[i] !== normalized[i]) results.set(phoneNumbers[i], results.get(normalized[i]));
    }

    return results;
  }

  /**
   * Compatibility wrapper for batch verification
   */
  async verifyBatch(phoneNumbers) {
    return this.verifyBulk(phoneNumbers);
  }

  /**
   * Single-number lookup using BLA v5 API (identical to checkdncnumber.com / CRM single lookup)
   */
  async lookupPhone(phone, maxAttempts = 3) {
    const config = await this.getConfig();
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get('https://api.blacklistalliance.net/lookup', {
          params: {
            key: config.api_key,
            ver: 'v5',
            resp: 'json',
            phone,
          },
          timeout: 15000,
          validateStatus: () => true,
        });
        const data = response.data;
        if (data && typeof data === 'object' && String(data.status || '').toLowerCase() === 'success') {
          return data;
        }
      } catch (err) {
        // Retry
      }
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    return null;
  }

  /**
   * Healthcheck & Ping tester for Blacklist Alliance
   */
  async testConnection(customConfig = null) {
    const config = customConfig || (await this.getConfig());
    const startTime = Date.now();

    try {
      const client = new BlacklistAlliance(config.api_key, {
        timeout: 10000,
        retries: 2,
        defaultVersion: 'v5',
      });

      const res = await client.bulkLookupSimple(['2223334444'], {
        responseFormat: 'json',
      });

      const latencyMs = Date.now() - startTime;
      const active = res && res.status === 'success';

      return {
        success: active,
        isMock: false,
        latencyMs,
        message: active ? 'BLA active' : (res?.message || 'BLA inactive'),
        statusCode: 200,
        blaStatus: res?.status || null,
      };
    } catch (err) {
      return {
        success: false,
        isMock: false,
        latencyMs: Date.now() - startTime,
        message: err.message || 'BLA is not responding.',
        statusCode: 500,
        blaStatus: null,
      };
    }
  }
}

export const blaService = new BlaService();
export default blaService;
