const express = require('express');
const router = express.Router();
const employeeService = require('../../services/employee.service');
const { employees } = require('../../model');
const { validateBody, validateParams } = require('../../middleware/validation');
const {
  employeeSchemas,
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
const {
  parseSort,
  parseFilters,
  paginatedResponse,
} = require('../../utils/queryHelpers');
const { cache, invalidateCache } = require('../../middleware/cache');
const cacheTTL = require('../../config/cache');

const getEmployee = createModelGetter(employees);

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

const ALLOWED_SORT_FIELDS = [
  'id',
  'name',
  'employee_number',
  'monthlyConsumptionValue',
  'deletedAt',
];

/**
 * Employee controller using optimized service layer
 */
const employeeController = {
  async findAll(req, res, next) {
    try {
      const where = parseFilters(req.query, FILTER_CONFIG);
      const order = parseSort(req.query.sort, ALLOWED_SORT_FIELDS, [
        ['id', 'ASC'],
      ]);

      const { data, count } = await employeeService.findAll({
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
      const employee = await employeeService.findById(req.params.id);
      res.status(200).json(employee);
    } catch (error) {
      next(error);
    }
  },

  async findWithStats(req, res, next) {
    try {
      const employee = await employeeService.findWithStats(req.params.id);
      res.status(200).json(employee);
    } catch (error) {
      next(error);
    }
  },

  async findRandom(req, res, next) {
    try {
      const employee = await employeeService.findRandom();
      res.status(200).json(employee);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const employee = await employeeService.create(req.body);
      res.status(201).json(employee);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const employee = await employeeService.update(req.params.id, req.body);
      res.status(200).json(employee);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await employeeService.delete(req.params.id);
      res.status(200).json({ deleted: true });
    } catch (error) {
      next(error);
    }
  },

  // ============================================
  // SOFT DELETE CONTROLLER METHODS
  // ============================================

  /**
   * Get all soft-deleted employees (admin only)
   */
  async findDeleted(req, res, next) {
    try {
      const { data, count } = await employeeService.findDeleted(req.pagination);
      res.status(200).json(paginatedResponse(data, count, req.pagination));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Restore a soft-deleted employee (admin only)
   */
  async restore(req, res, next) {
    try {
      const employee = await employeeService.restore(req.params.id);
      res.status(200).json(employee);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Permanently delete an employee (admin only, no purchases)
   */
  async hardDelete(req, res, next) {
    try {
      await employeeService.hardDelete(req.params.id);
      res.status(200).json({ deleted: true, permanent: true });
    } catch (error) {
      next(error);
    }
  },
};

/**
 * @swagger
 * /employees:
 *   post:
 *     tags: [Employees]
 *     summary: Create a new employee
 *     description: Creates a new employee (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeCreate'
 *           example:
 *             name: "John Doe"
 *             employee_number: "EMP001"
 *             monthlyConsumptionValue: 50000
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
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
 *         description: Forbidden - requires admin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateBody(employeeSchemas.create),
  invalidateCache(['employees:*', 'employee:*']),
  auditCreate('employee'),
  employeeController.create,
);

/**
 * @swagger
 * /employees/rand:
 *   get:
 *     tags: [Employees]
 *     summary: Get a random employee
 *     description: Returns a random employee (admin/manager only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Random employee returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
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
 *         description: No employees found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.get(
  '/rand',
  authenticate,
  authorize('admin', 'manager'),
  employeeController.findRandom,
);

/**
 * @swagger
 * /employees/deleted:
 *   get:
 *     tags: [Employees]
 *     summary: Get soft-deleted employees
 *     description: Returns a paginated list of soft-deleted employees for restore functionality (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Items per page
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of deleted employees
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedEmployees'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.get(
  '/deleted',
  authenticate,
  authorize('admin'),
  paginate(20, 100),
  employeeController.findDeleted,
);

/**
 * @swagger
 * /employees:
 *   get:
 *     tags: [Employees]
 *     summary: Get all employees
 *     description: Returns a paginated list of active employees (admin/manager only). Soft-deleted employees are excluded.
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
 *         description: "Sort field and direction (e.g., name:asc)"
 *         schema:
 *           type: string
 *       - name: name
 *         in: query
 *         description: Filter by employee name (partial match)
 *         schema:
 *           type: string
 *       - name: employee_number
 *         in: query
 *         description: Filter by exact employee number
 *         schema:
 *           type: string
 *       - name: minConsumption
 *         in: query
 *         description: Filter by minimum monthly consumption value
 *         schema:
 *           type: integer
 *       - name: maxConsumption
 *         in: query
 *         description: Filter by maximum monthly consumption value
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedEmployees'
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
router.get(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  paginate(20, 100),
  cache('employees', cacheTTL.employees.list, { userSpecific: false }),
  employeeController.findAll,
);

/**
 * @swagger
 * /employees/{id}/stats:
 *   get:
 *     tags: [Employees]
 *     summary: Get employee with purchase statistics
 *     description: Returns an employee with aggregated purchase stats (admin/manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Employee with statistics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Employee'
 *                 - type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalPurchases:
 *                           type: integer
 *                         openPurchases:
 *                           type: integer
 *                         closedPurchases:
 *                           type: integer
 *                         totalSpent:
 *                           type: number
 *                         remainingAllowance:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Employee not found
 */
router.get(
  '/:id/stats',
  authenticate,
  authorize('admin', 'manager'),
  validateParams(idParamSchema),
  employeeController.findWithStats,
);

/**
 * @swagger
 * /employees/{id}/restore:
 *   post:
 *     tags: [Employees]
 *     summary: Restore a soft-deleted employee
 *     description: Restores a previously deleted employee (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Employee restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Employee is not deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       404:
 *         description: Employee not found
 */
router.post(
  '/:id/restore',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  invalidateCache(['employees:*', 'employee:*']),
  employeeController.restore,
);

/**
 * @swagger
 * /employees/{id}/hard-delete:
 *   delete:
 *     tags: [Employees]
 *     summary: Permanently delete an employee
 *     description: Permanently removes an employee from the database. Only works if employee has no purchases. Use soft delete (DELETE /employees/:id) for employees with purchase history. (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Employee permanently deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted:
 *                   type: boolean
 *                 permanent:
 *                   type: boolean
 *             example:
 *               deleted: true
 *               permanent: true
 *       400:
 *         description: Cannot delete - employee has purchases
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       404:
 *         description: Employee not found
 */
router.delete(
  '/:id/hard-delete',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  invalidateCache(['employees:*', 'employee:*']),
  employeeController.hardDelete,
);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     tags: [Employees]
 *     summary: Get employee by ID
 *     description: Returns a single employee (admin/manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Employee found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
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
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.get(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  cache('employee', cacheTTL.employees.single, { userSpecific: false }),
  async (req, res, next) => {
    if (['admin', 'manager'].includes(req.user.role)) {
      return employeeController.findOne(req, res, next);
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Required role: admin or manager',
      },
    });
  },
);

/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     tags: [Employees]
 *     summary: Update an employee (full)
 *     description: Fully updates an employee (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeUpdate'
 *           example:
 *             name: "John Doe Updated"
 *             employee_number: "EMP002"
 *             monthlyConsumptionValue: 75000
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
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
 *         description: Forbidden - requires admin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  validateBody(employeeSchemas.update),
  invalidateCache(['employees:*', 'employee:*']),
  auditUpdate('employee', getEmployee),
  employeeController.update,
);

/**
 * @swagger
 * /employees/{id}:
 *   patch:
 *     tags: [Employees]
 *     summary: Update an employee (partial)
 *     description: Partially updates an employee (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeUpdate'
 *           example:
 *             monthlyConsumptionValue: 60000
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
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
 *         description: Forbidden - requires admin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validateParams(idParamSchema),
  validateBody(employeeSchemas.update),
  invalidateCache(['employees:*', 'employee:*']),
  auditUpdate('employee', getEmployee),
  employeeController.update,
);

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     tags: [Employees]
 *     summary: Soft delete an employee
 *     description: Soft deletes an employee by setting deletedAt timestamp. The employee will no longer appear in lists but purchase history is preserved. Use POST /employees/:id/restore to restore. (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Employee soft deleted successfully
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
 *         description: Employee not found
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
  invalidateCache(['employees:*', 'employee:*']),
  auditDelete('employee', getEmployee),
  employeeController.delete,
);

module.exports = router;
