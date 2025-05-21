const express = require('express');
const router = express.Router();
const productService = require('../../services/product.service');
const { products } = require('../../model');
const { validateBody, validateParams } = require('../../middleware/validation');
const {
  productSchemas,
  idParamSchema,
} = require('../../middleware/validation/schemas');
const { authenticate, authorize } = require('../../middleware/auth');
const { paginate } = require('../../middleware/pagination');
const {
  parseSort,
  parseFilters,
  paginatedResponse,
} = require('../../utils/queryHelpers');
const {
  auditCreate,
  auditUpdate,
  auditDelete,
  createModelGetter,
} = require('../../middleware/audit');
const { cache, invalidateCache } = require('../../middleware/cache');
const cacheTTL = require('../../config/cache');

// Getter for fetching product before update/delete (for audit logging)
const getProduct = createModelGetter(products);

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

/**
 * Product controller using optimized service layer
 */
const productController = {
  async findAll(req, res, next) {
    try {
      const where = parseFilters(req.query, FILTER_CONFIG);
      const order = parseSort(req.query.sort, ALLOWED_SORT_FIELDS, [
        ['id', 'ASC'],
      ]);

      const { data, count } = await productService.findAll({
        where,
        order,
        pagination: req.pagination,
      });

      res.status(200).json(paginatedResponse(data, count, req.pagination));
    } catch (error) {
      next(error);
    }
  },

  async findOne(req, res, next) {
    try {
      const product = await productService.findById(req.params.id);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  },

  async findWithStats(req, res, next) {
    try {
      const product = await productService.findWithStats(req.params.id);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  },

  async findPopular(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const products = await productService.findPopular(limit);
      res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  },

  async findRandom(req, res, next) {
    try {
      const product = await productService.findRandom();
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const product = await productService.create(req.body);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const product = await productService.update(req.params.id, req.body);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await productService.delete(req.params.id);
      res.status(200).json({ deleted: true });
    } catch (error) {
      next(error);
    }
  },
};

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     description: Creates a new product (admin/manager only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *           example:
 *             name: "Coffee"
 *             price: 2.50
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - requires admin or manager role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  validateBody(productSchemas.create),
  invalidateCache(['products:*', 'product:*']),
  auditCreate('product'),
  productController.create,
);

/**
 * @swagger
 * /products/rand:
 *   get:
 *     tags: [Products]
 *     summary: Get a random product
 *     description: Returns a random product from the database
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Random product returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: No products found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.get('/rand', authenticate, productController.findRandom);

/**
 * @swagger
 * /products/popular:
 *   get:
 *     tags: [Products]
 *     summary: Get popular products
 *     description: Returns most ordered products (admin/manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Number of products to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: List of popular products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Product'
 *                   - type: object
 *                     properties:
 *                       orderCount:
 *                         type: integer
 *                       totalQuantity:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/popular',
  authenticate,
  authorize('admin', 'manager'),
  productController.findPopular,
);

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products
 *     description: Returns a paginated list of products with optional filtering and sorting
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Items per page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - name: sort
 *         in: query
 *         description: "Sort field and direction (e.g., name:asc, price:desc)"
 *         schema:
 *           type: string
 *       - name: name
 *         in: query
 *         description: Filter by product name (partial match)
 *         schema:
 *           type: string
 *       - name: minPrice
 *         in: query
 *         description: Filter by minimum price
 *         schema:
 *           type: number
 *       - name: maxPrice
 *         in: query
 *         description: Filter by maximum price
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedProducts'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.get(
  '/',
  authenticate,
  paginate(20, 100),
  cache('products', cacheTTL.products.list, { userSpecific: false }),
  productController.findAll,
);

/**
 * @swagger
 * /products/{id}/stats:
 *   get:
 *     tags: [Products]
 *     summary: Get product with sales statistics
 *     description: Returns a product with aggregated sales stats (admin/manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Product ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Product with statistics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Product'
 *                 - type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalOrders:
 *                           type: integer
 *                         totalQuantitySold:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
router.get(
  '/:id/stats',
  authenticate,
  authorize('admin', 'manager'),
  validateParams(idParamSchema),
  productController.findWithStats,
);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by ID
 *     description: Returns a single product by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Product ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.get(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  cache('product', cacheTTL.products.single, { userSpecific: false }),
  productController.findOne,
);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product (full)
 *     description: Fully updates a product (admin/manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Product ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *           example:
 *             name: "Premium Coffee"
 *             price: 3.50
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validateParams(idParamSchema),
  validateBody(productSchemas.update),
  invalidateCache(['products:*', 'product:*']),
  auditUpdate('product', getProduct),
  productController.update,
);

/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product (partial)
 *     description: Partially updates a product (admin/manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Product ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *           example:
 *             price: 2.75
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.patch(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validateParams(idParamSchema),
  validateBody(productSchemas.update),
  invalidateCache(['products:*', 'product:*']),
  auditUpdate('product', getProduct),
  productController.update,
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
 *     description: Deletes a product (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Product ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted:
 *                   type: boolean
 *             example:
 *               deleted: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - requires admin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  invalidateCache(['products:*', 'product:*']),
  auditDelete('product', getProduct),
  productController.delete,
);

module.exports = router;
