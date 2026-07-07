'use strict';

const service = require('./tasks.service');

module.exports = {
  async list(req, res, next) {
    try {
      const { page, limit, project_id, status, priority, search } = req.query;
      const result = await service.findAll({
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 100),
        project_id, status, priority, search,
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const task = await service.findById(req.params.id);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      res.json({ success: true, data: task });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const task = await service.create(req.body, req.user.id);
      res.status(201).json({ success: true, data: task });
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const task = await service.update(req.params.id, req.body);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      res.json({ success: true, data: task });
    } catch (err) { next(err); }
  },

  async updateStatus(req, res, next) {
    try {
      const task = await service.updateStatus(req.params.id, req.body.status);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      res.json({ success: true, data: task });
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      const deleted = await service.remove(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Task not found' });
      res.json({ success: true, message: 'Task deleted' });
    } catch (err) { next(err); }
  },
};
