'use strict';

const express = require('express');
const { param } = require('express-validator');
const router = express.Router();
const controller = require('./users.controller');
const validate = require('../../middlewares/validate');
const { authMiddleware, authorize } = require('../../middlewares/auth');

router.use(authMiddleware);
router.use(authorize('admin'));

router.get('/', controller.list);
router.get('/:id', [param('id').isUUID()], validate, controller.getById);
router.put('/:id', [param('id').isUUID()], validate, controller.update);
router.delete('/:id', [param('id').isUUID()], validate, controller.remove);

module.exports = router;
