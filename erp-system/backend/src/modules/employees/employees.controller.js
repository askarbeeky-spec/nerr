'use strict';

const service = require('./employees.service');

module.exports = {
  async list(req, res, next) {
    try {
      const { page, limit, search, department_id, status } = req.query;
      const result = await service.findAll({
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 100),
        search,
        department_id,
        status,
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const employee = await service.findById(req.params.id);
      if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
      res.json({ success: true, data: employee });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const employee = await service.create(req.body);
      res.status(201).json({ success: true, data: employee });
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const employee = await service.update(req.params.id, req.body);
      if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
      res.json({ success: true, data: employee });
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      const deleted = await service.remove(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Employee not found' });
      res.json({ success: true, message: 'Employee deleted' });
    } catch (err) { next(err); }
  },
};
