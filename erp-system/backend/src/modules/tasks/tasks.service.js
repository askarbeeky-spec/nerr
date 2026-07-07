'use strict';

const db = require('../../config/db');

const BASE_SELECT = `
  SELECT
    t.id, t.title, t.description, t.priority, t.status,
    t.due_date, t.created_at, t.updated_at,
    p.name AS project_name,
    p.id   AS project_id,
    u.email AS created_by_email
  FROM tasks t
  LEFT JOIN projects p ON t.project_id = p.id
  LEFT JOIN users u    ON t.created_by = u.id
`;

module.exports = {
  async findAll({ page = 1, limit = 20, project_id, status, priority, search }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];

    if (project_id) { values.push(project_id); conditions.push(`t.project_id = $${values.length}`); }
    if (status)     { values.push(status);     conditions.push(`t.status = $${values.length}`); }
    if (priority)   { values.push(priority);   conditions.push(`t.priority = $${values.length}`); }
    if (search)     { values.push(`%${search}%`); conditions.push(`t.title ILIKE $${values.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await db.query(`SELECT COUNT(*) FROM tasks t ${where}`, values);

    values.push(limit, offset);
    const { rows } = await db.query(
      `${BASE_SELECT} ${where} ORDER BY
        CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    // Attach assignees to each task
    for (const task of rows) {
      const assignees = await db.query(
        `SELECT e.id, e.first_name, e.last_name
         FROM task_assignments ta
         JOIN employees e ON ta.employee_id = e.id
         WHERE ta.task_id = $1`,
        [task.id],
      );
      task.assignees = assignees.rows;
    }

    return { data: rows, total: parseInt(countRes.rows[0].count, 10), page, limit };
  },

  async findById(id) {
    const { rows } = await db.query(`${BASE_SELECT} WHERE t.id = $1`, [id]);
    if (!rows[0]) return null;

    const assignees = await db.query(
      `SELECT e.id, e.first_name, e.last_name
       FROM task_assignments ta
       JOIN employees e ON ta.employee_id = e.id
       WHERE ta.task_id = $1`,
      [id],
    );
    rows[0].assignees = assignees.rows;
    return rows[0];
  },

  async create(data, userId) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO tasks (project_id, title, description, priority, status, due_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [data.project_id, data.title, data.description, data.priority || 'medium', data.status || 'todo', data.due_date, userId],
      );

      const task = rows[0];

      // Bulk-insert assignees if provided
      if (data.assignee_ids && data.assignee_ids.length) {
        const assignValues = data.assignee_ids
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ');
        await client.query(
          `INSERT INTO task_assignments (task_id, employee_id) VALUES ${assignValues} ON CONFLICT DO NOTHING`,
          [task.id, ...data.assignee_ids],
        );
      }

      await client.query('COMMIT');
      return this.findById(task.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id, data) {
    const allowed = ['title', 'description', 'priority', 'status', 'due_date', 'project_id'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        values.push(data[key]);
        fields.push(`${key} = $${values.length}`);
      }
    }

    if (fields.length) {
      values.push(id);
      await db.query(
        `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${values.length}`,
        values,
      );
    }

    // Update assignees if provided
    if (data.assignee_ids) {
      await db.query('DELETE FROM task_assignments WHERE task_id = $1', [id]);
      if (data.assignee_ids.length) {
        const assignValues = data.assignee_ids
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ');
        await db.query(
          `INSERT INTO task_assignments (task_id, employee_id) VALUES ${assignValues}`,
          [id, ...data.assignee_ids],
        );
      }
    }

    return this.findById(id);
  },

  async updateStatus(id, status) {
    const { rows } = await db.query(
      'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
      [status, id],
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rows } = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  },
};
