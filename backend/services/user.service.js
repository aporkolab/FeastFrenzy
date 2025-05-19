/**
 * User Service - Optimized Query Layer
 *
 * Handles all user-related database operations
 * with proper eager loading for purchase data.
 */

const createError = require('http-errors');
const { Op } = require('sequelize');
const db = require('../model');

const { users: User, purchases: Purchase, sequelize } = db;

/**
 * Include configurations for eager loading
 */
const INCLUDES = {
  // Include user's purchases (for admin reports)
  purchases: {
    model: Purchase,
    as: 'purchases',
    attributes: ['id', 'date', 'total', 'closed', 'employeeId'],
  },
};

class UserService {
  /**
   * Get paginated users
   *
   * @param {Object} options - Query options
   * @param {Object} options.where - Sequelize where clause
   * @param {Array} options.order - Sequelize order clause
   * @param {Object} options.pagination - { page, limit, skip }
   * @returns {Promise<{data: Array, count: number}>}
   */
  async findAll({ where = {}, order = [['id', 'ASC']], pagination }) {
    const { rows, count } = await User.findAndCountAll({
      where,
      order,
      limit: pagination.limit,
      offset: pagination.skip,
      attributes: { exclude: ['password', 'refreshToken', 'passwordResetToken', 'passwordResetExpires'] },
    });

    return { data: rows, count };
  }

  /**
   * Get user by ID
   *
   * @param {number} id - User ID
   * @param {Object} options - Query options
   * @param {boolean} options.includePurchases - Include purchase history
   * @returns {Promise<Object>}
   */
  async findById(id, { includePurchases = false } = {}) {
    const include = includePurchases ? [INCLUDES.purchases] : [];

    const user = await User.findByPk(id, {
      include,
      attributes: { exclude: ['password', 'refreshToken', 'passwordResetToken', 'passwordResetExpires'] },
    });

    if (!user) {
      throw createError(404, `User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Get user by email
   *
   * @param {string} email - User email
   * @param {boolean} includePassword - Include password for auth
   * @returns {Promise<Object>}
   */
  async findByEmail(email, includePassword = false) {
    const attributes = includePassword
      ? undefined
      : { exclude: ['password', 'refreshToken', 'passwordResetToken', 'passwordResetExpires'] };

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      attributes,
    });

    return user;
  }

  /**
   * Get user with activity statistics
   *
   * @param {number} id - User ID
   * @returns {Promise<Object>}
   */
  async findWithStats(id) {
    const user = await User.findByPk(id, {
      include: [INCLUDES.purchases],
      attributes: { exclude: ['password', 'refreshToken', 'passwordResetToken', 'passwordResetExpires'] },
    });

    if (!user) {
      throw createError(404, `User with ID ${id} not found`);
    }

    // Calculate stats
    const purchases = user.purchases || [];
    const stats = {
      totalPurchases: purchases.length,
      openPurchases: purchases.filter(p => !p.closed).length,
      closedPurchases: purchases.filter(p => p.closed).length,
      totalValue: purchases.reduce((sum, p) => sum + parseFloat(p.total || 0), 0),
    };

    const result = user.toJSON();
    result.stats = stats;

    return result;
  }

  /**
   * Get active users
   *
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{data: Array, count: number}>}
   */
  async findActive(pagination) {
    const { rows, count } = await User.findAndCountAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
      limit: pagination.limit,
      offset: pagination.skip,
      attributes: { exclude: ['password', 'refreshToken', 'passwordResetToken', 'passwordResetExpires'] },
    });

    return { data: rows, count };
  }

  /**
   * Get users by role
   *
   * @param {string} role - User role
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{data: Array, count: number}>}
   */
  async findByRole(role, pagination) {
    const { rows, count } = await User.findAndCountAll({
      where: { role },
      order: [['name', 'ASC']],
      limit: pagination.limit,
      offset: pagination.skip,
      attributes: { exclude: ['password', 'refreshToken', 'passwordResetToken', 'passwordResetExpires'] },
    });

    return { data: rows, count };
  }

  /**
   * Get locked out users
   *
   * @returns {Promise<Array>}
   */
  async findLockedOut() {
    const now = new Date();

    const users = await User.findAll({
      where: {
        lockoutUntil: { [Op.gt]: now },
      },
      attributes: ['id', 'email', 'name', 'lockoutUntil', 'failedLoginAttempts'],
      order: [['lockoutUntil', 'DESC']],
    });

    return users;
  }

  /**
   * Create a new user
   *
   * @param {Object} data - User data
   * @returns {Promise<Object>}
   */
  async create(data) {
    try {
      const user = await User.create(data);
      // Return without sensitive fields
      return this.findById(user.id);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw createError(409, 'User with this email already exists');
      }
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        throw createError(400, `Validation failed: ${messages}`);
      }
      throw createError(500, `Failed to create user: ${error.message}`);
    }
  }

  /**
   * Update a user
   *
   * @param {number} id - User ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const user = await User.findByPk(id);

    if (!user) {
      throw createError(404, `User with ID ${id} not found`);
    }

    try {
      await user.update(data);
      return this.findById(id);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw createError(409, 'User with this email already exists');
      }
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        throw createError(400, `Validation failed: ${messages}`);
      }
      throw createError(500, `Failed to update user: ${error.message}`);
    }
  }

  /**
   * Soft delete a user (deactivate)
   *
   * @param {number} id - User ID
   * @returns {Promise<{deactivated: boolean, id: number}>}
   */
  async deactivate(id) {
    const user = await User.findByPk(id);

    if (!user) {
      throw createError(404, `User with ID ${id} not found`);
    }

    await user.update({ isActive: false });
    return { deactivated: true, id };
  }

  /**
   * Reactivate a user
   *
   * @param {number} id - User ID
   * @returns {Promise<Object>}
   */
  async reactivate(id) {
    const user = await User.findByPk(id);

    if (!user) {
      throw createError(404, `User with ID ${id} not found`);
    }

    await user.update({ isActive: true });
    return this.findById(id);
  }

  /**
   * Hard delete a user
   *
   * @param {number} id - User ID
   * @returns {Promise<{deleted: boolean, id: number}>}
   */
  async delete(id) {
    const user = await User.findByPk(id);

    if (!user) {
      throw createError(404, `User with ID ${id} not found`);
    }

    // Check for existing purchases
    const purchaseCount = await Purchase.count({ where: { userId: id } });
    if (purchaseCount > 0) {
      throw createError(
        400,
        `Cannot delete user with ${purchaseCount} existing purchases. Deactivate instead.`,
      );
    }

    await user.destroy();
    return { deleted: true, id };
  }

  /**
   * Update last login timestamp
   *
   * @param {number} id - User ID
   * @returns {Promise<void>}
   */
  async updateLastLogin(id) {
    await User.update({ lastLogin: new Date() }, { where: { id } });
  }

  /**
   * Unlock a user account
   *
   * @param {number} id - User ID
   * @returns {Promise<Object>}
   */
  async unlock(id) {
    const user = await User.findByPk(id);

    if (!user) {
      throw createError(404, `User with ID ${id} not found`);
    }

    await user.update({
      lockoutUntil: null,
      failedLoginAttempts: 0,
    });

    return this.findById(id);
  }

  /**
   * Search users by name or email
   *
   * @param {string} searchTerm - Search term
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{data: Array, count: number}>}
   */
  async search(searchTerm, pagination) {
    const { rows, count } = await User.findAndCountAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { email: { [Op.like]: `%${searchTerm}%` } },
        ],
      },
      order: [['name', 'ASC']],
      limit: pagination.limit,
      offset: pagination.skip,
      attributes: { exclude: ['password', 'refreshToken', 'passwordResetToken', 'passwordResetExpires'] },
    });

    return { data: rows, count };
  }

  /**
   * Get user count by role
   *
   * @returns {Promise<Object>}
   */
  async countByRole() {
    const [results] = await sequelize.query(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE isActive = true
      GROUP BY role
    `);

    return results.reduce((acc, { role, count }) => {
      acc[role] = parseInt(count, 10);
      return acc;
    }, {});
  }
}

module.exports = new UserService();
