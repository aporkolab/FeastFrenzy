'use strict';

/**
 * CONSOLIDATED INITIAL MIGRATION
 *
 * Creates all tables with the FINAL schema that matches the Sequelize models.
 * This is a clean slate - no legacy columns, no schema mismatches.
 *
 * Tables:
 * - employees (with soft delete)
 * - products (simplified: id, name, price only)
 * - purchases (simplified: id, employeeId, userId, date, total, closed)
 * - purchase_items (simplified: id, purchaseId, productId, quantity)
 * - users (with roles and refresh tokens)
 * - audit_logs
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚀 Creating FeastFrenzy database schema...\n');

    // ============================================
    // 1. EMPLOYEES TABLE
    // ============================================
    console.log('📦 Creating employees table...');
    await queryInterface.createTable('employees', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      employee_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      monthlyConsumptionValue: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Timestamps (required by model timestamps: true)
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      // Soft delete support (required by model paranoid: true)
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('employees', ['employee_number'], {
      unique: true,
      name: 'idx_employees_number',
    });
    await queryInterface.addIndex('employees', ['deletedAt'], {
      name: 'idx_employees_deleted',
    });
    await queryInterface.addIndex('employees', ['name'], {
      name: 'idx_employees_name',
    });

    // ============================================
    // 2. USERS TABLE
    // ============================================
    console.log('📦 Creating users table...');
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('admin', 'manager', 'employee'),
        allowNull: false,
        defaultValue: 'employee',
      },
      refreshToken: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'idx_users_email',
    });
    await queryInterface.addIndex('users', ['role'], {
      name: 'idx_users_role',
    });
    await queryInterface.addIndex('users', ['isActive'], {
      name: 'idx_users_active',
    });

    // ============================================
    // 3. PRODUCTS TABLE (SIMPLIFIED)
    // ============================================
    console.log('📦 Creating products table...');
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
    });

    await queryInterface.addIndex('products', ['name'], {
      unique: true,
      name: 'idx_products_name',
    });
    await queryInterface.addIndex('products', ['price'], {
      name: 'idx_products_price',
    });

    // ============================================
    // 4. PURCHASES TABLE (SIMPLIFIED)
    // ============================================
    console.log('📦 Creating purchases table...');
    await queryInterface.createTable('purchases', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      closed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });

    await queryInterface.addIndex('purchases', ['employeeId'], {
      name: 'idx_purchases_employee',
    });
    await queryInterface.addIndex('purchases', ['userId'], {
      name: 'idx_purchases_user',
    });
    await queryInterface.addIndex('purchases', ['date'], {
      name: 'idx_purchases_date',
    });
    await queryInterface.addIndex('purchases', ['closed'], {
      name: 'idx_purchases_closed',
    });
    await queryInterface.addIndex('purchases', ['employeeId', 'date'], {
      name: 'idx_purchases_employee_date',
    });

    // ============================================
    // 5. PURCHASE_ITEMS TABLE (SIMPLIFIED)
    // ============================================
    console.log('📦 Creating purchase_items table...');
    await queryInterface.createTable('purchase_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      purchaseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'purchases',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    });

    await queryInterface.addIndex('purchase_items', ['purchaseId'], {
      name: 'idx_purchase_items_purchase',
    });
    await queryInterface.addIndex('purchase_items', ['productId'], {
      name: 'idx_purchase_items_product',
    });
    await queryInterface.addIndex('purchase_items', ['purchaseId', 'productId'], {
      name: 'idx_purchase_items_purchase_product',
    });

    // ============================================
    // 6. AUDIT_LOGS TABLE
    // ============================================
    console.log('📦 Creating audit_logs table...');
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: {
        type: Sequelize.ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET', 'EXPORT'),
        allowNull: false,
      },
      resource: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      resourceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      oldValue: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      newValue: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      requestId: {
        type: Sequelize.STRING(36),
        allowNull: true,
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('audit_logs', ['userId'], {
      name: 'idx_audit_logs_user',
    });
    await queryInterface.addIndex('audit_logs', ['action'], {
      name: 'idx_audit_logs_action',
    });
    await queryInterface.addIndex('audit_logs', ['resource', 'resourceId'], {
      name: 'idx_audit_logs_resource',
    });
    await queryInterface.addIndex('audit_logs', ['timestamp'], {
      name: 'idx_audit_logs_timestamp',
    });

    console.log('\n✅ FeastFrenzy database schema created successfully!\n');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Dropping all tables...');

    // Drop in reverse order (respect foreign keys)
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('purchase_items');
    await queryInterface.dropTable('purchases');
    await queryInterface.dropTable('products');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('employees');

    console.log('✅ All tables dropped.');
  },
};
