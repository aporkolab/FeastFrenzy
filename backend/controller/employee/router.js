const express = require('express');
const router = express.Router();
const { employees } = require('../../model');
const { validateBody, validateParams } = require('../../middleware/validation');
const { employeeSchemas, idParamSchema } = require('../../middleware/validation/schemas');
const { authenticate, authorize } = require('../../middleware/auth');
const { paginate } = require('../../middleware/pagination');
const { parseSort, parseFilters, paginatedResponse, buildQueryOptions } = require('../../utils/queryHelpers');

const controller = require('../base/controller')(employees);


const FILTER_CONFIG = {
  name: { 
    operator: 'LIKE', 
    transform: v => `%${v}%`,
  },
  employee_number: { 
    operator: '=',
    type: 'string',
  },
  minConsumption: { 
    field: 'monthlyConsumptionValue', 
    operator: '>=', 
    type: 'integer',
  },
  maxConsumption: { 
    field: 'monthlyConsumptionValue', 
    operator: '<=', 
    type: 'integer',
  },
};


const ALLOWED_SORT_FIELDS = ['id', 'name', 'employee_number', 'monthlyConsumptionValue'];


const paginatedController = {
  
  async findAll(req, res, next) {
    try {
      
      const where = parseFilters(req.query, FILTER_CONFIG);
      
      
      const order = parseSort(req.query.sort, ALLOWED_SORT_FIELDS, [['id', 'ASC']]);
      
      
      const queryOptions = buildQueryOptions({
        pagination: req.pagination,
        where,
        order,
      });
      
      
      const { count, rows } = await employees.findAndCountAll(queryOptions);
      
      
      res.status(200).json(paginatedResponse(rows, count, req.pagination));
    } catch (error) {
      next(error);
    }
  },
};





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
  paginate(20, 100),
  paginatedController.findAll
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
