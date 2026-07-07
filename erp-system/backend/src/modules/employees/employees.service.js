'use strict';

const db = require('../../config/db');

const BASE_SELECT = `
  SELECT
    e.id, e.first_name, e.last_name, e.phone, e.hire_date, e.salary, e.status,
    e.created_at, e.updated_at,
    d.name  AS department_name,
    d.id    AS department_id,
    p.title AS position_title,
    p.id    AS position_id,
    u.email AS email
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  LEFT JOIN positions p   ON e.position_id = p.id
  LEFT JOIN users u       ON e.user_id = u.id
`;

module.exports = {
  async findAll({ page = 1, limit = 20, search, department_id, status }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(e.first_name ILIKE $${values.length} OR e.last_name ILIKE $${values.length})`);
    }
    if (department_id) {
      values.push(department_id);
      conditions.push(`e.department_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`e.status = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query(
      `SELECT COUNT(*) FROM employees e ${where}`,
      values,
    );

    values.push(limit, offset);
    const { rows } = await db.query(
      `${BASE_SELECT} ${where} ORDER BY e.last_name ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    return {
      data: rows,
      total: parseInt(countRes.rows[0].count, 10),
      page,
      limit,
    };
  },

  async findById(id) {
    const { rows } = await db.query(`${BASE_SELECT} WHERE e.id = $1`, [id]);
    return rows[0] || null;
  },

  async create(data) {
    const { first_name, last_name, department_id, position_id, phone, hire_date, salary, user_id } = data;
    const { rows } = await db.query(
      `INSERT INTO employees (first_name, last_name, department_id, position_id, phone, hire_date, salary, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [first_name, last_name, department_id, position_id, phone, hire_date, salary, user_id],
    );
    return rows[0];
  },

  async update(id, data) {
    const allowed = ['first_name', 'last_name', 'department_id', 'position_id', 'phone', 'hire_date', 'salary', 'status'];
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
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rows } = await db.query(
      'DELETE FROM employees WHERE id = $1 RETURNING id',
      [id],
    );
    return rows[0] || null;
  },
};
