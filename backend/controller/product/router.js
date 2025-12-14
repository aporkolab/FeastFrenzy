const express = require('express');
const router = express.Router();
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
  buildQueryOptions,
} = require('../../utils/queryHelpers');
const {
  auditCreate,
  auditUpdate,
  auditDelete,
  createModelGetter,
} = require('../../middleware/audit');

const controller = require('../base/controller')(products);

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

const paginatedController = {
  async findAll(req, res, next) {
    try {
      const where = parseFilters(req.query, FILTER_CONFIG);
      const order = parseSort(req.query.sort, ALLOWED_SORT_FIELDS, [
        ['id', 'ASC'],
      ]);

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
  auditCreate('product'),
  (req, res, next) => controller.create(req, res, next)
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
router.get('/rand', authenticate, (req, res, next) =>
  controller.findRandom(req, res, next)
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
router.get('/', authenticate, paginate(20, 100), paginatedController.findAll);

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
  (req, res, next) => controller.findOne(req, res, next)
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
  auditUpdate('product', getProduct),
  (req, res, next) => controller.update(req, res, next)
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
  auditUpdate('product', getProduct),
  (req, res, next) => controller.update(req, res, next)
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
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: "Product deleted successfully"
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
  auditDelete('product', getProduct),
  (req, res, next) => controller.delete(req, res, next)
);

module.exports = router;
