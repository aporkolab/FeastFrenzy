const express = require('express');
const router = express.Router();
const { purchaseItems } = require('../../model');
const { validateBody, validateParams } = require('../../middleware/validation');
const {
  purchaseItemSchemas,
  idParamSchema,
} = require('../../middleware/validation/schemas');
const { authenticate, authorize } = require('../../middleware/auth');
const { paginate } = require('../../middleware/pagination');
const {
  paginatedResponse,
  buildQueryOptions,
} = require('../../utils/queryHelpers');

const controller = require('../base/controller')(purchaseItems);

const paginatedController = {
  async findAll(req, res, next) {
    try {
      const queryOptions = buildQueryOptions({
        pagination: req.pagination,
        order: [['id', 'ASC']],
      });

      const { count, rows } = await purchaseItems.findAndCountAll(queryOptions);
      res.status(200).json(paginatedResponse(rows, count, req.pagination));
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
 *     description: Adds an item to a purchase
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
 *             price: 2.50
 *     responses:
 *       201:
 *         description: Purchase item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseItem'
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
  validateBody(purchaseItemSchemas.create),
  (req, res, next) => controller.create(req, res, next)
);

/**
 * @swagger
 * /purchase-items/rand:
 *   get:
 *     tags: [Purchase Items]
 *     summary: Get a random purchase item
 *     description: Returns a random purchase item from the database
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
router.get('/rand', authenticate, (req, res, next) =>
  controller.findRandom(req, res, next)
);

/**
 * @swagger
 * /purchase-items:
 *   get:
 *     tags: [Purchase Items]
 *     summary: Get all purchase items
 *     description: Returns a paginated list of purchase items
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
router.get('/', authenticate, paginate(20, 100), paginatedController.findAll);

/**
 * @swagger
 * /purchase-items/{id}:
 *   get:
 *     tags: [Purchase Items]
 *     summary: Get purchase item by ID
 *     description: Returns a single purchase item by its ID
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
  (req, res, next) => controller.findOne(req, res, next)
);

/**
 * @swagger
 * /purchase-items/{id}:
 *   put:
 *     tags: [Purchase Items]
 *     summary: Update a purchase item (full)
 *     description: Fully updates a purchase item
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
 *             price: 3.00
 *     responses:
 *       200:
 *         description: Purchase item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseItem'
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
  (req, res, next) => controller.update(req, res, next)
);

/**
 * @swagger
 * /purchase-items/{id}:
 *   patch:
 *     tags: [Purchase Items]
 *     summary: Update a purchase item (partial)
 *     description: Partially updates a purchase item
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
  (req, res, next) => controller.update(req, res, next)
);

/**
 * @swagger
 * /purchase-items/{id}:
 *   delete:
 *     tags: [Purchase Items]
 *     summary: Delete a purchase item
 *     description: Deletes a purchase item (admin/manager only)
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
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: "Purchase item deleted successfully"
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
  (req, res, next) => controller.delete(req, res, next)
);

module.exports = router;
