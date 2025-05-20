/**
 * Product Service - Optimized Query Layer
 *
 * Handles all product-related database operations
 * with proper eager loading for purchase item data.
 */

const createError = require('http-errors');
const { Sequelize, Op } = require('sequelize');
const db = require('../model');

const { products: Product, purchaseItems: PurchaseItem, sequelize } = db;

/**
 * Include configurations for eager loading
 */
const INCLUDES = {
  // Include purchase items (for statistics)
  purchaseItems: {
    model: PurchaseItem,
    as: 'purchaseItems',
    attributes: ['id', 'quantity', 'purchaseId'],
  },
};

class ProductService {
  /**
   * Get paginated products
   *
   * @param {Object} options - Query options
   * @param {Object} options.where - Sequelize where clause
   * @param {Array} options.order - Sequelize order clause
   * @param {Object} options.pagination - { page, limit, skip }
   * @returns {Promise<{data: Array, count: number}>}
   */
  async findAll({ where = {}, order = [['id', 'ASC']], pagination }) {
    const { rows, count } = await Product.findAndCountAll({
      where,
      order,
      limit: pagination.limit,
      offset: pagination.skip,
      distinct: true,
      col: 'id',
    });

    return { data: rows, count };
  }

  /**
   * Get product by ID
   *
   * @param {number} id - Product ID
   * @param {Object} options - Query options
   * @param {boolean} options.includeStats - Include purchase statistics
   * @returns {Promise<Object>}
   */
  async findById(id, { includeStats = false } = {}) {
    const include = includeStats ? [INCLUDES.purchaseItems] : [];

    const product = await Product.findByPk(id, { include });

    if (!product) {
      throw createError(404, `Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Get product by name
   *
   * @param {string} name - Product name
   * @returns {Promise<Object>}
   */
  async findByName(name) {
    const product = await Product.findOne({
      where: { name },
    });

    if (!product) {
      throw createError(404, `Product "${name}" not found`);
    }

    return product;
  }

  /**
   * Get product with sales statistics
   *
   * @param {number} id - Product ID
   * @returns {Promise<Object>}
   */
  async findWithStats(id) {
    const product = await Product.findByPk(id, {
      include: [INCLUDES.purchaseItems],
    });

    if (!product) {
      throw createError(404, `Product with ID ${id} not found`);
    }

    // Calculate stats
    const items = product.purchaseItems || [];
    const stats = {
      totalOrders: items.length,
      totalQuantitySold: items.reduce((sum, item) => sum + item.quantity, 0),
      totalRevenue: items.reduce(
        (sum, item) => sum + item.quantity * parseFloat(product.price),
        0,
      ),
    };

    return {
      ...product.toJSON(),
      stats,
    };
  }

  /**
   * Get random product(s)
   *
   * @param {number} limit - Number of products to return
   * @returns {Promise<Array|Object>}
   */
  async findRandom(limit = 1) {
    const products = await Product.findAll({
      order: Sequelize.literal('RAND()'),
      limit,
    });

    if (products.length === 0) {
      throw createError(404, 'No products found');
    }

    return limit === 1 ? products[0] : products;
  }

  /**
   * Get products by price range
   *
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{data: Array, count: number}>}
   */
  async findByPriceRange(minPrice, maxPrice, pagination) {
    const where = {};

    if (minPrice !== undefined) {
      where.price = { ...where.price, [Op.gte]: minPrice };
    }
    if (maxPrice !== undefined) {
      where.price = { ...where.price, [Op.lte]: maxPrice };
    }

    const { rows, count } = await Product.findAndCountAll({
      where,
      order: [['price', 'ASC']],
      limit: pagination.limit,
      offset: pagination.skip,
    });

    return { data: rows, count };
  }

  /**
   * Create a new product
   *
   * @param {Object} data - Product data
   * @returns {Promise<Object>}
   */
  async create(data) {
    try {
      const product = await Product.create(data);
      return product;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw createError(409, 'Product with this name already exists');
      }
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        throw createError(400, `Validation failed: ${messages}`);
      }
      throw createError(500, `Failed to create product: ${error.message}`);
    }
  }

  /**
   * Update a product
   *
   * @param {number} id - Product ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const product = await Product.findByPk(id);

    if (!product) {
      throw createError(404, `Product with ID ${id} not found`);
    }

    try {
      await product.update(data);
      return product;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw createError(409, 'Product with this name already exists');
      }
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        throw createError(400, `Validation failed: ${messages}`);
      }
      throw createError(500, `Failed to update product: ${error.message}`);
    }
  }

  /**
   * Delete a product
   *
   * @param {number} id - Product ID
   * @returns {Promise<{deleted: boolean, id: number}>}
   */
  async delete(id) {
    const product = await Product.findByPk(id);

    if (!product) {
      throw createError(404, `Product with ID ${id} not found`);
    }

    // Check if product is in any purchase items
    const itemCount = await PurchaseItem.count({ where: { productId: id } });
    if (itemCount > 0) {
      throw createError(
        400,
        `Cannot delete product that appears in ${itemCount} purchase items`,
      );
    }

    await product.destroy();
    return { deleted: true, id };
  }

  /**
   * Bulk create products
   *
   * @param {Array} products - Array of product data
   * @returns {Promise<Array>}
   */
  async bulkCreate(products) {
    const transaction = await sequelize.transaction();

    try {
      const created = await Product.bulkCreate(products, {
        transaction,
        validate: true,
        individualHooks: false,
      });

      await transaction.commit();
      return created;
    } catch (error) {
      await transaction.rollback();

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw createError(409, 'One or more product names already exist');
      }
      throw createError(500, `Failed to bulk create products: ${error.message}`);
    }
  }

  /**
   * Update product prices in bulk
   * Optimized: Uses batch operations instead of N+1 individual queries
   *
   * @param {Array} updates - Array of { id, price }
   * @returns {Promise<Array>}
   */
  async bulkUpdatePrices(updates) {
    if (!updates || updates.length === 0) {
      return [];
    }

    const transaction = await sequelize.transaction();

    try {
      const ids = updates.map(u => u.id);

      // Build CASE statement for batch update - single query instead of N queries
      const caseStatements = updates
        .map(u => `WHEN ${parseInt(u.id)} THEN ${parseFloat(u.price)}`)
        .join(' ');

      await sequelize.query(
        `UPDATE products SET price = CASE id ${caseStatements} END, updatedAt = NOW() WHERE id IN (${ids.join(',')})`,
        { transaction }
      );

      // Fetch all updated products in single query
      const results = await Product.findAll({
        where: { id: ids },
        transaction
      });

      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      throw createError(500, `Failed to bulk update prices: ${error.message}`);
    }
  }

  /**
   * Search products by name
   *
   * @param {string} searchTerm - Search term
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{data: Array, count: number}>}
   */
  async search(searchTerm, pagination) {
    const { rows, count } = await Product.findAndCountAll({
      where: {
        name: { [Op.like]: `%${searchTerm}%` },
      },
      order: [['name', 'ASC']],
      limit: pagination.limit,
      offset: pagination.skip,
    });

    return { data: rows, count };
  }

  /**
   * Get popular products (most purchased)
   *
   * @param {number} limit - Number of products to return
   * @returns {Promise<Array>}
   */
  async findPopular(limit = 10) {
    const products = await Product.findAll({
      include: [
        {
          model: PurchaseItem,
          as: 'purchaseItems',
          attributes: [],
        },
      ],
      attributes: {
        include: [
          [
            Sequelize.fn('COUNT', Sequelize.col('purchaseItems.id')),
            'orderCount',
          ],
          [
            Sequelize.fn('SUM', Sequelize.col('purchaseItems.quantity')),
            'totalQuantity',
          ],
        ],
      },
      group: ['products.id'],
      order: [[Sequelize.literal('orderCount'), 'DESC']],
      limit,
      subQuery: false,
    });

    return products;
  }
}

module.exports = new ProductService();
