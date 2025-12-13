const express = require('express');
const router = express.Router();
const db = require('../../model');
const { purchases } = db;
const { validateBody, validateParams } = require('../../middleware/validation');
const {
  purchaseSchemas,
  idParamSchema,
} = require('../../middleware/validation/schemas');
const { authenticate, authorize } = require('../../middleware/auth');
const {
  checkOwnership,
  filterByOwnership,
} = require('../../middleware/ownership');
const { paginate } = require('../../middleware/pagination');
const {
  parseSort,
  parseFilters,
  paginatedResponse,
  buildQueryOptions,
} = require('../../utils/queryHelpers');

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
      const order = parseSort(req.query.sort, ALLOWED_SORT_FIELDS, [
        ['date', 'DESC'],
      ]);

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

/**
 * @swagger
 * /purchases:
 *   post:
 *     tags: [Purchases]
 *     summary: Create a new purchase
 *     description: Creates a new purchase. Non-admin/manager users will have their userId auto-assigned.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseCreate'
 *           example:
 *             date: "2023-12-01T10:30:00.000Z"
 *             employeeId: 1
 *             total: 0
 *             closed: false
 *     responses:
 *       201:
 *         description: Purchase created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Purchase'
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
 */
router.post(
  '/',
  authenticate,
  validateBody(purchaseSchemas.create),
  purchaseController.create
);

/**
 * @swagger
 * /purchases/rand:
 *   get:
 *     tags: [Purchases]
 *     summary: Get a random purchase
 *     description: Returns a random purchase (filtered by ownership for non-admin users)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Random purchase returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Purchase'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: No purchases found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.get(
  '/rand',
  authenticate,
  filterByOwnership('purchase'),
  (req, res, next) => baseController.findRandom(req, res, next)
);

/**
 * @swagger
 * /purchases:
 *   get:
 *     tags: [Purchases]
 *     summary: Get all purchases
 *     description: Returns a paginated list of purchases (filtered by ownership for non-admin users)
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
 *         description: "Sort field and direction (e.g., date:desc, total:asc)"
 *         schema:
 *           type: string
 *       - name: employeeId
 *         in: query
 *         description: Filter by employee ID
 *         schema:
 *           type: integer
 *       - name: closed
 *         in: query
 *         description: Filter by closed status
 *         schema:
 *           type: boolean
 *       - name: dateFrom
 *         in: query
 *         description: Filter by date (from)
 *         schema:
 *           type: string
 *           format: date
 *       - name: dateTo
 *         in: query
 *         description: Filter by date (to)
 *         schema:
 *           type: string
 *           format: date
 *       - name: minTotal
 *         in: query
 *         description: Filter by minimum total amount
 *         schema:
 *           type: number
 *       - name: maxTotal
 *         in: query
 *         description: Filter by maximum total amount
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of purchases
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedPurchases'
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
  filterByOwnership('purchase'),
  paginate(20, 100),
  purchaseController.findAll
);

/**
 * @swagger
 * /purchases/{id}:
 *   get:
 *     tags: [Purchases]
 *     summary: Get purchase by ID
 *     description: Returns a single purchase (ownership checked for non-admin users)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Purchase ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Purchase found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Purchase'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - not owner of this purchase
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Purchase not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.get(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  (req, res, next) => baseController.findOne(req, res, next)
);

/**
 * @swagger
 * /purchases/{id}:
 *   put:
 *     tags: [Purchases]
 *     summary: Update a purchase (full)
 *     description: Fully updates a purchase (ownership checked for non-admin users)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Purchase ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseUpdate'
 *           example:
 *             date: "2023-12-02T10:30:00.000Z"
 *             employeeId: 1
 *             total: 25.50
 *             closed: true
 *     responses:
 *       200:
 *         description: Purchase updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Purchase'
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
 *         description: Forbidden - not owner of this purchase
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Purchase not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.put(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  validateBody(purchaseSchemas.update),
  (req, res, next) => baseController.update(req, res, next)
);

/**
 * @swagger
 * /purchases/{id}:
 *   patch:
 *     tags: [Purchases]
 *     summary: Update a purchase (partial)
 *     description: Partially updates a purchase (ownership checked for non-admin users)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Purchase ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseUpdate'
 *           example:
 *             closed: true
 *     responses:
 *       200:
 *         description: Purchase updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Purchase'
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
 *         description: Forbidden - not owner of this purchase
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Purchase not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.patch(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  validateBody(purchaseSchemas.update),
  (req, res, next) => baseController.update(req, res, next)
);

/**
 * @swagger
 * /purchases/{id}:
 *   delete:
 *     tags: [Purchases]
 *     summary: Delete a purchase
 *     description: Deletes a purchase (admin/manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Purchase ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Purchase deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: "Purchase deleted successfully"
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
 *       404:
 *         description: Purchase not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validateParams(idParamSchema),
  (req, res, next) => baseController.delete(req, res, next)
);

module.exports = router;
