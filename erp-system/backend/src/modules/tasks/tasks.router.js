'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const controller = require('./tasks.controller');
const validate = require('../../middlewares/validate');
const { authMiddleware, authorize } = require('../../middlewares/auth');

router.use(authMiddleware);

router.get('/', controller.list);
router.get('/:id', [param('id').isUUID()], validate, controller.getById);

router.post(
  '/',
  authorize('admin', 'manager'),
  [
    body('project_id').isUUID(),
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
    body('due_date').optional().isDate(),
    body('assignee_ids').optional().isArray(),
    body('assignee_ids.*').optional().isUUID(),
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

router.patch(
  '/:id/status',
  [
    param('id').isUUID(),
    body('status').isIn(['todo', 'in_progress', 'review', 'done']),
  ],
  validate,
  controller.updateStatus,
);

router.delete(
  '/:id',
  authorize('admin'),
  [param('id').isUUID()],
  validate,
  controller.remove,
);

module.exports = router;
