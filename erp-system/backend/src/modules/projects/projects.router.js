'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const controller = require('./projects.controller');
const validate = require('../../middlewares/validate');
const { authMiddleware, authorize } = require('../../middlewares/auth');

router.use(authMiddleware);

router.get('/', controller.list);
router.get('/:id', [param('id').isUUID()], validate, controller.getById);

router.post(
  '/',
  authorize('admin', 'manager'),
  [
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('status').optional().isIn(['active', 'completed', 'on_hold', 'cancelled']),
    body('start_date').optional().isDate(),
    body('end_date').optional().isDate(),
    body('manager_id').optional().isUUID(),
  ],
  validate,
  controller.create,
);

router.put(
  '/:id',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  validate,
  controller.update,
);

router.delete(
  '/:id',
  authorize('admin'),
  [param('id').isUUID()],
  validate,
  controller.remove,
);

module.exports = router;
