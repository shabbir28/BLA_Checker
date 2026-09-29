const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV6 =
  /^(?:[0-9a-f]{1,4}:){1,7}[0-9a-f]{1,4}$|^::(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4}$|^(?:[0-9a-f]{1,4}:){1,7}:$/i;

export function normalizeIp(ip) {
  if (!ip) return '';
  let value = String(ip).trim().toLowerCase();
  if (value.startsWith('::ffff:')) value = value.slice(7);
  if (value === '::1') return '127.0.0.1';
  return value;
}

export function isLoopback(ip) {
  const n = normalizeIp(ip);
  return n === '127.0.0.1' || n === 'localhost' || n === '::1';
}

export function isValidIp(ip) {
  const n = normalizeIp(ip);
  return IPV4.test(n) || IPV6.test(n);
}

/**
 * Prefer the real client IP from nginx when the TCP peer is localhost.
 * Direct hits on the Node port use the socket address (ignore spoofed headers).
 */
export function getClientIp(req) {
  const remote = normalizeIp(req.socket?.remoteAddress || '');
  if (isLoopback(remote)) {
    const real = req.headers['x-real-ip'];
    if (real) return normalizeIp(String(real));
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return normalizeIp(forwarded.split(',')[0]);
    }
  }
  if (remote) return remote;
  return normalizeIp(req.ip);
}
