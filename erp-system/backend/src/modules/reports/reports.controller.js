'use strict';

const service = require('./reports.service');

module.exports = {
  async dashboard(req, res, next) {
    try {
      const data = await service.getDashboardStats();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async employees(req, res, next) {
    try {
      const data = await service.getEmployeeReport();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  async projects(req, res, next) {
    try {
      const data = await service.getProjectReport();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};
