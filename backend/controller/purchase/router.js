const express = require('express');
const router = express.Router();
const db = require('../../model');
const { purchases } = db;
const { validateBody, validateParams } = require('../../middleware/validation');
const { purchaseSchemas, idParamSchema } = require('../../middleware/validation/schemas');
const { authenticate, authorize } = require('../../middleware/auth');
const { checkOwnership, filterByOwnership } = require('../../middleware/ownership');
const { paginate } = require('../../middleware/pagination');
const { parseSort, parseFilters, paginatedResponse, buildQueryOptions } = require('../../utils/queryHelpers');

const baseController = require('../base/controller')(purchases);


const FILTER_CONFIG = {
  employeeId: { 
    operator: '=', 
    type: 'integer',
  },
  closed: { 
    operator: '=', 
    type: 'boolean',
  },
  dateFrom: { 
    field: 'date', 
    operator: '>=', 
    type: 'date',
  },
  dateTo: { 
    field: 'date', 
    operator: '<=', 
    type: 'date',
  },
  minTotal: { 
    field: 'total', 
    operator: '>=', 
    type: 'number',
  },
  maxTotal: { 
    field: 'total', 
    operator: '<=', 
    type: 'number',
  },
};


const ALLOWED_SORT_FIELDS = ['id', 'date', 'total', 'closed', 'employeeId'];


const purchaseController = {
  
  async findAll(req, res, next) {
    try {
      
      const queryFilters = parseFilters(req.query, FILTER_CONFIG);
      
      
      const ownershipFilter = req.ownershipFilter || {};
      const where = { ...queryFilters, ...ownershipFilter };
      
      
      const order = parseSort(req.query.sort, ALLOWED_SORT_FIELDS, [['date', 'DESC']]);
      
      
      const queryOptions = buildQueryOptions({
        pagination: req.pagination,
        where,
        order,
      });
      
      
      const { count, rows } = await purchases.findAndCountAll(queryOptions);
      
      
      res.status(200).json(paginatedResponse(rows, count, req.pagination));
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
  paginate(20, 100),
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
