'use strict';

/**
 * Migration: Fix purchases table schema mismatch
 *
 * Problem: The model uses different column names than what exists in the database.
 * - Model uses: date, total, closed
 * - Migration created: purchaseDate, totalAmount, status (ENUM)
 *
 * Solution: Rename columns and convert status ENUM to closed BOOLEAN
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Add new columns first
      await queryInterface.addColumn('purchases', 'date', {
        type: Sequelize.DATE,
        allowNull: true, // Temporarily allow null for data migration
      }, { transaction });

      await queryInterface.addColumn('purchases', 'total', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('purchases', 'closed', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      }, { transaction });

      // 2. Migrate data from old columns to new columns
      await queryInterface.sequelize.query(
        `UPDATE purchases SET 
          date = purchaseDate,
          total = totalAmount,
          closed = CASE 
            WHEN status = 'completed' THEN TRUE 
            WHEN status = 'cancelled' THEN TRUE
            ELSE FALSE 
          END`,
        { transaction },
      );

      // 3. Make new columns NOT NULL after data migration
      await queryInterface.changeColumn('purchases', 'date', {
        type: Sequelize.DATE,
        allowNull: false,
      }, { transaction });

      await queryInterface.changeColumn('purchases', 'closed', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      }, { transaction });

      // 4. Drop old columns
      await queryInterface.removeColumn('purchases', 'purchaseDate', { transaction });
      await queryInterface.removeColumn('purchases', 'totalAmount', { transaction });
      await queryInterface.removeColumn('purchases', 'status', { transaction });

      // 5. Add indexes for new columns
      await queryInterface.addIndex('purchases', ['date'], {
        name: 'idx_purchases_date',
        transaction,
      });

      await queryInterface.addIndex('purchases', ['closed'], {
        name: 'idx_purchases_closed',
        transaction,
      });

      await queryInterface.addIndex('purchases', ['employeeId', 'date'], {
        name: 'idx_purchases_employee_date',
        transaction,
      });

      await queryInterface.addIndex('purchases', ['closed', 'date'], {
        name: 'idx_purchases_closed_date',
        transaction,
      });

      await transaction.commit();
      console.log('✅ Purchases schema migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Purchases schema migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Add back old columns
      await queryInterface.addColumn('purchases', 'purchaseDate', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('purchases', 'totalAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      }, { transaction });

      await queryInterface.addColumn('purchases', 'status', {
        type: Sequelize.ENUM('pending', 'completed', 'cancelled'),
        allowNull: true,
        defaultValue: 'pending',
      }, { transaction });

      // 2. Migrate data back
      await queryInterface.sequelize.query(
        `UPDATE purchases SET 
          purchaseDate = date,
          totalAmount = COALESCE(total, 0),
          status = CASE 
            WHEN closed = TRUE THEN 'completed' 
            ELSE 'pending' 
          END`,
        { transaction },
      );

      // 3. Make old columns NOT NULL
      await queryInterface.changeColumn('purchases', 'purchaseDate', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }, { transaction });

      await queryInterface.changeColumn('purchases', 'totalAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      }, { transaction });

      await queryInterface.changeColumn('purchases', 'status', {
        type: Sequelize.ENUM('pending', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      }, { transaction });

      // 4. Remove new indexes first
      await queryInterface.removeIndex('purchases', 'idx_purchases_date', { transaction });
      await queryInterface.removeIndex('purchases', 'idx_purchases_closed', { transaction });
      await queryInterface.removeIndex('purchases', 'idx_purchases_employee_date', { transaction });
      await queryInterface.removeIndex('purchases', 'idx_purchases_closed_date', { transaction });

      // 5. Drop new columns
      await queryInterface.removeColumn('purchases', 'date', { transaction });
      await queryInterface.removeColumn('purchases', 'total', { transaction });
      await queryInterface.removeColumn('purchases', 'closed', { transaction });

      await transaction.commit();
      console.log('✅ Purchases schema rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Purchases schema rollback failed:', error);
      throw error;
    }
  },
};
