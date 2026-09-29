import { query } from '../config/db.js';
import { getClientIp, isValidIp, normalizeIp } from '../utils/clientIp.js';
import { invalidateAllowlistCache, loadAllowlist } from '../services/ipAllowlist.js';

async function writeAudit(req, action, resourceId, details) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, 'SECURITY', $4, $5, $6)`,
      [
        req.user.id,
        req.user.email,
        action,
        String(resourceId || ''),
        JSON.stringify(details || {}),
        getClientIp(req),
      ]
    );
  } catch (err) {
    console.error('[SECURITY] Audit log failed:', err.message);
  }
}

export async function getSecurityState(req, res) {
  try {
    const settings = await query('SELECT ip_allowlist_enabled, updated_at FROM security_settings WHERE id = 1');
    const ips = await query(
      `SELECT a.id, a.ip_address, a.label, a.status, a.created_at, u.name as created_by_name, u.email as created_by_email
       FROM allowed_ips a
       LEFT JOIN users u ON u.id = a.created_by
       ORDER BY a.created_at DESC`
    );
    const currentIp = getClientIp(req);
    const enabled = Boolean(settings.rows[0]?.ip_allowlist_enabled);
    return res.json({
      enabled,
      updatedAt: settings.rows[0]?.updated_at || null,
      currentIp,
      currentIpAllowed: ips.rows.some(
        (r) => r.status === 'active' && normalizeIp(r.ip_address) === normalizeIp(currentIp)
      ),
      allowedIps: ips.rows,
    });
  } catch (error) {
    console.error('[SECURITY] Get state error:', error);
    return res.status(500).json({ message: 'Failed to load security settings.' });
  }
}

export async function addAllowedIp(req, res) {
  try {
    const ip = normalizeIp(req.body?.ip_address || req.body?.ip || '');
    const label = String(req.body?.description || req.body?.label || '').trim().slice(0, 255);
    const statusRaw = String(req.body?.status || 'active').toLowerCase();
    const status = statusRaw === 'inactive' || statusRaw === 'off' ? 'inactive' : 'active';

    if (!isValidIp(ip)) {
      return res.status(400).json({ message: 'Enter a valid IPv4 or IPv6 address.' });
    }
    if (!label) {
      return res.status(400).json({ message: 'Add a description for where this IP is used.' });
    }

    const insert = await query(
      `INSERT INTO allowed_ips (ip_address, label, status, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ip_address) DO UPDATE SET
         label = COALESCE(NULLIF(EXCLUDED.label, ''), allowed_ips.label),
         status = EXCLUDED.status
       RETURNING id, ip_address, label, status, created_at`,
      [ip, label || null, status, req.user.id]
    );

    invalidateAllowlistCache();
    await writeAudit(req, 'SECURITY_ALLOW_IP', insert.rows[0].id, { ip, label, status });
    return res.status(201).json({ message: 'IP allowed.', ip: insert.rows[0] });
  } catch (error) {
    console.error('[SECURITY] Add IP error:', error);
    return res.status(500).json({ message: 'Failed to allow IP.' });
  }
}

export async function removeAllowedIp(req, res) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id, ip_address, status FROM allowed_ips WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'IP not found.' });
    }

    const settings = await query('SELECT ip_allowlist_enabled FROM security_settings WHERE id = 1');
    const activeCount = await query(`SELECT COUNT(*)::int as total FROM allowed_ips WHERE status = 'active'`);
    const currentIp = getClientIp(req);
    if (settings.rows[0]?.ip_allowlist_enabled) {
      if (existing.rows[0].status === 'active' && activeCount.rows[0].total <= 1) {
        return res.status(400).json({ message: 'Turn protection off before removing the last active IP.' });
      }
      if (normalizeIp(existing.rows[0].ip_address) === normalizeIp(currentIp)) {
        return res.status(400).json({ message: 'You cannot remove your current IP while protection is on.' });
      }
    }

    await query('DELETE FROM allowed_ips WHERE id = $1', [id]);
    invalidateAllowlistCache();
    await writeAudit(req, 'SECURITY_REMOVE_IP', id, { ip: existing.rows[0].ip_address });
    return res.json({ message: 'IP removed.' });
  } catch (error) {
    console.error('[SECURITY] Remove IP error:', error);
    return res.status(500).json({ message: 'Failed to remove IP.' });
  }
}

export async function updateSecuritySettings(req, res) {
  try {
    const enabled = Boolean(req.body?.enabled);
    if (enabled) {
      const count = await query(`SELECT COUNT(*)::int as total FROM allowed_ips WHERE status = 'active'`);
      if (count.rows[0].total < 1) {
        return res.status(400).json({ message: 'Add at least one active IP before turning protection on.' });
      }
      const currentIp = getClientIp(req);
      const mine = await query(
        `SELECT id FROM allowed_ips WHERE ip_address = $1 AND status = 'active'`,
        [normalizeIp(currentIp)]
      );
      if (mine.rows.length === 0) {
        return res.status(400).json({
          message: `Add your current IP (${currentIp || 'unknown'}) and keep it On before enabling protection, or you will be locked out.`,
        });
      }
    }

    await query(
      'UPDATE security_settings SET ip_allowlist_enabled = $1, updated_at = NOW() WHERE id = 1',
      [enabled]
    );
    invalidateAllowlistCache();
    await loadAllowlist(true);
    await writeAudit(req, enabled ? 'SECURITY_ALLOWLIST_ON' : 'SECURITY_ALLOWLIST_OFF', '1', { enabled });
    return res.json({
      message: enabled ? 'IP protection is on. Other IPs will see 404 Not Found.' : 'IP protection is off.',
      enabled,
    });
  } catch (error) {
    console.error('[SECURITY] Update settings error:', error);
    return res.status(500).json({ message: 'Failed to update security settings.' });
  }
}

export async function updateAllowedIp(req, res) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id, ip_address, status FROM allowed_ips WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'IP not found.' });
    }

    const statusRaw = String(req.body?.status || '').toLowerCase();
    const status = statusRaw === 'inactive' || statusRaw === 'off' ? 'inactive' : statusRaw === 'active' || statusRaw === 'on' ? 'active' : '';
    if (!status) {
      return res.status(400).json({ message: 'Status must be On or Off.' });
    }

    if (status === 'inactive' && existing.rows[0].status === 'active') {
      const settings = await query('SELECT ip_allowlist_enabled FROM security_settings WHERE id = 1');
      if (settings.rows[0]?.ip_allowlist_enabled) {
        const currentIp = getClientIp(req);
        if (normalizeIp(existing.rows[0].ip_address) === normalizeIp(currentIp)) {
          return res.status(400).json({ message: 'You cannot turn off your current IP while protection is on.' });
        }
        const activeCount = await query(`SELECT COUNT(*)::int as total FROM allowed_ips WHERE status = 'active'`);
        if (activeCount.rows[0].total <= 1) {
          return res.status(400).json({ message: 'Turn protection off before disabling the last active IP.' });
        }
      }
    }

    const updated = await query(
      `UPDATE allowed_ips SET status = $1 WHERE id = $2
       RETURNING id, ip_address, label, status, created_at`,
      [status, id]
    );
    invalidateAllowlistCache();
    await writeAudit(req, 'SECURITY_IP_STATUS', id, { ip: existing.rows[0].ip_address, status });
    return res.json({
      message: status === 'active' ? 'This IP can access the server.' : 'This IP can no longer access the server.',
      ip: updated.rows[0],
    });
  } catch (error) {
    console.error('[SECURITY] Update IP error:', error);
    return res.status(500).json({ message: 'Failed to update IP status.' });
  }
}
