'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./reports.controller');
const { authMiddleware } = require('../../middlewares/auth');

router.use(authMiddleware);

router.get('/dashboard', controller.dashboard);
router.get('/employees', controller.employees);
router.get('/projects', controller.projects);

module.exports = router;
