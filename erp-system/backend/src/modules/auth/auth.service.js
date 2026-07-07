'use strict';

const db = require('../../config/db');
const { hash, compare } = require('../../utils/password');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../utils/jwt');

module.exports = {
  async register({ email, password, role = 'employee' }) {
    // Check for duplicate email
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      const err = new Error('Email already in use');
      err.status = 409;
      throw err;
    }

    const passwordHash = await hash(password);
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email, passwordHash, role],
    );

    const user = rows[0];
    const payload = { id: user.id, email: user.email, role: user.role };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: await this._storeRefreshToken(user.id, payload),
      user,
    };
  },

  async login({ email, password }) {
    const { rows } = await db.query(
      'SELECT id, email, role, password_hash, is_active FROM users WHERE email = $1',
      [email],
    );

    const user = rows[0];
    if (!user || !(await compare(password, user.password_hash))) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    if (!user.is_active) {
      const err = new Error('Account is deactivated');
      err.status = 403;
      throw err;
    }

    const payload = { id: user.id, email: user.email, role: user.role };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: await this._storeRefreshToken(user.id, payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  },

  async refresh(token) {
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      const err = new Error('Invalid or expired refresh token');
      err.status = 401;
      throw err;
    }

    // Validate token exists in DB (rotation / revocation support)
    const { rows } = await db.query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [token],
    );
    if (!rows.length) {
      const err = new Error('Refresh token revoked or expired');
      err.status = 401;
      throw err;
    }

    const payload = { id: decoded.id, email: decoded.email, role: decoded.role };
    return { accessToken: generateAccessToken(payload) };
  },

  async logout(token) {
    if (token) {
      await db.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    }
  },

  async _storeRefreshToken(userId, payload) {
    const token = generateRefreshToken(payload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt],
    );

    return token;
  },
};
