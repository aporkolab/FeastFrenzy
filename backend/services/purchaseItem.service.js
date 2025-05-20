/**
 * PurchaseItem Service - Optimized Query Layer
 *
 * Handles all purchase item-related database operations
 * with proper eager loading for product data.
 */

const createError = require('http-errors');
const { Sequelize } = require('sequelize');
const db = require('../model');

const {
  purchaseItems: PurchaseItem,
  products: Product,
  purchases: Purchase,
  sequelize,
} = db;

/**
 * Include configurations for eager loading
 */
const INCLUDES = {
  // Include product details
  product: {
    model: Product,
    as: 'product',
    attributes: ['id', 'name', 'price'],
  },

  // Include purchase details
  purchase: {
    model: Purchase,
    as: 'purchase',
    attributes: ['id', 'date', 'closed', 'employeeId'],
  },

  // Full include
  full: [
    {
      model: Product,
      as: 'product',
      attributes: ['id', 'name', 'price'],
    },
    {
      model: Purchase,
      as: 'purchase',
      attributes: ['id', 'date', 'closed', 'employeeId'],
    },
  ],
};

class PurchaseItemService {
  /**
   * Get paginated purchase items
   *
   * @param {Object} options - Query options
   * @param {Object} options.where - Sequelize where clause
   * @param {Array} options.order - Sequelize order clause
   * @param {Object} options.pagination - { page, limit, skip }
   * @param {boolean} options.includeProduct - Include product data
   * @returns {Promise<{data: Array, count: number}>}
   */
  async findAll({ where = {}, order = [['id', 'ASC']], pagination, includeProduct = true }) {
    const include = includeProduct ? [INCLUDES.product] : [];

    const { rows, count } = await PurchaseItem.findAndCountAll({
      where,
      order,
      limit: pagination.limit,
      offset: pagination.skip,
      include,
      distinct: true,
      col: 'id',
    });

    return { data: rows, count };
  }

  /**
   * Get purchase item by ID
   *
   * @param {number} id - PurchaseItem ID
   * @param {Object} options - Query options
   * @param {boolean} options.includeProduct - Include product data
   * @param {boolean} options.includePurchase - Include purchase data
   * @returns {Promise<Object>}
   */
  async findById(id, { includeProduct = true, includePurchase = false } = {}) {
    const include = [];
    if (includeProduct) {include.push(INCLUDES.product);}
    if (includePurchase) {include.push(INCLUDES.purchase);}

    const item = await PurchaseItem.findByPk(id, { include });

    if (!item) {
      throw createError(404, `Purchase item with ID ${id} not found`);
    }

    return item;
  }

  /**
   * Get purchase items by purchase ID
   *
   * @param {number} purchaseId - Purchase ID
   * @returns {Promise<Array>}
   */
  async findByPurchaseId(purchaseId) {
    const items = await PurchaseItem.findAll({
      where: { purchaseId },
      include: [INCLUDES.product],
      order: [['id', 'ASC']],
    });

    return items;
  }

  /**
   * Get purchase items by product ID
   *
   * @param {number} productId - Product ID
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{data: Array, count: number}>}
   */
  async findByProductId(productId, pagination) {
    const { rows, count } = await PurchaseItem.findAndCountAll({
      where: { productId },
      include: [INCLUDES.purchase],
      order: [['id', 'DESC']],
      limit: pagination.limit,
      offset: pagination.skip,
    });

    return { data: rows, count };
  }

  /**
   * Get random purchase item
   *
   * @returns {Promise<Object>}
   */
  async findRandom() {
    const item = await PurchaseItem.findOne({
      order: Sequelize.literal('RAND()'),
      include: [INCLUDES.product],
    });

    if (!item) {
      throw createError(404, 'No purchase items found');
    }

    return item;
  }

  /**
   * Create a new purchase item
   *
   * @param {Object} data - PurchaseItem data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const transaction = await sequelize.transaction();

    try {
      // Verify purchase exists and is not closed
      const purchase = await Purchase.findByPk(data.purchaseId, { transaction });
      if (!purchase) {
        throw createError(404, `Purchase with ID ${data.purchaseId} not found`);
      }
      if (purchase.closed) {
        throw createError(400, 'Cannot add items to a closed purchase');
      }

      // Verify product exists
      const product = await Product.findByPk(data.productId, { transaction });
      if (!product) {
        throw createError(404, `Product with ID ${data.productId} not found`);
      }

      const item = await PurchaseItem.create(data, { transaction });

      await transaction.commit();

      // Return with product included
      return this.findById(item.id);
    } catch (error) {
      await transaction.rollback();

      if (error.status) {
        throw error;
      }

      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        throw createError(400, `Validation failed: ${messages}`);
      }

      throw createError(500, `Failed to create purchase item: ${error.message}`);
    }
  }

  /**
   * Update a purchase item
   *
   * @param {number} id - PurchaseItem ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const transaction = await sequelize.transaction();

    try {
      const item = await PurchaseItem.findByPk(id, {
        include: [INCLUDES.purchase],
        transaction,
      });

      if (!item) {
        throw createError(404, `Purchase item with ID ${id} not found`);
      }

      // Check if purchase is closed
      if (item.purchase && item.purchase.closed) {
        throw createError(400, 'Cannot modify items in a closed purchase');
      }

      await item.update(data, { transaction });

      await transaction.commit();

      return this.findById(id);
    } catch (error) {
      await transaction.rollback();

      if (error.status) {
        throw error;
      }

      throw createError(500, `Failed to update purchase item: ${error.message}`);
    }
  }

  /**
   * Delete a purchase item
   *
   * @param {number} id - PurchaseItem ID
   * @returns {Promise<{deleted: boolean, id: number}>}
   */
  async delete(id) {
    const transaction = await sequelize.transaction();

    try {
      const item = await PurchaseItem.findByPk(id, {
        include: [INCLUDES.purchase],
        transaction,
      });

      if (!item) {
        throw createError(404, `Purchase item with ID ${id} not found`);
      }

      // Check if purchase is closed
      if (item.purchase && item.purchase.closed) {
        throw createError(400, 'Cannot delete items from a closed purchase');
      }

      await item.destroy({ transaction });

      await transaction.commit();

      return { deleted: true, id };
    } catch (error) {
      await transaction.rollback();

      if (error.status) {
        throw error;
      }

      throw createError(500, `Failed to delete purchase item: ${error.message}`);
    }
  }

  /**
   * Bulk create purchase items
   *
   * @param {number} purchaseId - Purchase ID
   * @param {Array} items - Array of { productId, quantity }
   * @returns {Promise<Array>}
   */
  async bulkCreate(purchaseId, items) {
    const transaction = await sequelize.transaction();

    try {
      // Verify purchase exists and is open
      const purchase = await Purchase.findByPk(purchaseId, { transaction });
      if (!purchase) {
        throw createError(404, `Purchase with ID ${purchaseId} not found`);
      }
      if (purchase.closed) {
        throw createError(400, 'Cannot add items to a closed purchase');
      }

      const itemsToCreate = items.map(item => ({
        purchaseId,
        productId: item.productId,
        quantity: item.quantity || 1,
      }));

      const created = await PurchaseItem.bulkCreate(itemsToCreate, {
        transaction,
        validate: true,
      });

      await transaction.commit();

      // Return with products included
      return this.findByPurchaseId(purchaseId);
    } catch (error) {
      await transaction.rollback();

      if (error.status) {
        throw error;
      }

      throw createError(500, `Failed to bulk create items: ${error.message}`);
    }
  }

  /**
   * Update quantity of a purchase item
   *
   * @param {number} id - PurchaseItem ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>}
   */
  async updateQuantity(id, quantity) {
    if (quantity < 1) {
      throw createError(400, 'Quantity must be at least 1');
    }

    return this.update(id, { quantity });
  }
}

module.exports = new PurchaseItemService();
