import { query } from '../config/db.js';
import { isLoopback, isValidIp, normalizeIp } from '../utils/clientIp.js';

let cache = { enabled: false, ips: new Set(), loadedAt: 0 };
const TTL_MS = 4000;

function envDisabled() {
  const raw = String(process.env.SECURITY_IP_ALLOWLIST || '').trim().toLowerCase();
  return raw === 'off' || raw === '0' || raw === 'false';
}

function envBypassIps() {
  const raw = process.env.SECURITY_BYPASS_IPS || '';
  return raw
    .split(',')
    .map((v) => normalizeIp(v))
    .filter(Boolean);
}

export function invalidateAllowlistCache() {
  cache.loadedAt = 0;
}

export async function loadAllowlist(force = false) {
  if (!force && Date.now() - cache.loadedAt < TTL_MS) return cache;
  try {
    const settings = await query('SELECT ip_allowlist_enabled FROM security_settings WHERE id = 1');
    const ips = await query(`SELECT ip_address FROM allowed_ips WHERE status = 'active'`);
    cache = {
      enabled: Boolean(settings.rows[0]?.ip_allowlist_enabled),
      ips: new Set(ips.rows.map((r) => normalizeIp(r.ip_address)).filter(isValidIp)),
      loadedAt: Date.now(),
    };
  } catch (err) {
    console.error('[SECURITY] Failed to load IP allowlist:', err.message);
    if (!cache.loadedAt) {
      cache = { enabled: false, ips: new Set(), loadedAt: Date.now() };
    }
  }
  return cache;
}

export function isIpAllowed(ip, state) {
  const n = normalizeIp(ip);
  if (!n) return false;
  if (isLoopback(n)) return true;
  if (envBypassIps().includes(n)) return true;
  return state.ips.has(n);
}

export async function shouldBlockIp(ip) {
  if (envDisabled()) return false;
  const state = await loadAllowlist();
  if (!state.enabled) return false;
  return !isIpAllowed(ip, state);
}
