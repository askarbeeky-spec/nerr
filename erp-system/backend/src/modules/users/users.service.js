'use strict';

const db = require('../../config/db');

module.exports = {
  async findAll({ page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const countRes = await db.query('SELECT COUNT(*) FROM users');
    const { rows } = await db.query(
      `SELECT id, email, role, is_active, created_at, updated_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return { data: rows, total: parseInt(countRes.rows[0].count, 10), page, limit };
  },

  async findById(id) {
    const { rows } = await db.query(
      'SELECT id, email, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id],
    );
    return rows[0] || null;
  },

  async update(id, { role, is_active }) {
    const fields = [];
    const values = [];
    if (role !== undefined) { values.push(role); fields.push(`role = $${values.length}`); }
    if (is_active !== undefined) { values.push(is_active); fields.push(`is_active = $${values.length}`); }
    if (!fields.length) return this.findById(id);

    values.push(id);
    const { rows } = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
       RETURNING id, email, role, is_active, created_at, updated_at`,
      values,
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rows } = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  },
};
