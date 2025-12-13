const express = require('express');
const router = express.Router();
const { products } = require('../../model');
const { validateBody, validateParams } = require('../../middleware/validation');
const { productSchemas, idParamSchema } = require('../../middleware/validation/schemas');
const { authenticate, authorize } = require('../../middleware/auth');

const controller = require('../base/controller')(products);


router.post('/',
  authenticate,
  authorize('admin', 'manager'),
  validateBody(productSchemas.create),
  (req, res, next) => controller.create(req, res, next)
);


router.get('/rand',
  authenticate,
  (req, res, next) => controller.findRandom(req, res, next)
);


router.get('/',
  authenticate,
  (req, res, next) => controller.findAll(req, res, next)
);


router.get('/:id',
  authenticate,
  validateParams(idParamSchema),
  (req, res, next) => controller.findOne(req, res, next)
);


router.put('/:id',
  authenticate,
  authorize('admin', 'manager'),
  validateParams(idParamSchema),
  validateBody(productSchemas.update),
  (req, res, next) => controller.update(req, res, next)
);


router.patch('/:id',
  authenticate,
  authorize('admin', 'manager'),
  validateParams(idParamSchema),
  validateBody(productSchemas.update),
  (req, res, next) => controller.update(req, res, next)
);


router.delete('/:id',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  (req, res, next) => controller.delete(req, res, next)
);

module.exports = router;
