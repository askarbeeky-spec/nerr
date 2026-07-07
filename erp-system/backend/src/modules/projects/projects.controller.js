'use strict';

const service = require('./projects.service');

module.exports = {
  async list(req, res, next) {
    try {
      const { page, limit, status, search } = req.query;
      const result = await service.findAll({
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 100),
        status,
        search,
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },
  async getById(req, res, next) {
    try {
      const project = await service.findById(req.params.id);
      if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
      res.json({ success: true, data: project });
    } catch (err) { next(err); }
  },
  async create(req, res, next) {
    try {
      const project = await service.create(req.body);
      res.status(201).json({ success: true, data: project });
    } catch (err) { next(err); }
  },
  async update(req, res, next) {
    try {
      const project = await service.update(req.params.id, req.body);
      if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
      res.json({ success: true, data: project });
    } catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try {
      const deleted = await service.remove(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Project not found' });
      res.json({ success: true, message: 'Project deleted' });
    } catch (err) { next(err); }
  },
};
