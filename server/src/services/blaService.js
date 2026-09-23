import axios from 'axios';
import { query } from '../config/db.js';

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

    try {
      const res = await query('SELECT * FROM api_configurations WHERE service_name = $1 LIMIT 1', ['BLA_API']);
      if (res.rows.length > 0) {
        this.configCache = res.rows[0];
        this.lastCacheTime = now;
        return this.configCache;
      }
    } catch (err) {
      console.warn('[BLA API] Could not fetch DB config, using environment defaults:', err.message);
    }

    return {
      service_name: 'BLA_API',
      base_url: process.env.BLA_API_URL || 'https://api.externalbla.com/v1/dnc-check',
      api_key: process.env.BLA_API_KEY || 'bla_sec_default',
      batch_size: 100,
      rate_limit_per_sec: 10,
      is_mock_mode: true,
      mock_dnc_rate: 18,
    };
  }

  clearConfigCache() {
    this.configCache = null;
    this.lastCacheTime = 0;
  }

  /**
   * Deterministic hash for simulation so a given number consistently behaves as DNC or Clean
   */
  hashPhone(phoneStr) {
    let hash = 0;
    for (let i = 0; i < phoneStr.length; i++) {
      hash = (hash << 5) - hash + phoneStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Verify a batch of phone numbers
   * @param {string[]} phoneNumbers Array of normalized 10-digit phone numbers
   * @returns {Promise<Map<string, { isDnc: boolean, reason: string, raw: object }>>}
   */
  async verifyBatch(phoneNumbers) {
    const config = await this.getConfig();
    const results = new Map();

    if (phoneNumbers.length === 0) return results;

    if (config.is_mock_mode) {
      // Simulate slight network latency (60ms - 180ms)
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 120) + 60));

      const dncRate = config.mock_dnc_rate || 18;

      for (const phone of phoneNumbers) {
        const hash = this.hashPhone(phone);
        const score = hash % 100;
        const isDnc = score < dncRate;

        if (isDnc) {
          const reasons = [
            'BLA National Registry Matched',
            'BLA State Level Registry (Active)',
            'BLA Direct Consumer Opt-Out',
            'BLA Litigator / High TCPA Risk',
          ];
          const reason = reasons[hash % reasons.length];
          results.set(phone, {
            isDnc: true,
            status: 'BLA_DNC',
            reason,
            raw: {
              provider: 'BLA_MOCK_VERIFIER',
              timestamp: new Date().toISOString(),
              tcpaRiskScore: 85 + (hash % 15),
              dncTypes: ['FEDERAL', 'STATE'],
              category: 'LITIGATOR_OR_DNC',
            },
          });
        } else {
          results.set(phone, {
            isDnc: false,
            status: 'CLEAN',
            reason: 'Clean - No DNC Record Found',
            raw: {
              provider: 'BLA_MOCK_VERIFIER',
              timestamp: new Date().toISOString(),
              tcpaRiskScore: 5 + (hash % 10),
              dncTypes: [],
              category: 'CLEAN_VERIFIED',
            },
          });
        }
      }

      return results;
    }

    // LIVE BLA API CALL
    try {
      const response = await axios.post(
        config.base_url,
        {
          numbers: phoneNumbers,
          checkTypes: ['NATIONAL_DNC', 'STATE_DNC', 'LITIGATOR'],
        },
        {
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json',
            'User-Agent': 'BLA-Checker-Enterprise/1.0',
          },
          timeout: 15000,
        }
      );

      // Handle standard API responses
      const data = response.data;
      const returnedList = Array.isArray(data) ? data : data.results || data.numbers || [];

      for (const item of returnedList) {
        const phone = item.phone || item.number || item.normalized_phone;
        if (!phone) continue;

        const isDnc = Boolean(item.isDnc || item.dnc || item.status === 'DNC');
        results.set(phone, {
          isDnc,
          status: isDnc ? 'BLA_DNC' : 'CLEAN',
          reason: item.reason || (isDnc ? 'BLA National DNC Match' : 'Clean verified'),
          raw: item,
        });
      }

      // Fill in any numbers not explicitly returned as Clean
      for (const phone of phoneNumbers) {
        if (!results.has(phone)) {
          results.set(phone, {
            isDnc: false,
            status: 'CLEAN',
            reason: 'No record found (Clean)',
            raw: { provider: 'BLA_LIVE', status: 'NOT_FOUND' },
          });
        }
      }

      return results;
    } catch (apiError) {
      console.error('[BLA LIVE API] API call failed:', apiError.response?.data || apiError.message);
      throw new Error(`BLA API Error: ${apiError.response?.data?.message || apiError.message}`);
    }
  }

  /**
   * Healthcheck & Ping tester for Admin API Settings
   */
  async testConnection(customConfig = null) {
    const config = customConfig || (await this.getConfig());
    const startTime = Date.now();

    if (config.is_mock_mode) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return {
        success: true,
        isMock: true,
        latencyMs: Date.now() - startTime,
        message: 'Mock BLA Engine connected successfully. High-speed verification simulator is ready.',
        sampleCheck: {
          testNumber: '2125550199',
          status: 'VERIFIED_ACTIVE',
        },
      };
    }

    try {
      const response = await axios.get(config.base_url.replace(/\/dnc-check|\/scrub|\/check/gi, '/health'), {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
        },
        timeout: 5000,
      });

      return {
        success: true,
        isMock: false,
        latencyMs: Date.now() - startTime,
        message: 'Live BLA API endpoint responded successfully!',
        statusCode: response.status,
      };
    } catch (err) {
      // Even if /health doesn't exist, try a dummy test check
      try {
        const dummyRes = await axios.post(
          config.base_url,
          { numbers: ['5550129999'] },
          {
            headers: {
              'Authorization': `Bearer ${config.api_key}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        );
        return {
          success: true,
          isMock: false,
          latencyMs: Date.now() - startTime,
          message: 'Live BLA API verified test payload successfully!',
          statusCode: dummyRes.status,
        };
      } catch (postErr) {
        return {
          success: false,
          isMock: false,
          latencyMs: Date.now() - startTime,
          message: postErr.response?.data?.message || postErr.message,
          statusCode: postErr.response?.status || 500,
        };
      }
    }
  }
}

export const blaService = new BlaService();
export default blaService;
