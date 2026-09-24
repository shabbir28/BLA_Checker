import axios from 'axios';

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

    const apiUrl = process.env.BLA_API_URL || 'https://api.blacklistalliance.net/bulklookup';
    const apiKey = process.env.BLA_API_KEY || '';

    // Determine mock mode: only use mock if key is empty or is demo placeholder
    const isDemoKey = !apiKey || apiKey === 'bla_live_sec_key_demo_enterprise' || apiKey === 'bla_sec_default';

    const config = {
      service_name: 'BLA_API',
      base_url: apiUrl,
      api_key: apiKey,
      batch_size: 500, // Blacklist Alliance easily handles 500 numbers per call (< 1MB)
      rate_limit_per_sec: 10,
      is_mock_mode: isDemoKey,
      mock_dnc_rate: 18,
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
   * Verify a batch of phone numbers against Blacklist Alliance (BLA) API
   * @param {string[]} phoneNumbers Array of normalized 10-digit phone numbers
   * @returns {Promise<Map<string, { isDnc: boolean, reason: string, raw: object }>>}
   */
  async verifyBatch(phoneNumbers) {
    const config = await this.getConfig();
    const results = new Map();

    if (!phoneNumbers || phoneNumbers.length === 0) return results;

    // Simulation / Mock mode if no live key provided
    if (config.is_mock_mode) {
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 80) + 40));
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

    // LIVE BLACKLIST ALLIANCE API CALL
    const targetUrl = this.buildRequestUrl(config);
    const data = await this.postWithRetry(targetUrl, { phones: phoneNumbers }, 10000);

    // Format 1: Official Blacklist Alliance v2 response:
    // { status: 'success', numbers: 3, phones: ['...'], supression: ['9999999999'], reasons: { '9999999999': '...' } }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // BLA reports auth/quota problems with HTTP 200 and status != 'success'. Treating that as
      // "no matches" would silently mark every number CLEAN, so surface it as a hard failure.
      if (data.status && String(data.status).toLowerCase() !== 'success') {
        throw new Error(`Blacklist Alliance rejected the request: ${data.message || data.status}`);
      }

      const suppressionSet = new Set(
        Array.isArray(data.supression)
          ? data.supression.map((p) => String(p).replace(/\D/g, ''))
          : []
      );
      const reasonsMap = data.reasons || {};

      for (const phone of phoneNumbers) {
        const cleanDigits = String(phone).replace(/\D/g, '');
        if (suppressionSet.has(cleanDigits)) {
          const reason = reasonsMap[cleanDigits] || reasonsMap[phone] || 'Blacklist Alliance Suppression List';
          results.set(cleanDigits, {
            isDnc: true,
            status: 'BLA_DNC',
            reason,
            raw: {
              provider: 'Blacklist Alliance',
              suppressed: true,
              reason,
            },
          });
        } else {
          results.set(cleanDigits, {
            isDnc: false,
            status: 'CLEAN',
            reason: 'Clean - No DNC record found (Blacklist Alliance)',
            raw: {
              provider: 'Blacklist Alliance',
              suppressed: false,
              status: 'CLEAN',
            },
          });
        }
      }
      return results;
    }

    // Format 2: Array of objects (e.g. resp=phonecode or standard object list)
    if (Array.isArray(data)) {
      for (const item of data) {
        const phone = item.Phone || item.phone || item.number;
        if (!phone) continue;
        const cleanDigits = String(phone).replace(/\D/g, '');
        const isDnc = item.ResultCode === 'D' || item.isDnc === true || item.status === 'DNC';
        const reason = isDnc
          ? item.reason || item.description || 'Blacklist Alliance DNC Record'
          : 'Clean - Verified by Blacklist Alliance';

        results.set(cleanDigits, {
          isDnc,
          status: isDnc ? 'BLA_DNC' : 'CLEAN',
          reason,
          raw: item,
        });
      }

      // Fill in any remaining numbers as clean
      for (const phone of phoneNumbers) {
        const cleanDigits = String(phone).replace(/\D/g, '');
        if (!results.has(cleanDigits)) {
          results.set(cleanDigits, {
            isDnc: false,
            status: 'CLEAN',
            reason: 'Clean - No DNC record found (Blacklist Alliance)',
            raw: { provider: 'Blacklist Alliance', status: 'CLEAN' },
          });
        }
      }

      return results;
    }

    throw new Error('Blacklist Alliance returned an unrecognized response format.');
  }

  buildRequestUrl(config) {
    let targetUrl = config.base_url;
    if (!targetUrl.includes('?key=') && !targetUrl.includes('&key=')) {
      const separator = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${separator}key=${encodeURIComponent(config.api_key)}&ver=v2&resp=json`;
    }
    return targetUrl;
  }

  /**
   * POST to BLA with retries on transient failures (network errors, timeouts, 429, 5xx).
   * If every attempt fails the error is thrown so the calling session is marked FAILED
   * instead of guessing results for a compliance check.
   */
  async postWithRetry(url, body, timeout, maxAttempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.post(url, body, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BLA-Checker-Enterprise/1.0',
          },
          timeout,
        });
        return response.data;
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        const retryable = !status || status === 429 || status >= 500;
        if (!retryable || attempt === maxAttempts) break;
        const backoffMs = 500 * 2 ** (attempt - 1);
        console.warn(`[BLA LIVE API] Attempt ${attempt} failed (${err.message}); retrying in ${backoffMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    const detail = lastError?.response?.data?.message || lastError?.message || 'unknown error';
    throw new Error(`Blacklist Alliance API unavailable: ${detail}`);
  }

  /**
   * Healthcheck & Ping tester for Blacklist Alliance
   */
  async testConnection(customConfig = null) {
    const config = customConfig || (await this.getConfig());
    const startTime = Date.now();

    if (config.is_mock_mode) {
      await new Promise((resolve) => setTimeout(resolve, 60));
      return {
        success: true,
        isMock: true,
        latencyMs: Date.now() - startTime,
        message: 'Mock BLA Engine connected. Ready for offline testing.',
        sampleCheck: {
          testNumber: '2125550199',
          status: 'VERIFIED_ACTIVE',
        },
      };
    }

    try {
      const targetUrl = this.buildRequestUrl(config);

      // Test with sample numbers: 2223334444 (good) and 9999999999 (known blacklisted)
      const testRes = await axios.post(
        targetUrl,
        { phones: ['2223334444', '9999999999'] },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 8000,
        }
      );

      const latencyMs = Date.now() - startTime;
      const bodyStatus = testRes.data?.status ? String(testRes.data.status).toLowerCase() : null;
      if (bodyStatus && bodyStatus !== 'success') {
        return {
          success: false,
          isMock: false,
          latencyMs,
          message: `Blacklist Alliance rejected the request: ${testRes.data.message || testRes.data.status}`,
          statusCode: testRes.status,
          sampleResult: testRes.data,
        };
      }

      if (testRes.status === 200) {
        return {
          success: true,
          isMock: false,
          latencyMs,
          message: `Live Blacklist Alliance API connected successfully! (${latencyMs}ms latency)`,
          statusCode: testRes.status,
          sampleResult: testRes.data,
        };
      }

      return {
        success: false,
        isMock: false,
        latencyMs,
        message: `API returned unexpected status ${testRes.status}`,
        statusCode: testRes.status,
      };
    } catch (err) {
      return {
        success: false,
        isMock: false,
        latencyMs: Date.now() - startTime,
        message: err.response?.data?.message || err.message,
        statusCode: err.response?.status || 500,
      };
    }
  }
}

export const blaService = new BlaService();
export default blaService;
