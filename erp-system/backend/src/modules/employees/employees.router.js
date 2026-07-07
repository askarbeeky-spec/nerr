'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const controller = require('./employees.controller');
const validate = require('../../middlewares/validate');
const { authMiddleware, authorize } = require('../../middlewares/auth');

router.use(authMiddleware);

router.get('/', controller.list);
router.get('/:id', [param('id').isUUID()], validate, controller.getById);

router.post(
  '/',
  authorize('admin', 'manager'),
  [
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty(),
    body('department_id').optional().isUUID(),
    body('position_id').optional().isUUID(),
    body('phone').optional().isMobilePhone(),
    body('hire_date').optional().isDate(),
    body('salary').optional().isNumeric(),
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
