const express = require('express');
const router = express.Router();
const db = require('../../model');
const { purchases } = db;
const { validateBody, validateParams } = require('../../middleware/validation');
const { purchaseSchemas, idParamSchema } = require('../../middleware/validation/schemas');
const { authenticate, authorize } = require('../../middleware/auth');
const { checkOwnership, ensureOwnership, filterByOwnership } = require('../../middleware/ownership');

const baseController = require('../base/controller')(purchases);


const purchaseController = {
  
  async findAll(req, res, next) {
    try {
      const whereClause = req.ownershipFilter || {};
      const results = await purchases.findAll({ where: whereClause });
      res.json(results);
    } catch (error) {
      next(error);
    }
  },
  
  
  async create(req, res, next) {
    try {
      const data = { ...req.body };
      
      if (req.user && !['admin', 'manager'].includes(req.user.role)) {
        data.userId = req.user.id;
      }
      const result = await purchases.create(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
};


router.post('/',
  authenticate,
  validateBody(purchaseSchemas.create),
  purchaseController.create
);


router.get('/rand',
  authenticate,
  filterByOwnership('purchase'),
  (req, res, next) => baseController.findRandom(req, res, next)
);


router.get('/',
  authenticate,
  filterByOwnership('purchase'),
  purchaseController.findAll
);


router.get('/:id',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  (req, res, next) => baseController.findOne(req, res, next)
);


router.put('/:id',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  validateBody(purchaseSchemas.update),
  (req, res, next) => baseController.update(req, res, next)
);


router.patch('/:id',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  validateBody(purchaseSchemas.update),
  (req, res, next) => baseController.update(req, res, next)
);


router.delete('/:id',
  authenticate,
  authorize('admin', 'manager'),
  validateParams(idParamSchema),
  (req, res, next) => baseController.delete(req, res, next)
);

module.exports = router;
