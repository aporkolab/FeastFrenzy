const express = require('express');
const router = express.Router();
const userService = require('../../services/user.service');
const { users } = require('../../model');
const { validateBody, validateParams } = require('../../middleware/validation');
const { idParamSchema } = require('../../middleware/validation/schemas');
const { authenticate, authorize } = require('../../middleware/auth');
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
const Joi = require('joi');

const getUser = createModelGetter(users);

// Validation schemas for users
const userSchemas = {
  create: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(255).required(),
    role: Joi.string().valid('admin', 'manager', 'employee').default('employee'),
  }),
  update: Joi.object({
    email: Joi.string().email(),
    password: Joi.string().min(8),
    name: Joi.string().min(2).max(255),
    role: Joi.string().valid('admin', 'manager', 'employee'),
    isActive: Joi.boolean(),
  }).min(1),
};

const FILTER_CONFIG = {
  role: {
    operator: '=',
    type: 'string',
  },
  isActive: {
    operator: '=',
    type: 'boolean',
  },
  name: {
    operator: 'LIKE',
    transform: v => `%${v}%`,
  },
  email: {
    operator: 'LIKE',
    transform: v => `%${v}%`,
  },
};

const ALLOWED_SORT_FIELDS = ['id', 'name', 'email', 'role', 'createdAt', 'lastLogin'];

/**
 * User controller using optimized service layer
 */
const userController = {
  async findAll(req, res, next) {
    try {
      const where = parseFilters(req.query, FILTER_CONFIG);
      const order = parseSort(req.query.sort, ALLOWED_SORT_FIELDS, [
        ['id', 'ASC'],
      ]);

      const { data, count } = await userService.findAll({
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
      const user = await userService.findById(req.params.id);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },

  async findWithStats(req, res, next) {
    try {
      const user = await userService.findWithStats(req.params.id);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },

  async findMe(req, res, next) {
    try {
      const user = await userService.findById(req.user.id);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const user = await userService.create(req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.body);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await userService.delete(req.params.id);
      res.status(200).json({ deleted: true });
    } catch (error) {
      next(error);
    }
  },

  async deactivate(req, res, next) {
    try {
      await userService.deactivate(req.params.id);
      res.status(200).json({ message: 'User deactivated successfully' });
    } catch (error) {
      next(error);
    }
  },

  async reactivate(req, res, next) {
    try {
      const user = await userService.reactivate(req.params.id);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },

  async unlock(req, res, next) {
    try {
      const user = await userService.unlock(req.params.id);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },

  async getLockedUsers(req, res, next) {
    try {
      const users = await userService.findLockedOut();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  },

  async countByRole(req, res, next) {
    try {
      const counts = await userService.countByRole();
      res.status(200).json(counts);
    } catch (error) {
      next(error);
    }
  },
};

/**
 * @swagger
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     description: Returns the profile of the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, userController.findMe);

/**
 * @swagger
 * /users/locked:
 *   get:
 *     tags: [Users]
 *     summary: Get locked out users
 *     description: Returns users currently locked out (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of locked users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/locked',
  authenticate,
  authorize('admin'),
  userController.getLockedUsers,
);

/**
 * @swagger
 * /users/stats/by-role:
 *   get:
 *     tags: [Users]
 *     summary: Get user count by role
 *     description: Returns count of active users grouped by role (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User counts by role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 admin:
 *                   type: integer
 *                 manager:
 *                   type: integer
 *                 employee:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/stats/by-role',
  authenticate,
  authorize('admin'),
  userController.countByRole,
);

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     description: Creates a new user (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager, employee]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Email already exists
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateBody(userSchemas.create),
  invalidateCache(['users:*', 'user:*']),
  auditCreate('user'),
  userController.create,
);

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     description: Returns a paginated list of users (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *       - name: sort
 *         in: query
 *         description: "Sort field (e.g., name:asc)"
 *         schema:
 *           type: string
 *       - name: role
 *         in: query
 *         description: Filter by role
 *         schema:
 *           type: string
 *           enum: [admin, manager, employee]
 *       - name: isActive
 *         in: query
 *         description: Filter by active status
 *         schema:
 *           type: boolean
 *       - name: name
 *         in: query
 *         description: Filter by name (partial match)
 *         schema:
 *           type: string
 *       - name: email
 *         in: query
 *         description: Filter by email (partial match)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  paginate(20, 100),
  cache('users', cacheTTL.users.list, { userSpecific: false }),
  userController.findAll,
);

/**
 * @swagger
 * /users/{id}/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get user with activity statistics
 *     description: Returns user with purchase statistics (admin only)
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
 *         description: User with statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get(
  '/:id/stats',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  userController.findWithStats,
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Returns a single user (admin only)
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
 *         description: User found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  cache('user', cacheTTL.users.single, { userSpecific: false }),
  userController.findOne,
);

/**
 * @swagger
 * /users/{id}/deactivate:
 *   post:
 *     tags: [Users]
 *     summary: Deactivate a user
 *     description: Soft deletes a user by setting isActive to false (admin only)
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
 *         description: User deactivated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.post(
  '/:id/deactivate',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  invalidateCache(['users:*', 'user:*']),
  userController.deactivate,
);

/**
 * @swagger
 * /users/{id}/reactivate:
 *   post:
 *     tags: [Users]
 *     summary: Reactivate a user
 *     description: Reactivates a deactivated user (admin only)
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
 *         description: User reactivated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.post(
  '/:id/reactivate',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  invalidateCache(['users:*', 'user:*']),
  userController.reactivate,
);

/**
 * @swagger
 * /users/{id}/unlock:
 *   post:
 *     tags: [Users]
 *     summary: Unlock a user account
 *     description: Removes lockout from a user account (admin only)
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
 *         description: User unlocked
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.post(
  '/:id/unlock',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  invalidateCache(['users:*', 'user:*']),
  userController.unlock,
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update a user (full)
 *     description: Fully updates a user (admin only)
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
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already exists
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  validateBody(userSchemas.update),
  invalidateCache(['users:*', 'user:*']),
  auditUpdate('user', getUser),
  userController.update,
);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user (partial)
 *     description: Partially updates a user (admin only)
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
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  validateBody(userSchemas.update),
  invalidateCache(['users:*', 'user:*']),
  auditUpdate('user', getUser),
  userController.update,
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user
 *     description: Hard deletes a user. Will fail if user has purchases. (admin only)
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
 *         description: User deleted
 *       400:
 *         description: Cannot delete user with purchases
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  invalidateCache(['users:*', 'user:*']),
  auditDelete('user', getUser),
  userController.delete,
);

module.exports = router;
