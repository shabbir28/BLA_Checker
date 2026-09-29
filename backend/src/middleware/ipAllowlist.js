import { getClientIp } from '../utils/clientIp.js';
import { shouldBlockIp } from '../services/ipAllowlist.js';

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>404 Not Found</title>
  <style>
    html,body{margin:0;height:100%;background:#020806;color:#a1a1aa;font-family:system-ui,sans-serif}
    main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
    h1{margin:0;color:#fff;font-size:3.5rem;letter-spacing:-0.04em}
    p{margin:10px 0 0;font-size:0.95rem}
  </style>
</head>
<body>
  <main>
    <h1>404</h1>
    <p>NOT FOUND</p>
  </main>
</body>
</html>`;

function sendNotFound(req, res) {
  const wantsHtml = String(req.headers.accept || '').includes('text/html');
  if (wantsHtml) {
    res.status(404).type('html').send(NOT_FOUND_HTML);
    return;
  }
  res.status(404).json({ message: 'Not Found' });
}

/** Blocks non-allowlisted IPs with a generic 404 when protection is on. */
export async function ipAllowlistMiddleware(req, res, next) {
  try {
    if (req.path === '/security/gate' || req.originalUrl === '/api/security/gate') {
      return next();
    }
    const ip = getClientIp(req);
    if (await shouldBlockIp(ip)) {
      return sendNotFound(req, res);
    }
    return next();
  } catch (err) {
    console.error('[SECURITY] Allowlist middleware error:', err);
    return next();
  }
}

/** Nginx auth_request: 200 allow, 403 deny (mapped to 404 in nginx). */
export async function securityGate(req, res) {
  try {
    const ip = getClientIp(req);
    if (await shouldBlockIp(ip)) {
      return res.status(403).end();
    }
    return res.status(200).end();
  } catch (err) {
    console.error('[SECURITY] Gate error:', err);
    return res.status(200).end();
  }
}
