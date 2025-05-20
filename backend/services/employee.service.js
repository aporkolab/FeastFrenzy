/**
 * Employee Service - Optimized Query Layer
 *
 * Handles all employee-related database operations
 * with proper eager loading for purchase data.
 *
 * SOFT DELETE: Employees are never physically deleted.
 * The paranoid mode in Sequelize handles this automatically.
 */

const createError = require('http-errors');
const { Sequelize, Op } = require('sequelize');
const db = require('../model');

const { employees: Employee, purchases: Purchase, sequelize } = db;

/**
 * Include configurations for eager loading
 */
const INCLUDES = {
  // Include purchases summary
  purchases: {
    model: Purchase,
    as: 'purchases',
    attributes: ['id', 'date', 'total', 'closed'],
  },

  // Include only open purchases
  openPurchases: {
    model: Purchase,
    as: 'purchases',
    attributes: ['id', 'date', 'total'],
    where: { closed: false },
    required: false,
  },
};

class EmployeeService {
  /**
   * Get paginated employees (excludes soft-deleted by default)
   *
   * @param {Object} options - Query options
   * @param {Object} options.where - Sequelize where clause
   * @param {Array} options.order - Sequelize order clause
   * @param {Object} options.pagination - { page, limit, skip }
   * @param {boolean} options.includeDeleted - Include soft-deleted records
   * @returns {Promise<{data: Array, count: number}>}
   */
  async findAll({ where = {}, order = [['id', 'ASC']], pagination, includeDeleted = false }) {
    const { rows, count } = await Employee.findAndCountAll({
      where,
      order,
      limit: pagination.limit,
      offset: pagination.skip,
      distinct: true,
      col: 'id',
      paranoid: !includeDeleted,
    });

    return { data: rows, count };
  }

  /**
   * Get employee by ID
   *
   * @param {number} id - Employee ID
   * @param {Object} options - Query options
   * @param {boolean} options.includePurchases - Include purchase history
   * @param {boolean} options.includeDeleted - Include if soft-deleted
   * @returns {Promise<Object>}
   */
  async findById(id, { includePurchases = false, includeDeleted = false } = {}) {
    const include = includePurchases ? [INCLUDES.purchases] : [];

    const employee = await Employee.findByPk(id, {
      include,
      paranoid: !includeDeleted,
    });

    if (!employee) {
      throw createError(404, `Employee with ID ${id} not found`);
    }

    return employee;
  }

  /**
   * Get employee by employee_number (unique identifier)
   *
   * @param {string} employeeNumber - Employee number
   * @param {boolean} includeDeleted - Include if soft-deleted
   * @returns {Promise<Object>}
   */
  async findByEmployeeNumber(employeeNumber, includeDeleted = false) {
    const employee = await Employee.findOne({
      where: { employee_number: employeeNumber },
      paranoid: !includeDeleted,
    });

    if (!employee) {
      throw createError(404, `Employee with number ${employeeNumber} not found`);
    }

    return employee;
  }

  /**
   * Get employee with purchase statistics
   * Useful for employee reports
   *
   * @param {number} id - Employee ID
   * @returns {Promise<Object>}
   */
  async findWithStats(id) {
    const employee = await Employee.findByPk(id, {
      include: [INCLUDES.purchases],
    });

    if (!employee) {
      throw createError(404, `Employee with ID ${id} not found`);
    }

    // Calculate stats
    const purchases = employee.purchases || [];
    const stats = {
      totalPurchases: purchases.length,
      openPurchases: purchases.filter(p => !p.closed).length,
      closedPurchases: purchases.filter(p => p.closed).length,
      totalSpent: purchases.reduce((sum, p) => sum + parseFloat(p.total || 0), 0),
      remainingAllowance:
        employee.monthlyConsumptionValue -
        purchases
          .filter(p => !p.closed)
          .reduce((sum, p) => sum + parseFloat(p.total || 0), 0),
    };

    return {
      ...employee.toJSON(),
      stats,
    };
  }

  /**
   * Get random employee(s)
   *
   * @param {number} limit - Number of employees to return
   * @returns {Promise<Array>}
   */
  async findRandom(limit = 1) {
    const employees = await Employee.findAll({
      order: Sequelize.literal('RAND()'),
      limit,
    });

    if (employees.length === 0) {
      throw createError(404, 'No employees found');
    }

    return limit === 1 ? employees[0] : employees;
  }

  /**
   * Get all soft-deleted employees (for admin restore functionality)
   *
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{data: Array, count: number}>}
   */
  async findDeleted(pagination) {
    const { rows, count } = await Employee.findAndCountAll({
      where: {
        deletedAt: { [Op.ne]: null },
      },
      paranoid: false,
      order: [['deletedAt', 'DESC']],
      limit: pagination.limit,
      offset: pagination.skip,
    });

    return { data: rows, count };
  }

  /**
   * Create a new employee
   *
   * @param {Object} data - Employee data
   * @returns {Promise<Object>}
   */
  async create(data) {
    try {
      const employee = await Employee.create(data);
      return employee;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw createError(409, 'Employee with this employee number already exists');
      }
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        throw createError(400, `Validation failed: ${messages}`);
      }
      throw createError(500, `Failed to create employee: ${error.message}`);
    }
  }

  /**
   * Update an employee
   *
   * @param {number} id - Employee ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const employee = await Employee.findByPk(id);

    if (!employee) {
      throw createError(404, `Employee with ID ${id} not found`);
    }

    try {
      await employee.update(data);
      return employee;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw createError(409, 'Employee with this employee number already exists');
      }
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        throw createError(400, `Validation failed: ${messages}`);
      }
      throw createError(500, `Failed to update employee: ${error.message}`);
    }
  }

  /**
   * Soft delete an employee
   *
   * NOTE: This is a SOFT DELETE. The employee record is NOT physically deleted.
   * - Sets deletedAt timestamp
   * - Employee won't appear in normal queries
   * - Purchases retain reference for audit trail
   * - Can be restored with restore() method
   *
   * @param {number} id - Employee ID
   * @returns {Promise<{deleted: boolean, id: number}>}
   */
  async delete(id) {
    const employee = await Employee.findByPk(id);

    if (!employee) {
      throw createError(404, `Employee with ID ${id} not found`);
    }

    // Soft delete - Sequelize paranoid mode handles this
    await employee.destroy();

    return { deleted: true, id, softDeleted: true };
  }

  /**
   * Restore a soft-deleted employee
   *
   * @param {number} id - Employee ID
   * @returns {Promise<Object>}
   */
  async restore(id) {
    const employee = await Employee.findByPk(id, { paranoid: false });

    if (!employee) {
      throw createError(404, `Employee with ID ${id} not found`);
    }

    if (!employee.deletedAt) {
      throw createError(400, `Employee with ID ${id} is not deleted`);
    }

    await employee.restore();
    return employee;
  }

  /**
   * Permanently delete an employee (DANGER - use with caution)
   * Only works if employee has no purchases
   *
   * @param {number} id - Employee ID
   * @returns {Promise<{deleted: boolean, id: number}>}
   */
  async hardDelete(id) {
    const employee = await Employee.findByPk(id, { paranoid: false });

    if (!employee) {
      throw createError(404, `Employee with ID ${id} not found`);
    }

    // Check for existing purchases - cannot hard delete with purchases
    const purchaseCount = await Purchase.count({ where: { employeeId: id } });
    if (purchaseCount > 0) {
      throw createError(
        400,
        `Cannot permanently delete employee with ${purchaseCount} existing purchases. Use soft delete instead.`,
      );
    }

    await employee.destroy({ force: true });
    return { deleted: true, id, hardDeleted: true };
  }

  /**
   * Bulk create employees
   *
   * @param {Array} employees - Array of employee data
   * @returns {Promise<Array>}
   */
  async bulkCreate(employees) {
    const transaction = await sequelize.transaction();

    try {
      const created = await Employee.bulkCreate(employees, {
        transaction,
        validate: true,
        individualHooks: false,
      });

      await transaction.commit();
      return created;
    } catch (error) {
      await transaction.rollback();

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw createError(409, 'One or more employee numbers already exist');
      }
      throw createError(500, `Failed to bulk create employees: ${error.message}`);
    }
  }

  /**
   * Search employees by name
   *
   * @param {string} searchTerm - Search term
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{data: Array, count: number}>}
   */
  async search(searchTerm, pagination) {
    const { rows, count } = await Employee.findAndCountAll({
      where: {
        name: { [Op.like]: `%${searchTerm}%` },
      },
      order: [['name', 'ASC']],
      limit: pagination.limit,
      offset: pagination.skip,
    });

    return { data: rows, count };
  }
}

module.exports = new EmployeeService();
