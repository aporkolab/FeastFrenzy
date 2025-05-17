'use strict';

/**
 * Migration: Fix products and purchase_items schema
 *
 * Updates models to match existing DB columns OR removes unused columns
 * This migration REMOVES the unused columns from the DB to match the simplified models
 *
 * If you need these columns, update the models instead of running this migration!
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ============================================
      // PRODUCTS: Remove unused columns
      // ============================================

      // Check if columns exist before trying to remove them
      const [productsColumns] = await queryInterface.sequelize.query(
        'SHOW COLUMNS FROM products',
        { transaction },
      );
      const productColumnNames = productsColumns.map(c => c.Field);

      // Remove description if exists
      if (productColumnNames.includes('description')) {
        await queryInterface.removeColumn('products', 'description', { transaction });
        console.log('✅ Removed products.description');
      }

      // Remove category if exists
      if (productColumnNames.includes('category')) {
        await queryInterface.removeColumn('products', 'category', { transaction });
        console.log('✅ Removed products.category');
      }

      // Remove availability if exists
      if (productColumnNames.includes('availability')) {
        await queryInterface.removeColumn('products', 'availability', { transaction });
        console.log('✅ Removed products.availability');
      }

      // Remove timestamps if exists
      if (productColumnNames.includes('createdAt')) {
        await queryInterface.removeColumn('products', 'createdAt', { transaction });
        console.log('✅ Removed products.createdAt');
      }

      if (productColumnNames.includes('updatedAt')) {
        await queryInterface.removeColumn('products', 'updatedAt', { transaction });
        console.log('✅ Removed products.updatedAt');
      }

      // ============================================
      // PURCHASE_ITEMS: Remove unused columns
      // ============================================

      const [purchaseItemsColumns] = await queryInterface.sequelize.query(
        'SHOW COLUMNS FROM purchase_items',
        { transaction },
      );
      const purchaseItemColumnNames = purchaseItemsColumns.map(c => c.Field);

      // Remove unitPrice if exists
      if (purchaseItemColumnNames.includes('unitPrice')) {
        await queryInterface.removeColumn('purchase_items', 'unitPrice', { transaction });
        console.log('✅ Removed purchase_items.unitPrice');
      }

      // Remove totalPrice if exists
      if (purchaseItemColumnNames.includes('totalPrice')) {
        await queryInterface.removeColumn('purchase_items', 'totalPrice', { transaction });
        console.log('✅ Removed purchase_items.totalPrice');
      }

      // Remove timestamps if exists
      if (purchaseItemColumnNames.includes('createdAt')) {
        await queryInterface.removeColumn('purchase_items', 'createdAt', { transaction });
        console.log('✅ Removed purchase_items.createdAt');
      }

      if (purchaseItemColumnNames.includes('updatedAt')) {
        await queryInterface.removeColumn('purchase_items', 'updatedAt', { transaction });
        console.log('✅ Removed purchase_items.updatedAt');
      }

      await transaction.commit();
      console.log('✅ Schema cleanup migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Schema cleanup migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ============================================
      // PRODUCTS: Restore columns
      // ============================================

      await queryInterface.addColumn('products', 'description', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('products', 'category', {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'general',
      }, { transaction });

      await queryInterface.addColumn('products', 'availability', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      }, { transaction });

      await queryInterface.addColumn('products', 'createdAt', {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }, { transaction });

      await queryInterface.addColumn('products', 'updatedAt', {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }, { transaction });

      // ============================================
      // PURCHASE_ITEMS: Restore columns
      // ============================================

      await queryInterface.addColumn('purchase_items', 'unitPrice', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      }, { transaction });

      await queryInterface.addColumn('purchase_items', 'totalPrice', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      }, { transaction });

      await queryInterface.addColumn('purchase_items', 'createdAt', {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }, { transaction });

      await queryInterface.addColumn('purchase_items', 'updatedAt', {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }, { transaction });

      await transaction.commit();
      console.log('✅ Schema cleanup rollback completed');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Schema cleanup rollback failed:', error);
      throw error;
    }
  },
};
