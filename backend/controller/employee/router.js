const express = require('express');
const router = express.Router();
const { employees } = require('../../model');
const { validateBody, validateParams } = require('../../middleware/validation');
const {
  employeeSchemas,
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

const controller = require('../base/controller')(employees);

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
];

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

      const { count, rows } = await employees.findAndCountAll(queryOptions);
      res.status(200).json(paginatedResponse(rows, count, req.pagination));
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
  (req, res, next) => controller.create(req, res, next)
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
  (req, res, next) => controller.findRandom(req, res, next)
);

/**
 * @swagger
 * /employees:
 *   get:
 *     tags: [Employees]
 *     summary: Get all employees
 *     description: Returns a paginated list of employees (admin/manager only)
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
  paginatedController.findAll
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
  async (req, res, next) => {
    if (['admin', 'manager'].includes(req.user.role)) {
      return controller.findOne(req, res, next);
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Required role: admin or manager',
      },
    });
  }
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
  (req, res, next) => controller.update(req, res, next)
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
  (req, res, next) => controller.update(req, res, next)
);

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     tags: [Employees]
 *     summary: Delete an employee
 *     description: Deletes an employee (admin only)
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
 *         description: Employee deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: "Employee deleted successfully"
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
  (req, res, next) => controller.delete(req, res, next)
);

module.exports = router;
