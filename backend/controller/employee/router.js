const express = require('express');
const router = express.Router();
const { employees } = require('../../model');
const { validateBody, validateParams } = require('../../middleware/validation');
const { employeeSchemas, idParamSchema } = require('../../middleware/validation/schemas');

const controller = require('../base/controller')(employees);


router.post('/',
  validateBody(employeeSchemas.create),
  (req, res, next) => controller.create(req, res, next)
);


router.get('/rand', (req, res, next) => controller.findRandom(req, res, next));

router.get('/', (req, res, next) => controller.findAll(req, res, next));

router.get('/:id',
  validateParams(idParamSchema),
  (req, res, next) => controller.findOne(req, res, next)
);


router.put('/:id',
  validateParams(idParamSchema),
  validateBody(employeeSchemas.update),
  (req, res, next) => controller.update(req, res, next)
);

router.patch('/:id',
  validateParams(idParamSchema),
  validateBody(employeeSchemas.update),
  (req, res, next) => controller.update(req, res, next)
);


router.delete('/:id',
  validateParams(idParamSchema),
  (req, res, next) => controller.delete(req, res, next)
);

module.exports = router;
