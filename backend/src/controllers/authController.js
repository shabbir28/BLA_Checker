import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bla_checker_enterprise_jwt_super_secret_key_2026!';
const JWT_EXPIRES_IN = '7d';

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const result = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email.trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Your account is suspended. Please contact the administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, 'USER_LOGIN', 'USER', $3, $4, $5)`,
      [user.id, user.email, String(user.id), JSON.stringify({ userAgent: req.headers['user-agent'] }), req.ip || '127.0.0.1']
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lead_quota: user.lead_quota,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login.' });
  }
}

export async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, status, lead_quota)
       VALUES ($1, $2, $3, 'user', 'active', 250000)
       RETURNING id, email, name, role, lead_quota, created_at`,
      [email.trim().toLowerCase(), passwordHash, name.trim()]
    );

    const newUser = result.rows[0];
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, 'USER_REGISTER', 'USER', $3, $4, $5)`,
      [newUser.id, newUser.email, String(newUser.id), JSON.stringify({ name: newUser.name }), req.ip || '127.0.0.1']
    );

    return res.status(201).json({
      token,
      user: newUser,
    });
  } catch (error) {
    console.error('[AUTH] Register error:', error);
    return res.status(500).json({ message: 'Internal server error during registration.' });
  }
}

export async function getMe(req, res) {
  return res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (name) {
      await query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [name.trim(), userId]);
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password.' });
      }
      const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
      const newHash = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
    }

    const updated = await query('SELECT id, email, name, role, lead_quota FROM users WHERE id = $1', [userId]);
    return res.json({ message: 'Profile updated successfully', user: updated.rows[0] });
  } catch (error) {
    console.error('[AUTH] Update profile error:', error);
    return res.status(500).json({ message: 'Failed to update profile.' });
  }
}
