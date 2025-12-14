const express = require('express');
const router = express.Router();
const AuditService = require('../../services/audit.service');
const { authenticate, authorize } = require('../../middleware/auth');
const { paginate } = require('../../middleware/pagination');
const { validateQuery } = require('../../middleware/validation');
const Joi = require('joi');

/**
 * Audit Log API
 *
 * Admin-only endpoints to query and analyze audit logs.
 * Because sometimes you need to know who broke production at 3 AM.
 */

// Validation schema for query parameters
const auditQuerySchema = Joi.object({
  userId: Joi.number().integer().positive(),
  action: Joi.string().valid(
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'LOGIN_FAILED',
    'PASSWORD_RESET'
  ),
  resource: Joi.string().max(50),
  resourceId: Joi.number().integer().positive(),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string(),
}).unknown(true);

/**
 * @swagger
 * /audit:
 *   get:
 *     tags: [Audit]
 *     summary: Query audit logs
 *     description: Returns paginated audit logs with optional filtering (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: query
 *         description: Filter by user ID
 *         schema:
 *           type: integer
 *       - name: action
 *         in: query
 *         description: Filter by action type
 *         schema:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE, LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_RESET]
 *       - name: resource
 *         in: query
 *         description: Filter by resource type
 *         schema:
 *           type: string
 *       - name: resourceId
 *         in: query
 *         description: Filter by resource ID
 *         schema:
 *           type: integer
 *       - name: from
 *         in: query
 *         description: Start date filter (ISO format)
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: to
 *         in: query
 *         description: End date filter (ISO format)
 *         schema:
 *           type: string
 *           format: date-time
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
 *         description: Paginated audit logs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedAuditLogs'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      // Manual validation since validateQuery has issues with read-only query object
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      
      const result = await AuditService.query({
        userId: req.query.userId ? parseInt(req.query.userId, 10) : undefined,
        action: req.query.action,
        resource: req.query.resource,
        resourceId: req.query.resourceId ? parseInt(req.query.resourceId, 10) : undefined,
        from: req.query.from,
        to: req.query.to,
        page,
        limit,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /audit/resource/{resource}/{resourceId}:
 *   get:
 *     tags: [Audit]
 *     summary: Get audit history for a specific resource
 *     description: Returns the change history for a specific resource (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: resource
 *         in: path
 *         required: true
 *         description: Resource type (product, employee, purchase, user)
 *         schema:
 *           type: string
 *       - name: resourceId
 *         in: path
 *         required: true
 *         description: Resource ID
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         description: Max entries to return
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Resource audit history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AuditLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.get(
  '/resource/:resource/:resourceId',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const { resource, resourceId } = req.params;
      const limit = parseInt(req.query.limit, 10) || 50;

      const history = await AuditService.getResourceHistory(
        resource,
        parseInt(resourceId, 10),
        limit
      );

      res.json(history);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /audit/user/{userId}:
 *   get:
 *     tags: [Audit]
 *     summary: Get user activity log
 *     description: Returns all actions performed by a specific user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         description: Max entries to return
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: User activity log
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AuditLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.get(
  '/user/:userId',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit, 10) || 100;

      const activity = await AuditService.getUserActivity(
        parseInt(userId, 10),
        limit
      );

      res.json(activity);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /audit/failed-logins:
 *   get:
 *     tags: [Audit]
 *     summary: Get failed login attempts
 *     description: Returns recent failed login attempts for security monitoring (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: since
 *         in: query
 *         description: Only show failures since this date
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: limit
 *         in: query
 *         description: Max entries to return
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Failed login attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FailedLoginEntry'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.get(
  '/failed-logins',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const { since, limit = 100 } = req.query;

      const failures = await AuditService.getFailedLogins({
        since,
        limit: parseInt(limit, 10),
      });

      res.json(failures);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
