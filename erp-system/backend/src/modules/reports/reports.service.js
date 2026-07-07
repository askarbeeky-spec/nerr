'use strict';

const db = require('../../config/db');

module.exports = {
  /**
   * Aggregate KPIs for the main dashboard
   */
  async getDashboardStats() {
    const [employees, departments, projects, tasks] = await Promise.all([
      db.query(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'on_leave')::int AS on_leave
        FROM employees`),
      db.query('SELECT COUNT(*)::int AS total FROM departments'),
      db.query(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
        FROM projects`),
      db.query(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'todo')::int AS todo,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE status = 'review')::int AS review,
        COUNT(*) FILTER (WHERE status = 'done')::int AS done
        FROM tasks`),
    ]);

    return {
      employees: employees.rows[0],
      departments: departments.rows[0],
      projects: projects.rows[0],
      tasks: tasks.rows[0],
    };
  },

  /**
   * Employees grouped by department with salary stats
   */
  async getEmployeeReport() {
    const { rows } = await db.query(
      `SELECT
         d.name AS department,
         COUNT(e.id)::int AS count,
         ROUND(AVG(e.salary), 2) AS avg_salary,
         SUM(e.salary) AS total_salary
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
       GROUP BY d.id, d.name
       ORDER BY count DESC`,
    );
    return rows;
  },

  /**
   * Projects with completion stats
   */
  async getProjectReport() {
    const { rows } = await db.query(
      `SELECT
         p.id, p.name, p.status, p.start_date, p.end_date,
         COUNT(t.id)::int AS total_tasks,
         COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS completed_tasks,
         CASE WHEN COUNT(t.id) > 0
           THEN ROUND(COUNT(t.id) FILTER (WHERE t.status = 'done')::numeric / COUNT(t.id) * 100, 1)
           ELSE 0
         END AS completion_pct
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
    );
    return rows;
  },
};
