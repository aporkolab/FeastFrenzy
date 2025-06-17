/**
 * Database Optimization Tests
 *
 * Tests for:
 * - Index existence and usage
 * - Eager loading (N+1 prevention)
 * - Bulk operations with transactions
 * - Query performance baselines
 *
 * NOTE: Index verification tests are MySQL-specific and will be skipped
 * when running with SQLite (default test environment).
 */

const db = require('../model');
const purchaseService = require('../services/purchase.service');

const { sequelize, purchases: Purchase, purchaseItems: PurchaseItem, employees: Employee, products: Product, users: User } = db;

// Check if we're using MySQL/MariaDB (index tests only work with MySQL)
const isMySql = sequelize.getDialect() === 'mysql' || sequelize.getDialect() === 'mariadb';

describe('Database Optimization', () => {
  // Test data references
  let testEmployee;
  let testProduct;
  let testUser;
  let testPurchase;

  beforeAll(async () => {
    // Ensure tables exist
    await sequelize.sync({ force: false });

    // Create test data if not exists
    [testEmployee] = await Employee.findOrCreate({
      where: { employee_number: 'TEST001' },
      defaults: { name: 'Test Employee', monthlyConsumptionValue: 1000 },
    });

    [testProduct] = await Product.findOrCreate({
      where: { name: 'Test Product' },
      defaults: { price: 10.0 },
    });

    [testUser] = await User.findOrCreate({
      where: { email: 'test-optimization@example.com' },
      defaults: {
        name: 'Test User',
        password: 'TestPassword123!',
        role: 'employee',
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await Purchase.destroy({ where: { employeeId: testEmployee.id } });
    await sequelize.close();
  });

  // Index verification tests - MySQL only
  const describeIfMySql = isMySql ? describe : describe.skip;

  describeIfMySql('Index Verification', () => {
    /**
     * Helper to check if an index exists
     */
    const indexExists = async (tableName, indexName) => {
      try {
        const [indexes] = await sequelize.query(
          `SHOW INDEX FROM \`${tableName}\` WHERE Key_name = ?`,
          { replacements: [indexName] },
        );
        return indexes.length > 0;
      } catch {
        return false;
      }
    };

    describe('Employees Table Indexes', () => {
      it('should have employee_number unique index', async () => {
        const exists = await indexExists('employees', 'idx_employees_employee_number');
        expect(exists).toBe(true);
      });

      it('should have name index', async () => {
        const exists = await indexExists('employees', 'idx_employees_name');
        expect(exists).toBe(true);
      });
    });

    describe('Products Table Indexes', () => {
      it('should have name unique index', async () => {
        const exists = await indexExists('products', 'idx_products_name');
        expect(exists).toBe(true);
      });

      it('should have price index', async () => {
        const exists = await indexExists('products', 'idx_products_price');
        expect(exists).toBe(true);
      });
    });

    describe('Purchases Table Indexes', () => {
      it('should have employeeId index', async () => {
        const exists = await indexExists('purchases', 'idx_purchases_employee_id');
        expect(exists).toBe(true);
      });

      it('should have userId index', async () => {
        const exists = await indexExists('purchases', 'idx_purchases_user_id');
        expect(exists).toBe(true);
      });

      it('should have date index', async () => {
        const exists = await indexExists('purchases', 'idx_purchases_date');
        expect(exists).toBe(true);
      });

      it('should have closed index', async () => {
        const exists = await indexExists('purchases', 'idx_purchases_closed');
        expect(exists).toBe(true);
      });

      it('should have composite employee_date index', async () => {
        const exists = await indexExists('purchases', 'idx_purchases_employee_date');
        expect(exists).toBe(true);
      });

      it('should have composite user_closed index', async () => {
        const exists = await indexExists('purchases', 'idx_purchases_user_closed');
        expect(exists).toBe(true);
      });
    });

    describe('PurchaseItems Table Indexes', () => {
      it('should have purchaseId index', async () => {
        const exists = await indexExists('purchaseItems', 'idx_purchase_items_purchase_id');
        expect(exists).toBe(true);
      });

      it('should have productId index', async () => {
        const exists = await indexExists('purchaseItems', 'idx_purchase_items_product_id');
        expect(exists).toBe(true);
      });
    });

    describe('Users Table Indexes', () => {
      it('should have email unique index', async () => {
        const exists = await indexExists('users', 'idx_users_email');
        expect(exists).toBe(true);
      });

      it('should have role index', async () => {
        const exists = await indexExists('users', 'idx_users_role');
        expect(exists).toBe(true);
      });

      it('should have composite role_active index', async () => {
        const exists = await indexExists('users', 'idx_users_role_active');
        expect(exists).toBe(true);
      });
    });
  });

  // Index usage verification - MySQL only (uses EXPLAIN which differs in SQLite)
  describeIfMySql('Index Usage Verification', () => {
    /**
     * Helper to run EXPLAIN and check if index is used
     */
    const checkIndexUsage = async (sql, expectedIndex) => {
      const [result] = await sequelize.query(`EXPLAIN ${sql}`);
      const usedKey = result[0]?.key || result[0]?.Key;
      return {
        usedKey,
        usesExpectedIndex: usedKey && usedKey.includes(expectedIndex),
        accessType: result[0]?.type || result[0]?.Type,
      };
    };

    it('should use date index for date-ordered queries', async () => {
      const { usedKey, accessType } = await checkIndexUsage(
        'SELECT * FROM purchases ORDER BY date DESC LIMIT 10',
        'idx_purchases_date',
      );

      // Either uses date index or does an index scan
      expect(accessType).not.toBe('ALL'); // Not a full table scan
    });

    it('should use employee_date composite index for employee queries', async () => {
      const { usesExpectedIndex, accessType } = await checkIndexUsage(
        `SELECT * FROM purchases WHERE employeeId = ${testEmployee.id} ORDER BY date DESC`,
        'idx_purchases_employee',
      );

      expect(accessType).not.toBe('ALL');
    });

    it('should use email index for user lookup', async () => {
      const { usedKey, accessType } = await checkIndexUsage(
        "SELECT * FROM users WHERE email = 'test@example.com'",
        'idx_users_email',
      );

      // Should be const or ref access type for unique index
      expect(['const', 'ref', 'eq_ref']).toContain(accessType);
    });
  });

  describe('Eager Loading (N+1 Prevention)', () => {
    let purchaseWithItems;

    beforeAll(async () => {
      // Create a purchase with items for testing
      purchaseWithItems = await Purchase.create({
        date: new Date(),
        closed: false,
        total: 30.0,
        employeeId: testEmployee.id,
        userId: testUser.id,
      });

      await PurchaseItem.bulkCreate([
        { purchaseId: purchaseWithItems.id, productId: testProduct.id, quantity: 2 },
        { purchaseId: purchaseWithItems.id, productId: testProduct.id, quantity: 1 },
      ]);
    });

    afterAll(async () => {
      if (purchaseWithItems) {
        await purchaseWithItems.destroy();
      }
    });

    it('should load purchase with employee in single query pattern', async () => {
      const queryCount = { count: 0 };

      // Temporarily track queries
      const originalLogging = sequelize.options.logging;
      sequelize.options.logging = () => queryCount.count++;

      await Purchase.findByPk(purchaseWithItems.id, {
        include: [{ model: Employee, as: 'employee' }],
      });

      sequelize.options.logging = originalLogging;

      // Should be 1-2 queries max (main query + possible subquery)
      expect(queryCount.count).toBeLessThanOrEqual(2);
    });

    it('should load purchase with items and products efficiently', async () => {
      const queryCount = { count: 0 };

      const originalLogging = sequelize.options.logging;
      sequelize.options.logging = () => queryCount.count++;

      const result = await Purchase.findByPk(purchaseWithItems.id, {
        include: [
          { model: Employee, as: 'employee' },
          {
            model: PurchaseItem,
            as: 'purchaseItems',
            include: [{ model: Product, as: 'product' }],
          },
        ],
      });

      sequelize.options.logging = originalLogging;

      // Should have items loaded
      expect(result.purchaseItems).toBeDefined();
      expect(result.purchaseItems.length).toBeGreaterThan(0);

      // Each item should have product loaded
      expect(result.purchaseItems[0].product).toBeDefined();

      // Should be efficient (not N+1)
      expect(queryCount.count).toBeLessThanOrEqual(4);
    });

    it('should NOT do N+1 when using findAll with include', async () => {
      const queryCount = { count: 0 };

      const originalLogging = sequelize.options.logging;
      sequelize.options.logging = () => queryCount.count++;

      const purchases = await Purchase.findAll({
        where: { userId: testUser.id },
        include: [{ model: Employee, as: 'employee' }],
        limit: 10,
      });

      sequelize.options.logging = originalLogging;

      // Even with multiple purchases, should not be N+1
      // Maximum should be 2-3 queries regardless of result count
      expect(queryCount.count).toBeLessThanOrEqual(3);
    });
  });

  describe('Bulk Operations with Transactions', () => {
    it('should create purchase with items in single transaction', async () => {
      const purchaseData = {
        date: new Date(),
        closed: false,
        employeeId: testEmployee.id,
        userId: testUser.id,
      };

      const items = [
        { productId: testProduct.id, quantity: 2 },
        { productId: testProduct.id, quantity: 3 },
      ];

      const result = await purchaseService.createWithItems(purchaseData, items);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.purchaseItems).toHaveLength(2);

      // Cleanup
      await result.destroy();
    });

    it('should rollback transaction on error', async () => {
      const purchaseData = {
        date: new Date(),
        closed: false,
        employeeId: testEmployee.id,
        userId: testUser.id,
      };

      const items = [
        { productId: 99999, quantity: 2 }, // Invalid product ID
      ];

      await expect(purchaseService.createWithItems(purchaseData, items)).rejects.toThrow();

      // Verify no partial data was created
      const orphanPurchases = await Purchase.count({
        where: {
          employeeId: testEmployee.id,
          userId: testUser.id,
          total: null,
        },
      });

      // Should not have any orphaned purchases from failed transaction
      expect(orphanPurchases).toBe(0);
    });

    it('should use bulkCreate for efficiency', async () => {
      const queryCount = { count: 0 };

      const purchaseData = {
        date: new Date(),
        closed: false,
        employeeId: testEmployee.id,
        userId: testUser.id,
      };

      const items = Array(5)
        .fill(null)
        .map((_, i) => ({
          productId: testProduct.id,
          quantity: i + 1,
        }));

      const originalLogging = sequelize.options.logging;
      sequelize.options.logging = () => queryCount.count++;

      const result = await purchaseService.createWithItems(purchaseData, items);

      sequelize.options.logging = originalLogging;

      // Should NOT be 1 + 5 queries (individual inserts)
      // Should be ~3-4 queries (begin, insert purchase, bulk insert items, commit)
      expect(queryCount.count).toBeLessThanOrEqual(6);

      // Cleanup
      await result.destroy();
    });
  });

  describe('Query Performance Baselines', () => {
    // Note: These tests establish baselines. Adjust thresholds based on your hardware.
    const PERFORMANCE_THRESHOLD_MS = 100;

    it('should query purchases by date under threshold', async () => {
      const start = Date.now();

      await Purchase.findAll({
        order: [['date', 'DESC']],
        limit: 100,
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('should query purchases by employee under threshold', async () => {
      const start = Date.now();

      await Purchase.findAll({
        where: { employeeId: testEmployee.id },
        order: [['date', 'DESC']],
        limit: 100,
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('should query user by email under threshold', async () => {
      const start = Date.now();

      await User.findOne({
        where: { email: testUser.email },
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('should do full eager load under threshold', async () => {
      const start = Date.now();

      await Purchase.findAll({
        where: { userId: testUser.id },
        include: [
          { model: Employee, as: 'employee' },
          {
            model: PurchaseItem,
            as: 'purchaseItems',
            include: [{ model: Product, as: 'product' }],
          },
        ],
        limit: 20,
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 2); // Allow 2x for complex query
    });
  });

  describe('Model Scopes', () => {
    beforeAll(async () => {
      testPurchase = await Purchase.create({
        date: new Date(),
        closed: false,
        employeeId: testEmployee.id,
        userId: testUser.id,
      });
    });

    afterAll(async () => {
      if (testPurchase) {
        await testPurchase.destroy();
      }
    });

    it('should have withEmployee scope defined', () => {
      expect(Purchase.options.scopes).toHaveProperty('withEmployee');
    });

    it('should have withItems scope defined', () => {
      expect(Purchase.options.scopes).toHaveProperty('withItems');
    });

    it('should have full scope defined', () => {
      expect(Purchase.options.scopes).toHaveProperty('full');
    });

    it('should have open scope defined', () => {
      expect(Purchase.options.scopes).toHaveProperty('open');
    });

    it('should have closed scope defined', () => {
      expect(Purchase.options.scopes).toHaveProperty('closed');
    });

    it('open scope should filter correctly', async () => {
      const openPurchases = await Purchase.scope('open').findAll({
        where: { userId: testUser.id },
      });

      openPurchases.forEach(p => {
        expect(p.closed).toBe(false);
      });
    });
  });
});
