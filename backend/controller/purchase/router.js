const express = require('express');
const router = express.Router();
const purchaseService = require('../../services/purchase.service');
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
  auditCreate,
  auditUpdate,
  auditDelete,
  createModelGetter,
} = require('../../middleware/audit');
const {
  parseSort,
  parseFilters,
  paginatedResponse,
} = require('../../utils/queryHelpers');
const { cache, invalidateCache } = require('../../middleware/cache');
const cacheTTL = require('../../config/cache');

const getPurchase = createModelGetter(purchases);

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

/**
 * Convert month name to date range
 * @param {string} monthName - Month name (e.g., 'january', 'february')
 * @returns {{ dateFrom: Date, dateTo: Date } | null}
 */
const parseMonthFilter = (monthName) => {
  if (!monthName) {return null;}

  const months = {
    january: 0, february: 1, march: 2, april: 3,
    may: 4, june: 5, july: 6, august: 7,
    september: 8, october: 9, november: 10, december: 11,
  };

  const monthIndex = months[monthName.toLowerCase()];
  if (monthIndex === undefined) {return null;}

  const year = new Date().getFullYear();
  const dateFrom = new Date(year, monthIndex, 1);
  const dateTo = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  return { dateFrom, dateTo };
};

const ALLOWED_SORT_FIELDS = ['id', 'date', 'total', 'closed', 'employeeId'];

/**
 * Purchase controller using optimized service layer
 */
const purchaseController = {
  async findAll(req, res, next) {
    try {
      const queryFilters = parseFilters(req.query, FILTER_CONFIG);
      const ownershipFilter = req.ownershipFilter || {};

      // Handle month filter (e.g., ?month=february)
      const monthRange = parseMonthFilter(req.query.month);
      if (monthRange) {
        const { Op } = require('sequelize');
        queryFilters.date = {
          [Op.gte]: monthRange.dateFrom,
          [Op.lte]: monthRange.dateTo,
        };
      }

      const where = { ...queryFilters, ...ownershipFilter };
      const order = parseSort(req.query.sort, ALLOWED_SORT_FIELDS, [
        ['date', 'DESC'],
      ]);

      const { data, count } = await purchaseService.findAll({
        where,
        order,
        pagination: req.pagination,
        includeEmployee: true,
      });

      res.status(200).json(paginatedResponse(data, count, req.pagination));
    } catch (error) {
      next(error);
    }
  },

  async findOne(req, res, next) {
    try {
      const purchase = await purchaseService.findById(req.params.id, {
        includeItems: true,
        includeEmployee: true,
      });
      res.status(200).json(purchase);
    } catch (error) {
      next(error);
    }
  },

  async findWithItems(req, res, next) {
    try {
      const purchase = await purchaseService.findWithItems(req.params.id);
      res.status(200).json(purchase);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const data = { ...req.body };

      // Auto-assign userId for non-admin/manager users
      if (req.user && !['admin', 'manager'].includes(req.user.role)) {
        data.userId = req.user.id;
      }

      // Check if items are provided
      const items = data.items || [];
      delete data.items;

      let purchase;
      if (items.length > 0) {
        // Create purchase with items in a transaction
        purchase = await purchaseService.createWithItems(data, items);
      } else {
        // Create purchase without items using model directly
        purchase = await purchases.create(data);
        purchase = await purchaseService.findById(purchase.id);
      }

      res.status(201).json(purchase);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = { ...req.body };
      const items = data.items;
      delete data.items;

      let purchase;
      if (items !== undefined) {
        // Update with items replacement
        purchase = await purchaseService.updateWithItems(req.params.id, data, items);
      } else {
        // Update purchase only
        const existingPurchase = await purchases.findByPk(req.params.id);
        if (!existingPurchase) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Purchase not found' },
          });
        }
        await existingPurchase.update(data);
        purchase = await purchaseService.findById(req.params.id);
      }

      res.status(200).json(purchase);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await purchaseService.delete(req.params.id);
      res.status(200).json({ deleted: true });
    } catch (error) {
      next(error);
    }
  },

  async addItems(req, res, next) {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Items array is required' },
        });
      }

      const purchase = await purchaseService.addItems(req.params.id, items);
      res.status(200).json(purchase);
    } catch (error) {
      next(error);
    }
  },

  async recalculateTotal(req, res, next) {
    try {
      const purchase = await purchaseService.recalculateTotal(req.params.id);
      res.status(200).json(purchase);
    } catch (error) {
      next(error);
    }
  },

  async closePurchase(req, res, next) {
    try {
      const purchase = await purchaseService.closePurchase(req.params.id);
      res.status(200).json(purchase);
    } catch (error) {
      next(error);
    }
  },

  async getEmployeeSummary(req, res, next) {
    try {
      const { employeeId } = req.params;
      const { from, to } = req.query;

      const summary = await purchaseService.getEmployeePurchaseSummary(
        employeeId,
        { from, to },
      );

      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get aggregated spending summaries for ALL employees
   * Optimized endpoint using SQL GROUP BY
   */
  async getAllSummaries(req, res, next) {
    try {
      const { from, to } = req.query;

      const summaries = await purchaseService.getAllEmployeeSummaries({ from, to });

      res.status(200).json(summaries);
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
 *     description: Creates a new purchase with optional items. Non-admin/manager users will have their userId auto-assigned.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/PurchaseCreate'
 *               - type: object
 *                 properties:
 *                   items:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         productId:
 *                           type: integer
 *                         quantity:
 *                           type: integer
 *           example:
 *             date: "2023-12-01T10:30:00.000Z"
 *             employeeId: 1
 *             items:
 *               - productId: 1
 *                 quantity: 2
 *               - productId: 3
 *                 quantity: 1
 *     responses:
 *       201:
 *         description: Purchase created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Purchase'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  validateBody(purchaseSchemas.create),
  invalidateCache(['purchases:*', 'purchase:*']),
  auditCreate('purchase'),
  purchaseController.create,
);

/**
 * @swagger
 * /purchases/summaries:
 *   get:
 *     tags: [Purchases]
 *     summary: Get aggregated spending summaries for all employees
 *     description: Returns total spending per employee for a date range using optimized SQL aggregation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: from
 *         in: query
 *         description: Start date filter (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         description: End date filter (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Array of employee spending summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   employeeId:
 *                     type: integer
 *                   totalSpending:
 *                     type: number
 *                   purchaseCount:
 *                     type: integer
 */
router.get(
  '/summaries',
  authenticate,
  authorize('admin', 'manager'),
  cache('purchase-summaries', cacheTTL.purchases.list, { userSpecific: false }),
  purchaseController.getAllSummaries,
);

/**
 * @swagger
 * /purchases/employee/{employeeId}/summary:
 *   get:
 *     tags: [Purchases]
 *     summary: Get employee purchase summary
 *     description: Returns aggregated purchase statistics for an employee
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: employeeId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *       - name: from
 *         in: query
 *         description: Start date filter
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         description: End date filter
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Employee purchase summary
 */
router.get(
  '/employee/:employeeId/summary',
  authenticate,
  authorize('admin', 'manager'),
  purchaseController.getEmployeeSummary,
);

/**
 * @swagger
 * /purchases:
 *   get:
 *     tags: [Purchases]
 *     summary: Get all purchases
 *     description: Returns a paginated list of purchases with employee data (filtered by ownership for non-admin users)
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
 *         description: List of purchases with employee data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedPurchases'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  filterByOwnership('purchase'),
  paginate(20, 100),
  cache('purchases', cacheTTL.purchases.list, { userSpecific: true }),
  purchaseController.findAll,
);

/**
 * @swagger
 * /purchases/{id}:
 *   get:
 *     tags: [Purchases]
 *     summary: Get purchase by ID with full details
 *     description: Returns a single purchase with employee and items data
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
 *         description: Purchase with employee and items
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not owner of this purchase
 *       404:
 *         description: Purchase not found
 */
router.get(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  cache('purchase', cacheTTL.purchases.single, { userSpecific: true }),
  purchaseController.findOne,
);

/**
 * @swagger
 * /purchases/{id}/items:
 *   post:
 *     tags: [Purchases]
 *     summary: Add items to a purchase
 *     description: Adds items to an existing open purchase
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Items added successfully
 *       400:
 *         description: Cannot add to closed purchase
 *       404:
 *         description: Purchase not found
 */
router.post(
  '/:id/items',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  invalidateCache(['purchases:*', 'purchase:*']),
  purchaseController.addItems,
);

/**
 * @swagger
 * /purchases/{id}/recalculate:
 *   post:
 *     tags: [Purchases]
 *     summary: Recalculate purchase total
 *     description: Recalculates the total based on item quantities and product prices
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Total recalculated
 *       404:
 *         description: Purchase not found
 */
router.post(
  '/:id/recalculate',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  invalidateCache(['purchases:*', 'purchase:*']),
  purchaseController.recalculateTotal,
);

/**
 * @swagger
 * /purchases/{id}/close:
 *   post:
 *     tags: [Purchases]
 *     summary: Close a purchase
 *     description: Marks a purchase as closed/finalized
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Purchase closed
 *       400:
 *         description: Purchase already closed
 *       404:
 *         description: Purchase not found
 */
router.post(
  '/:id/close',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  invalidateCache(['purchases:*', 'purchase:*']),
  purchaseController.closePurchase,
);

/**
 * @swagger
 * /purchases/{id}:
 *   put:
 *     tags: [Purchases]
 *     summary: Update a purchase (full)
 *     description: Fully updates a purchase, optionally replacing all items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/PurchaseUpdate'
 *               - type: object
 *                 properties:
 *                   items:
 *                     type: array
 *                     description: If provided, replaces all existing items
 *     responses:
 *       200:
 *         description: Purchase updated
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Purchase not found
 */
router.put(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  validateBody(purchaseSchemas.update),
  invalidateCache(['purchases:*', 'purchase:*']),
  auditUpdate('purchase', getPurchase),
  purchaseController.update,
);

/**
 * @swagger
 * /purchases/{id}:
 *   patch:
 *     tags: [Purchases]
 *     summary: Update a purchase (partial)
 *     description: Partially updates a purchase
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseUpdate'
 *     responses:
 *       200:
 *         description: Purchase updated
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Purchase not found
 */
router.patch(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  checkOwnership('purchase'),
  validateBody(purchaseSchemas.update),
  invalidateCache(['purchases:*', 'purchase:*']),
  auditUpdate('purchase', getPurchase),
  purchaseController.update,
);

/**
 * @swagger
 * /purchases/{id}:
 *   delete:
 *     tags: [Purchases]
 *     summary: Delete a purchase
 *     description: Deletes a purchase and its items (admin/manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Purchase deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Purchase not found
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validateParams(idParamSchema),
  invalidateCache(['purchases:*', 'purchase:*']),
  auditDelete('purchase', getPurchase),
  purchaseController.delete,
);

module.exports = router;
