'use strict';

const service = require('./departments.service');

module.exports = {
  async list(req, res, next) {
    try {
      const data = await service.findAll();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  async getById(req, res, next) {
    try {
      const dept = await service.findById(req.params.id);
      if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
      res.json({ success: true, data: dept });
    } catch (err) { next(err); }
  },
  async create(req, res, next) {
    try {
      const dept = await service.create(req.body);
      res.status(201).json({ success: true, data: dept });
    } catch (err) { next(err); }
  },
  async update(req, res, next) {
    try {
      const dept = await service.update(req.params.id, req.body);
      if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
      res.json({ success: true, data: dept });
    } catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try {
      const deleted = await service.remove(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Department not found' });
      res.json({ success: true, message: 'Department deleted' });
    } catch (err) { next(err); }
  },
};
