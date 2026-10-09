import axios from 'axios';
import { BlacklistAlliance } from 'blacklist-alliance-client';

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

function phoneList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(nanp).filter(Boolean);
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

class BlaService {
  constructor() {
    this.configCache = null;
    this.lastCacheTime = 0;
  }

  async getConfig() {
    const now = Date.now();
    if (this.configCache && now - this.lastCacheTime < 10000) {
      return this.configCache;
    }

    let apiUrl = process.env.BLA_API_URL || 'https://api.blacklistalliance.net/bulklookup';
    let apiKey = process.env.BLA_API_KEY || 'KePFGNcVHPpzjxU88nWD';
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
   * Verify phone numbers in bulk using the official Blacklist Alliance client (identical to Balitech CRM)
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

    const uniquePhones = Array.from(new Set(phoneNumbers.map(nanp).filter(Boolean)));
    if (uniquePhones.length === 0) return results;

    const client = new BlacklistAlliance(config.api_key, {
      timeout: 60000,
      retries: 3,
      defaultVersion: 'v5',
      logger: null,
    });

    console.log(`[BLA SERVICE] Starting bulk lookup for ${uniquePhones.length} numbers using official BLA client (v5)...`);

    const bulkResult = await client.bulkLookupSimple(uniquePhones, {
      responseFormat: 'json',
      autoBatch: true,
      onProgress: (info) => {
        if (onProgress && info?.completed && info?.total) {
          onProgress(info.completed, info.total);
        }
      },
    });

    const rawSuppressed = bulkResult?.supression ?? bulkResult?.suppression ?? [];
    const suppressed = Array.isArray(rawSuppressed) ? rawSuppressed : [];
    const reasons = bulkResult?.reasons || {};
    const wirelessSet = new Set(phoneList(bulkResult?.wireless));

    const suppressedSet = new Set(suppressed.map(nanp).filter(Boolean));
    for (const reasonPhone of Object.keys(reasons)) {
      const normalized = nanp(reasonPhone);
      if (normalized) suppressedSet.add(normalized);
    }

    for (const phone of uniquePhones) {
      if (suppressedSet.has(phone)) {
        const rawReason = reasonText(reasons, phone);
        const reason = portalLabel(rawReason);
        results.set(phone, {
          isDnc: true,
          status: 'BLA_DNC',
          reason,
          raw: stamp({ suppressed: true, reason, code: rawReason || null }),
        });
      } else {
        const line = wirelessSet.has(phone) ? 'Wireless' : 'Landline';
        results.set(phone, {
          isDnc: false,
          status: 'CLEAN',
          reason: `Good - ${line}`,
          raw: stamp({ suppressed: false, status: 'CLEAN', line }),
        });
      }
    }

    // Ensure every input number is in the results map
    for (const phone of phoneNumbers) {
      const clean = nanp(phone);
      if (clean && results.has(clean)) {
        if (phone !== clean) results.set(phone, results.get(clean));
      } else if (!results.has(phone)) {
        results.set(phone, {
          isDnc: false,
          status: 'CLEAN',
          reason: 'Good - Landline',
          raw: stamp({ suppressed: false, status: 'CLEAN' }),
        });
      }
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
