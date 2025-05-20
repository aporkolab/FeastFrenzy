/**
 * Purchase Service - Optimized Query Layer
 *
 * This service handles all purchase-related database operations
 * with proper eager loading to avoid N+1 query problems.
 *
 * Key optimizations:
 * - Eager loading for related entities (employee, items, products)
 * - Bulk operations with transactions
 * - Selective attribute loading
 * - Proper use of findAndCountAll for pagination
 */

const createError = require('http-errors');
const db = require('../model');

const { purchases: Purchase, purchaseItems: PurchaseItem, employees: Employee, products: Product, sequelize } = db;

/**
 * Include configurations for eager loading
 * Centralized to ensure consistency across queries
 */
const INCLUDES = {
  // Light include - just employee name
  employee: {
    model: Employee,
    as: 'employee',
    attributes: ['id', 'name', 'employee_number'],
  },

  // Include purchase items without product details
  itemsOnly: {
    model: PurchaseItem,
    as: 'purchaseItems',
    attributes: ['id', 'quantity', 'productId'],
  },

  // Include purchase items with product details
  itemsWithProducts: {
    model: PurchaseItem,
    as: 'purchaseItems',
    include: [
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price'],
      },
    ],
  },
};

class PurchaseService {
  /**
   * Get paginated purchases with optional eager loading
   *
   * @param {Object} options - Query options
   * @param {Object} options.where - Sequelize where clause
   * @param {Array} options.order - Sequelize order clause
   * @param {Object} options.pagination - { page, limit, skip }
   * @param {boolean} options.includeEmployee - Include employee data
   * @returns {Promise<{data: Array, count: number}>}
   */
  async findAll({ where = {}, order = [['date', 'DESC']], pagination, includeEmployee = true }) {
    const queryOptions = {
      where,
      order,
      limit: pagination.limit,
      offset: pagination.skip,
      // Use distinct for accurate count with includes
      distinct: true,
      col: 'id',
    };

    // Add employee include if requested
    if (includeEmployee) {
      queryOptions.include = [INCLUDES.employee];
    }

    const { rows, count } = await Purchase.findAndCountAll(queryOptions);

    return { data: rows, count };
  }

  /**
   * Get a single purchase by ID with full details
   *
   * @param {number} id - Purchase ID
   * @param {Object} options - Query options
   * @param {boolean} options.includeItems - Include purchase items
   * @param {boolean} options.includeEmployee - Include employee
   * @returns {Promise<Object>} - Purchase with related data
   */
  async findById(id, { includeItems = true, includeEmployee = true } = {}) {
    const include = [];

    if (includeEmployee) {
      include.push(INCLUDES.employee);
    }

    if (includeItems) {
      include.push(INCLUDES.itemsWithProducts);
    }

    const purchase = await Purchase.findByPk(id, { include });

    if (!purchase) {
      throw createError(404, `Purchase with ID ${id} not found`);
    }

    return purchase;
  }

  /**
   * Get purchase with items - optimized single query
   * Avoids N+1 by using eager loading
   *
   * @param {number} id - Purchase ID
   * @returns {Promise<Object>}
   */
  async findWithItems(id) {
    const purchase = await Purchase.findByPk(id, {
      include: [INCLUDES.employee, INCLUDES.itemsWithProducts],
    });

    if (!purchase) {
      throw createError(404, `Purchase with ID ${id} not found`);
    }

    return purchase;
  }

  /**
   * Create a purchase with items in a single transaction
   *
   * This is the proper way to handle multi-table inserts:
   * - All operations in a single transaction
   * - Bulk insert for items
   * - Automatic rollback on failure
   *
   * @param {Object} purchaseData - Purchase data (date, employeeId, userId, etc.)
   * @param {Array} items - Array of { productId, quantity }
   * @returns {Promise<Object>} - Created purchase with items
   */
  async createWithItems(purchaseData, items = []) {
    const transaction = await sequelize.transaction();

    try {
      // Create the purchase
      const purchase = await Purchase.create(purchaseData, { transaction });

      // If items provided, bulk create them
      if (items.length > 0) {
        // Prepare items with purchaseId
        const itemsToCreate = items.map(item => ({
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity || 1,
        }));

        // Bulk insert - single query for all items
        await PurchaseItem.bulkCreate(itemsToCreate, {
          transaction,
          validate: true,
        });
      }

      // Commit transaction
      await transaction.commit();

      // Return the complete purchase with items
      return this.findWithItems(purchase.id);
    } catch (error) {
      // Rollback on any error
      await transaction.rollback();

      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        throw createError(400, `Validation failed: ${messages}`);
      }

      if (error.name === 'SequelizeForeignKeyConstraintError') {
        throw createError(400, 'Invalid employee or product reference');
      }

      throw createError(500, `Failed to create purchase: ${error.message}`);
    }
  }

  /**
   * Update purchase and its items in a transaction
   *
   * @param {number} id - Purchase ID
   * @param {Object} purchaseData - Updated purchase data
   * @param {Array|null} items - New items array (replaces existing if provided)
   * @returns {Promise<Object>}
   */
  async updateWithItems(id, purchaseData, items = null) {
    const transaction = await sequelize.transaction();

    try {
      const purchase = await Purchase.findByPk(id, { transaction });

      if (!purchase) {
        await transaction.rollback();
        throw createError(404, `Purchase with ID ${id} not found`);
      }

      // Update purchase fields
      await purchase.update(purchaseData, { transaction });

      // If items array is provided, replace all items
      if (items !== null) {
        // Delete existing items
        await PurchaseItem.destroy({
          where: { purchaseId: id },
          transaction,
        });

        // Create new items
        if (items.length > 0) {
          const itemsToCreate = items.map(item => ({
            purchaseId: id,
            productId: item.productId,
            quantity: item.quantity || 1,
          }));

          await PurchaseItem.bulkCreate(itemsToCreate, {
            transaction,
            validate: true,
          });
        }
      }

      await transaction.commit();
      return this.findWithItems(id);
    } catch (error) {
      await transaction.rollback();

      if (error.status) {
        throw error;
      }

      throw createError(500, `Failed to update purchase: ${error.message}`);
    }
  }

  /**
   * Add items to an existing purchase
   *
   * @param {number} purchaseId - Purchase ID
   * @param {Array} items - Items to add
   * @returns {Promise<Object>}
   */
  async addItems(purchaseId, items) {
    const transaction = await sequelize.transaction();

    try {
      const purchase = await Purchase.findByPk(purchaseId, { transaction });

      if (!purchase) {
        await transaction.rollback();
        throw createError(404, `Purchase with ID ${purchaseId} not found`);
      }

      if (purchase.closed) {
        await transaction.rollback();
        throw createError(400, 'Cannot add items to a closed purchase');
      }

      const itemsToCreate = items.map(item => ({
        purchaseId,
        productId: item.productId,
        quantity: item.quantity || 1,
      }));

      await PurchaseItem.bulkCreate(itemsToCreate, {
        transaction,
        validate: true,
      });

      await transaction.commit();
      return this.findWithItems(purchaseId);
    } catch (error) {
      await transaction.rollback();

      if (error.status) {
        throw error;
      }

      throw createError(500, `Failed to add items: ${error.message}`);
    }
  }

  /**
   * Calculate and update purchase total
   * Based on sum of (item quantity * product price)
   *
   * @param {number} purchaseId - Purchase ID
   * @returns {Promise<Object>}
   */
  async recalculateTotal(purchaseId) {
    const transaction = await sequelize.transaction();

    try {
      // Get purchase with items and products in one query
      const purchase = await Purchase.findByPk(purchaseId, {
        include: [INCLUDES.itemsWithProducts],
        transaction,
      });

      if (!purchase) {
        await transaction.rollback();
        throw createError(404, `Purchase with ID ${purchaseId} not found`);
      }

      // Calculate total
      const total = purchase.purchaseItems.reduce((sum, item) => {
        const price = parseFloat(item.product?.price || 0);
        return sum + price * item.quantity;
      }, 0);

      // Update purchase total
      await purchase.update({ total: total.toFixed(2) }, { transaction });

      await transaction.commit();
      return this.findWithItems(purchaseId);
    } catch (error) {
      await transaction.rollback();

      if (error.status) {
        throw error;
      }

      throw createError(500, `Failed to recalculate total: ${error.message}`);
    }
  }

  /**
   * Close a purchase (mark as finalized)
   *
   * @param {number} purchaseId - Purchase ID
   * @returns {Promise<Object>}
   */
  async closePurchase(purchaseId) {
    const purchase = await Purchase.findByPk(purchaseId);

    if (!purchase) {
      throw createError(404, `Purchase with ID ${purchaseId} not found`);
    }

    if (purchase.closed) {
      throw createError(400, 'Purchase is already closed');
    }

    await purchase.update({ closed: true });
    return this.findWithItems(purchaseId);
  }

  /**
   * Get purchases by employee with aggregations
   * Useful for employee reports
   *
   * @param {number} employeeId - Employee ID
   * @param {Object} dateRange - { from, to }
   * @returns {Promise<Object>}
   */
  async getEmployeePurchaseSummary(employeeId, { from, to } = {}) {
    const where = { employeeId };

    if (from || to) {
      const { Op } = require('sequelize');
      where.date = {};
      if (from) {where.date[Op.gte] = from;}
      if (to) {where.date[Op.lte] = to;}
    }

    // Get purchases with items in a single query
    const purchases = await Purchase.findAll({
      where,
      include: [INCLUDES.itemsWithProducts],
      order: [['date', 'DESC']],
    });

    // Calculate aggregations
    const summary = {
      totalPurchases: purchases.length,
      openPurchases: purchases.filter(p => !p.closed).length,
      closedPurchases: purchases.filter(p => p.closed).length,
      totalAmount: purchases.reduce((sum, p) => sum + parseFloat(p.total || 0), 0),
      totalItems: purchases.reduce(
        (sum, p) =>
          sum + p.purchaseItems.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0,
      ),
      purchases,
    };

    return summary;
  }

  /**
   * Delete a purchase and its items (cascade)
   *
   * @param {number} id - Purchase ID
   * @returns {Promise<{deleted: boolean, id: number}>}
   */
  async delete(id) {
    const purchase = await Purchase.findByPk(id);

    if (!purchase) {
      throw createError(404, `Purchase with ID ${id} not found`);
    }

    // PurchaseItems will be deleted via CASCADE
    await purchase.destroy();

    return { deleted: true, id };
  }

  /**
   * Get aggregated spending summaries for ALL employees
   * Uses SQL GROUP BY for O(1) database operation instead of N+1 queries
   *
   * This is the optimized endpoint for the Employee Report page
   *
   * @param {Object} dateRange - { from, to }
   * @returns {Promise<Array<{employeeId: number, totalSpending: number}>>}
   */
  async getAllEmployeeSummaries({ from, to } = {}) {
    const { Op, fn, col, literal } = require('sequelize');

    const where = {};
    if (from || to) {
      where.date = {};
      if (from) { where.date[Op.gte] = from; }
      if (to) { where.date[Op.lte] = to; }
    }

    // Use raw SQL aggregation with GROUP BY for maximum performance
    // This is a single query that returns all employee summaries
    const summaries = await Purchase.findAll({
      attributes: [
        'employeeId',
        [fn('COALESCE', fn('SUM', col('total')), 0), 'totalSpending'],
        [fn('COUNT', col('id')), 'purchaseCount']
      ],
      where,
      group: ['employeeId'],
      raw: true
    });

    // Convert to a map format for easy frontend consumption
    return summaries.map(s => ({
      employeeId: s.employeeId,
      totalSpending: parseFloat(s.totalSpending) || 0,
      purchaseCount: parseInt(s.purchaseCount) || 0
    }));
  }
}

module.exports = new PurchaseService();
