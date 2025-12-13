const express = require('express');
const router = express.Router();
const { products } = require('../../model');
const { validateBody, validateParams } = require('../../middleware/validation');
const { productSchemas, idParamSchema } = require('../../middleware/validation/schemas');
const { authenticate, authorize } = require('../../middleware/auth');
const { paginate } = require('../../middleware/pagination');
const { parseSort, parseFilters, paginatedResponse, buildQueryOptions } = require('../../utils/queryHelpers');

const controller = require('../base/controller')(products);


const FILTER_CONFIG = {
  name: { 
    operator: 'LIKE', 
    transform: v => `%${v}%`,
  },
  minPrice: { 
    field: 'price', 
    operator: '>=', 
    type: 'number',
  },
  maxPrice: { 
    field: 'price', 
    operator: '<=', 
    type: 'number',
  },
};


const ALLOWED_SORT_FIELDS = ['id', 'name', 'price'];


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
      
      
      const { count, rows } = await products.findAndCountAll(queryOptions);
      
      
      res.status(200).json(paginatedResponse(rows, count, req.pagination));
    } catch (error) {
      next(error);
    }
  },
};





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
  paginate(20, 100),
  paginatedController.findAll
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
