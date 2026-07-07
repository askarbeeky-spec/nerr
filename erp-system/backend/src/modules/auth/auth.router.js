'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const controller = require('./auth.controller');
const validate = require('../../middlewares/validate');
const { authMiddleware } = require('../../middlewares/auth');

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['admin', 'manager', 'employee']),
  ],
  validate,
  controller.register,
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  controller.login,
);

// POST /api/auth/refresh
router.post('/refresh', controller.refresh);

// POST /api/auth/logout
router.post('/logout', authMiddleware, controller.logout);

// GET /api/auth/me
router.get('/me', authMiddleware, controller.me);

module.exports = router;
