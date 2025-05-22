const express = require('express');
const router = express.Router();
const purchaseItemService = require('../../services/purchaseItem.service');
const { purchaseItems } = require('../../model');
const { validateBody, validateParams } = require('../../middleware/validation');
const {
  purchaseItemSchemas,
  idParamSchema,
} = require('../../middleware/validation/schemas');
const { authenticate, authorize } = require('../../middleware/auth');
const { paginate } = require('../../middleware/pagination');
const {
  auditCreate,
  auditUpdate,
  auditDelete,
  createModelGetter,
} = require('../../middleware/audit');
const { paginatedResponse } = require('../../utils/queryHelpers');
const { cache, invalidateCache } = require('../../middleware/cache');
const cacheTTL = require('../../config/cache');

const getPurchaseItem = createModelGetter(purchaseItems);

/**
 * Purchase Item controller using optimized service layer
 */
const purchaseItemController = {
  async findAll(req, res, next) {
    try {
      // Build where clause from query params
      const where = {};
      if (req.query.purchaseId) {
        where.purchaseId = parseInt(req.query.purchaseId, 10);
      }
      if (req.query.productId) {
        where.productId = parseInt(req.query.productId, 10);
      }

      const { data, count } = await purchaseItemService.findAll({
        where,
        pagination: req.pagination,
        includeProduct: true,
      });

      res.status(200).json(paginatedResponse(data, count, req.pagination));
    } catch (error) {
      next(error);
    }
  },

  async findOne(req, res, next) {
    try {
      const item = await purchaseItemService.findById(req.params.id, {
        includeProduct: true,
        includePurchase: true,
      });
      res.status(200).json(item);
    } catch (error) {
      next(error);
    }
  },

  async findRandom(req, res, next) {
    try {
      const item = await purchaseItemService.findRandom();
      res.status(200).json(item);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const item = await purchaseItemService.create(req.body);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const item = await purchaseItemService.update(req.params.id, req.body);
      res.status(200).json(item);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await purchaseItemService.delete(req.params.id);
      res.status(200).json({ deleted: true });
    } catch (error) {
      next(error);
    }
  },
};

/**
 * @swagger
 * /purchase-items:
 *   post:
 *     tags: [Purchase Items]
 *     summary: Create a new purchase item
 *     description: Adds an item to a purchase. Will fail if purchase is closed.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseItemCreate'
 *           example:
 *             productId: 1
 *             purchaseId: 1
 *             quantity: 2
 *     responses:
 *       201:
 *         description: Purchase item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseItem'
 *       400:
 *         description: Validation error or purchase is closed
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
 *       404:
 *         description: Purchase or product not found
 */
router.post(
  '/',
  authenticate,
  validateBody(purchaseItemSchemas.create),
  invalidateCache(['purchase-items:*', 'purchase-item:*', 'purchases:*']),
  auditCreate('purchase-item'),
  purchaseItemController.create,
);

/**
 * @swagger
 * /purchase-items/rand:
 *   get:
 *     tags: [Purchase Items]
 *     summary: Get a random purchase item
 *     description: Returns a random purchase item with product data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Random purchase item returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseItem'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: No purchase items found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.get('/rand', authenticate, purchaseItemController.findRandom);

/**
 * @swagger
 * /purchase-items:
 *   get:
 *     tags: [Purchase Items]
 *     summary: Get all purchase items
 *     description: Returns a paginated list of purchase items with product data
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
 *     responses:
 *       200:
 *         description: List of purchase items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedPurchaseItems'
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
  cache('purchase-items', cacheTTL.purchaseItems.list, { userSpecific: false }),
  purchaseItemController.findAll,
);

/**
 * @swagger
 * /purchase-items/{id}:
 *   get:
 *     tags: [Purchase Items]
 *     summary: Get purchase item by ID
 *     description: Returns a single purchase item with product and purchase data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Purchase item ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Purchase item found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseItem'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Purchase item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.get(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  cache('purchase-item', cacheTTL.purchaseItems.single, { userSpecific: false }),
  purchaseItemController.findOne,
);

/**
 * @swagger
 * /purchase-items/{id}:
 *   put:
 *     tags: [Purchase Items]
 *     summary: Update a purchase item (full)
 *     description: Fully updates a purchase item. Will fail if purchase is closed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Purchase item ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseItemUpdate'
 *           example:
 *             quantity: 3
 *     responses:
 *       200:
 *         description: Purchase item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseItem'
 *       400:
 *         description: Validation error or purchase is closed
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
 *       404:
 *         description: Purchase item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.put(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  validateBody(purchaseItemSchemas.update),
  invalidateCache(['purchase-items:*', 'purchase-item:*', 'purchases:*']),
  auditUpdate('purchase-item', getPurchaseItem),
  purchaseItemController.update,
);

/**
 * @swagger
 * /purchase-items/{id}:
 *   patch:
 *     tags: [Purchase Items]
 *     summary: Update a purchase item (partial)
 *     description: Partially updates a purchase item. Will fail if purchase is closed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Purchase item ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseItemUpdate'
 *           example:
 *             quantity: 5
 *     responses:
 *       200:
 *         description: Purchase item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseItem'
 *       400:
 *         description: Validation error or purchase is closed
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
 *       404:
 *         description: Purchase item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.patch(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  validateBody(purchaseItemSchemas.update),
  invalidateCache(['purchase-items:*', 'purchase-item:*', 'purchases:*']),
  auditUpdate('purchase-item', getPurchaseItem),
  purchaseItemController.update,
);

/**
 * @swagger
 * /purchase-items/{id}:
 *   delete:
 *     tags: [Purchase Items]
 *     summary: Delete a purchase item
 *     description: Deletes a purchase item (admin/manager only). Will fail if purchase is closed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Purchase item ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Purchase item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted:
 *                   type: boolean
 *             example:
 *               deleted: true
 *       400:
 *         description: Cannot delete from closed purchase
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
 *         description: Purchase item not found
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
  invalidateCache(['purchase-items:*', 'purchase-item:*', 'purchases:*']),
  auditDelete('purchase-item', getPurchaseItem),
  purchaseItemController.delete,
);

module.exports = router;
