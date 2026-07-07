'use strict';

const service = require('./users.service');

module.exports = {
  async list(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await service.findAll({
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 100),
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const user = await service.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const user = await service.update(req.params.id, req.body);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      const deleted = await service.remove(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, message: 'User deleted' });
    } catch (err) { next(err); }
  },
};
