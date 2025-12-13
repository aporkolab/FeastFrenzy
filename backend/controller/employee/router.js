const express = require('express');
const router = express.Router();
const { employees } = require('../../model');
const { validateBody, validateParams } = require('../../middleware/validation');
const { employeeSchemas, idParamSchema } = require('../../middleware/validation/schemas');
const { authenticate, authorize } = require('../../middleware/auth');

const controller = require('../base/controller')(employees);


router.post('/',
  authenticate,
  authorize('admin'),
  validateBody(employeeSchemas.create),
  (req, res, next) => controller.create(req, res, next)
);


router.get('/rand',
  authenticate,
  authorize('admin', 'manager'),
  (req, res, next) => controller.findRandom(req, res, next)
);


router.get('/',
  authenticate,
  authorize('admin', 'manager'),
  (req, res, next) => controller.findAll(req, res, next)
);


router.get('/:id',
  authenticate,
  validateParams(idParamSchema),
  async (req, res, next) => {
    
    if (['admin', 'manager'].includes(req.user.role)) {
      return controller.findOne(req, res, next);
    }
    
    
    
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Required role: admin or manager',
      },
    });
  }
);


router.put('/:id',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  validateBody(employeeSchemas.update),
  (req, res, next) => controller.update(req, res, next)
);


router.patch('/:id',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  validateBody(employeeSchemas.update),
  (req, res, next) => controller.update(req, res, next)
);


router.delete('/:id',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  (req, res, next) => controller.delete(req, res, next)
);

module.exports = router;
