'use strict';

/**
 * Migration: Add soft delete support to employees
 *
 * This enables enterprise-grade soft delete pattern:
 * - Employees are never physically deleted
 * - deletedAt timestamp marks "deleted" records
 * - Sequelize paranoid mode auto-filters deleted records
 * - Purchases retain reference to deleted employees for audit trail
 *
 * IDEMPOTENT: Safe to run multiple times
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding soft delete support to employees table...');

    // Helper to check if column exists
    const columnExists = async (table, column) => {
      const [results] = await queryInterface.sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = '${table}' 
         AND COLUMN_NAME = '${column}'`,
      );
      return results.length > 0;
    };

    // Helper to check if index exists
    const indexExists = async (table, indexName) => {
      const [results] = await queryInterface.sequelize.query(
        `SHOW INDEX FROM ${table} WHERE Key_name = '${indexName}'`,
      );
      return results.length > 0;
    };

    // Add createdAt column if not exists
    if (!(await columnExists('employees', 'createdAt'))) {
      await queryInterface.addColumn('employees', 'createdAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
      console.log('  ✅ Added createdAt column');
    } else {
      console.log('  ⏭️  createdAt column already exists');
    }

    // Add updatedAt column if not exists
    if (!(await columnExists('employees', 'updatedAt'))) {
      await queryInterface.addColumn('employees', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      });
      console.log('  ✅ Added updatedAt column');
    } else {
      console.log('  ⏭️  updatedAt column already exists');
    }

    // Add deletedAt column for soft delete if not exists
    if (!(await columnExists('employees', 'deletedAt'))) {
      await queryInterface.addColumn('employees', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
      console.log('  ✅ Added deletedAt column');
    } else {
      console.log('  ⏭️  deletedAt column already exists');
    }

    // Add index for soft delete queries if not exists
    if (!(await indexExists('employees', 'idx_employees_deleted_at'))) {
      await queryInterface.addIndex('employees', ['deletedAt'], {
        name: 'idx_employees_deleted_at',
      });
      console.log('  ✅ Added idx_employees_deleted_at index');
    } else {
      console.log('  ⏭️  idx_employees_deleted_at index already exists');
    }

    // Backfill existing records with current timestamp
    await queryInterface.sequelize.query(
      'UPDATE employees SET createdAt = NOW(), updatedAt = NOW() WHERE createdAt IS NULL',
    );

    console.log('✅ Soft delete support ready on employees table');
  },

  async down(queryInterface, Sequelize) {
    console.log('Removing soft delete support from employees table...');

    // Helper to check if index exists
    const indexExists = async (table, indexName) => {
      const [results] = await queryInterface.sequelize.query(
        `SHOW INDEX FROM ${table} WHERE Key_name = '${indexName}'`,
      );
      return results.length > 0;
    };

    // Helper to check if column exists
    const columnExists = async (table, column) => {
      const [results] = await queryInterface.sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = '${table}' 
         AND COLUMN_NAME = '${column}'`,
      );
      return results.length > 0;
    };

    if (await indexExists('employees', 'idx_employees_deleted_at')) {
      await queryInterface.removeIndex('employees', 'idx_employees_deleted_at');
    }
    if (await columnExists('employees', 'deletedAt')) {
      await queryInterface.removeColumn('employees', 'deletedAt');
    }
    if (await columnExists('employees', 'updatedAt')) {
      await queryInterface.removeColumn('employees', 'updatedAt');
    }
    if (await columnExists('employees', 'createdAt')) {
      await queryInterface.removeColumn('employees', 'createdAt');
    }

    console.log('✅ Soft delete support removed from employees table');
  },
};
