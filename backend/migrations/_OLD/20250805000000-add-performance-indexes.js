'use strict';

/**
 * Performance Optimization Migration
 *
 * This migration adds database indexes to optimize query performance.
 * Each index is carefully chosen based on actual query patterns in the application.
 *
 * Index Strategy:
 * - Single-column indexes for common WHERE clauses
 * - Composite indexes for frequent multi-column queries
 * - Covering indexes where possible to avoid table lookups
 *
 * Note: MySQL/MariaDB automatically creates indexes for foreign keys,
 * but we explicitly define some for clarity and to ensure they exist.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = async tableName => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const indexExists = async (tableName, indexName) => {
      try {
        const [indexes] = await queryInterface.sequelize.query(
          `SHOW INDEX FROM \`${tableName}\` WHERE Key_name = '${indexName}'`,
        );
        return indexes.length > 0;
      } catch {
        return false;
      }
    };

    const safeAddIndex = async (tableName, columns, options) => {
      const exists = await indexExists(tableName, options.name);
      if (exists) {
        console.log(`  ⏭️  Index ${options.name} already exists, skipping`);
        return;
      }

      const tableReady = await tableExists(tableName);
      if (!tableReady) {
        console.log(`  ⚠️  Table ${tableName} does not exist, skipping index ${options.name}`);
        return;
      }

      try {
        await queryInterface.addIndex(tableName, columns, options);
        console.log(`  ✅ Created index ${options.name}`);
      } catch (error) {
        console.log(`  ❌ Failed to create index ${options.name}: ${error.message}`);
      }
    };

    console.log('\n📊 Adding performance indexes...\n');

    // ===========================================
    // EMPLOYEES TABLE INDEXES
    // ===========================================
    console.log('👤 Employees table:');

    // employee_number is used for lookups - should be unique
    await safeAddIndex('employees', ['employee_number'], {
      name: 'idx_employees_employee_number',
      unique: true,
    });

    // name is used for search/filter
    await safeAddIndex('employees', ['name'], {
      name: 'idx_employees_name',
    });

    // monthlyConsumptionValue for sorting/filtering in reports
    await safeAddIndex('employees', ['monthlyConsumptionValue'], {
      name: 'idx_employees_consumption',
    });

    // ===========================================
    // PRODUCTS TABLE INDEXES
    // ===========================================
    console.log('\n📦 Products table:');

    // name is unique and used for lookups
    await safeAddIndex('products', ['name'], {
      name: 'idx_products_name',
      unique: true,
    });

    // price for range queries and sorting
    await safeAddIndex('products', ['price'], {
      name: 'idx_products_price',
    });

    // ===========================================
    // PURCHASES TABLE INDEXES
    // ===========================================
    console.log('\n🛒 Purchases table:');

    // employeeId for filtering purchases by employee
    await safeAddIndex('purchases', ['employeeId'], {
      name: 'idx_purchases_employee_id',
    });

    // userId for filtering purchases by user (ownership)
    await safeAddIndex('purchases', ['userId'], {
      name: 'idx_purchases_user_id',
    });

    // purchaseDate for date range queries (most common filter)
    await safeAddIndex('purchases', ['purchaseDate'], {
      name: 'idx_purchases_date',
    });

    // status for filtering by status
    await safeAddIndex('purchases', ['status'], {
      name: 'idx_purchases_status',
    });

    // Composite: employee + purchaseDate (common query pattern for reports)
    await safeAddIndex('purchases', ['employeeId', 'purchaseDate'], {
      name: 'idx_purchases_employee_date',
    });

    // Composite: user + status (common query for "my open purchases")
    await safeAddIndex('purchases', ['userId', 'status'], {
      name: 'idx_purchases_user_status',
    });

    // Composite: status + purchaseDate (for admin dashboards)
    await safeAddIndex('purchases', ['status', 'purchaseDate'], {
      name: 'idx_purchases_status_date',
    });

    // ===========================================
    // PURCHASE ITEMS TABLE INDEXES
    // ===========================================
    console.log('\n📋 purchase_items table:');

    // purchaseId for loading items by purchase
    await safeAddIndex('purchase_items', ['purchaseId'], {
      name: 'idx_purchase_items_purchase_id',
    });

    // productId for finding which purchases contain a product
    await safeAddIndex('purchase_items', ['productId'], {
      name: 'idx_purchase_items_product_id',
    });

    // Composite: purchase + product (for checking duplicates)
    await safeAddIndex('purchase_items', ['purchaseId', 'productId'], {
      name: 'idx_purchase_items_purchase_product',
    });

    // ===========================================
    // USERS TABLE INDEXES
    // ===========================================
    console.log('\n👥 Users table:');

    // email should already be unique from model definition
    // but let's ensure index exists
    await safeAddIndex('users', ['email'], {
      name: 'idx_users_email',
      unique: true,
    });

    // role for RBAC queries
    await safeAddIndex('users', ['role'], {
      name: 'idx_users_role',
    });

    // isActive for filtering active users
    await safeAddIndex('users', ['isActive'], {
      name: 'idx_users_active',
    });

    // Composite: role + isActive (common admin query)
    await safeAddIndex('users', ['role', 'isActive'], {
      name: 'idx_users_role_active',
    });

    // lastLogin for "recently active" queries
    await safeAddIndex('users', ['lastLogin'], {
      name: 'idx_users_last_login',
    });

    // lockoutUntil for login security checks
    await safeAddIndex('users', ['lockoutUntil'], {
      name: 'idx_users_lockout',
    });

    // ===========================================
    // AUDIT LOGS TABLE INDEXES
    // (Some may exist from model definition)
    // ===========================================
    console.log('\n📝 AuditLogs table:');

    await safeAddIndex('audit_logs', ['userId'], {
      name: 'idx_audit_logs_user_id',
    });

    await safeAddIndex('audit_logs', ['action'], {
      name: 'idx_audit_logs_action',
    });

    await safeAddIndex('audit_logs', ['resource'], {
      name: 'idx_audit_logs_resource',
    });

    await safeAddIndex('audit_logs', ['resourceId'], {
      name: 'idx_audit_logs_resource_id',
    });

    await safeAddIndex('audit_logs', ['timestamp'], {
      name: 'idx_audit_logs_timestamp',
    });

    await safeAddIndex('audit_logs', ['requestId'], {
      name: 'idx_audit_logs_request_id',
    });

    // Composite for common audit queries
    await safeAddIndex('audit_logs', ['resource', 'resourceId'], {
      name: 'idx_audit_logs_resource_full',
    });

    await safeAddIndex('audit_logs', ['userId', 'timestamp'], {
      name: 'idx_audit_logs_user_timestamp',
    });

    await safeAddIndex('audit_logs', ['action', 'timestamp'], {
      name: 'idx_audit_logs_action_timestamp',
    });

    console.log('\n✨ Index migration complete!\n');
  },

  async down(queryInterface, Sequelize) {
    const safeRemoveIndex = async (tableName, indexName) => {
      try {
        await queryInterface.removeIndex(tableName, indexName);
        console.log(`  ✅ Removed index ${indexName}`);
      } catch (error) {
        console.log(`  ⏭️  Index ${indexName} doesn't exist or already removed`);
      }
    };

    console.log('\n🗑️  Removing performance indexes...\n');

    // Employees
    await safeRemoveIndex('employees', 'idx_employees_employee_number');
    await safeRemoveIndex('employees', 'idx_employees_name');
    await safeRemoveIndex('employees', 'idx_employees_consumption');

    // Products
    await safeRemoveIndex('products', 'idx_products_name');
    await safeRemoveIndex('products', 'idx_products_price');

    // Purchases
    await safeRemoveIndex('purchases', 'idx_purchases_employee_id');
    await safeRemoveIndex('purchases', 'idx_purchases_user_id');
    await safeRemoveIndex('purchases', 'idx_purchases_date');
    await safeRemoveIndex('purchases', 'idx_purchases_status');
    await safeRemoveIndex('purchases', 'idx_purchases_employee_date');
    await safeRemoveIndex('purchases', 'idx_purchases_user_status');
    await safeRemoveIndex('purchases', 'idx_purchases_status_date');

    // purchase_items
    await safeRemoveIndex('purchase_items', 'idx_purchase_items_purchase_id');
    await safeRemoveIndex('purchase_items', 'idx_purchase_items_product_id');
    await safeRemoveIndex('purchase_items', 'idx_purchase_items_purchase_product');

    // Users
    await safeRemoveIndex('users', 'idx_users_email');
    await safeRemoveIndex('users', 'idx_users_role');
    await safeRemoveIndex('users', 'idx_users_active');
    await safeRemoveIndex('users', 'idx_users_role_active');
    await safeRemoveIndex('users', 'idx_users_last_login');
    await safeRemoveIndex('users', 'idx_users_lockout');

    // Audit Logs
    await safeRemoveIndex('audit_logs', 'idx_audit_logs_user_id');
    await safeRemoveIndex('audit_logs', 'idx_audit_logs_action');
    await safeRemoveIndex('audit_logs', 'idx_audit_logs_resource');
    await safeRemoveIndex('audit_logs', 'idx_audit_logs_resource_id');
    await safeRemoveIndex('audit_logs', 'idx_audit_logs_timestamp');
    await safeRemoveIndex('audit_logs', 'idx_audit_logs_request_id');
    await safeRemoveIndex('audit_logs', 'idx_audit_logs_resource_full');
    await safeRemoveIndex('audit_logs', 'idx_audit_logs_user_timestamp');
    await safeRemoveIndex('audit_logs', 'idx_audit_logs_action_timestamp');

    console.log('\n✨ Index removal complete!\n');
  },
};
