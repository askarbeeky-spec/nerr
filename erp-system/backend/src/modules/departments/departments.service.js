'use strict';

const db = require('../../config/db');

module.exports = {
  async findAll() {
    const { rows } = await db.query(
      `SELECT d.*, COUNT(e.id)::int AS employee_count
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id
       GROUP BY d.id
       ORDER BY d.name ASC`,
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT d.*, COUNT(e.id)::int AS employee_count
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id
       WHERE d.id = $1
       GROUP BY d.id`,
      [id],
    );
    const dept = rows[0] || null;
    if (dept) {
      const posResult = await db.query(
        'SELECT id, title FROM positions WHERE department_id = $1 ORDER BY title',
        [id],
      );
      dept.positions = posResult.rows;
    }
    return dept;
  },

  async create({ name, description }) {
    const { rows } = await db.query(
      'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
      [name, description],
    );
    return rows[0];
  },

  async update(id, { name, description }) {
    const { rows } = await db.query(
      `UPDATE departments SET
         name = COALESCE($1, name),
         description = COALESCE($2, description)
       WHERE id = $3 RETURNING *`,
      [name, description, id],
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rows } = await db.query('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  },
};
