'use strict';

const db = require('../../config/db');

module.exports = {
  async findAll({ page = 1, limit = 20, status, search }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];

    if (status) {
      values.push(status);
      conditions.push(`p.status = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`p.name ILIKE $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) FROM projects p ${where}`, values);
    values.push(limit, offset);

    const { rows } = await db.query(
      `SELECT p.*,
         e.first_name || ' ' || e.last_name AS manager_name,
         COUNT(t.id)::int AS task_count
       FROM projects p
       LEFT JOIN employees e ON p.manager_id = e.id
       LEFT JOIN tasks t ON t.project_id = p.id
       ${where}
       GROUP BY p.id, e.first_name, e.last_name
       ORDER BY p.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    return { data: rows, total: parseInt(countRes.rows[0].count, 10), page, limit };
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT p.*,
         e.first_name || ' ' || e.last_name AS manager_name,
         COUNT(t.id)::int AS task_count
       FROM projects p
       LEFT JOIN employees e ON p.manager_id = e.id
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, e.first_name, e.last_name`,
      [id],
    );
    return rows[0] || null;
  },

  async create(data) {
    const { name, description, status, start_date, end_date, manager_id } = data;
    const { rows } = await db.query(
      `INSERT INTO projects (name, description, status, start_date, end_date, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, status || 'active', start_date, end_date, manager_id],
    );
    return rows[0];
  },

  async update(id, data) {
    const allowed = ['name', 'description', 'status', 'start_date', 'end_date', 'manager_id'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        values.push(data[key]);
        fields.push(`${key} = $${values.length}`);
      }
    }

    if (!fields.length) return this.findById(id);
    values.push(id);

    const { rows } = await db.query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rows } = await db.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  },
};
