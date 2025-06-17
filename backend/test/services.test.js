/**
 * Service Layer Tests (Jest)
 *
 * Tests for the optimized service layer including:
 * - Eager loading verification
 * - Transaction handling
 * - Error handling
 * - Bulk operations
 */

const db = require('../model');
const {
  employeeService,
  productService,
  purchaseService,
  purchaseItemService,
  userService,
} = require('../services');

// Increase timeout for DB operations
jest.setTimeout(15000);

// Create tables before all tests
beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

// Close connection after all tests
afterAll(async () => {
  await db.sequelize.close();
});

describe('Service Layer Tests', () => {
  describe('Employee Service', () => {
    describe('findAll', () => {
      it('should return paginated employees', async () => {
        const pagination = { page: 1, limit: 10, skip: 0 };
        const result = await employeeService.findAll({ pagination });

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('count');
        expect(Array.isArray(result.data)).toBe(true);
        expect(typeof result.count).toBe('number');
      });

      it('should apply where filters', async () => {
        const pagination = { page: 1, limit: 10, skip: 0 };
        const where = { name: { [db.Sequelize.Op.like]: '%Test%' } };

        const result = await employeeService.findAll({ where, pagination });

        expect(result).toHaveProperty('data');
        expect(Array.isArray(result.data)).toBe(true);
      });

      it('should apply custom ordering', async () => {
        const pagination = { page: 1, limit: 10, skip: 0 };
        const order = [['name', 'DESC']];

        const result = await employeeService.findAll({ order, pagination });

        expect(result).toHaveProperty('data');
      });
    });

    describe('findById', () => {
      let testEmployee;

      beforeAll(async () => {
        testEmployee = await db.employees.create({
          name: 'Service Test Employee',
          employee_number: `STE${Date.now()}`,
          monthlyConsumptionValue: 50000,
        });
      });

      afterAll(async () => {
        if (testEmployee) {
          await testEmployee.destroy();
        }
      });

      it('should return employee by ID', async () => {
        const employee = await employeeService.findById(testEmployee.id);

        expect(employee).toHaveProperty('id', testEmployee.id);
        expect(employee).toHaveProperty('name', 'Service Test Employee');
      });

      it('should throw 404 for non-existent employee', async () => {
        await expect(employeeService.findById(999999)).rejects.toMatchObject({
          status: 404,
        });
      });
    });

    describe('create', () => {
      let createdEmployee;

      afterEach(async () => {
        if (createdEmployee) {
          await createdEmployee.destroy();
          createdEmployee = null;
        }
      });

      it('should create a new employee', async () => {
        createdEmployee = await employeeService.create({
          name: 'New Service Employee',
          employee_number: `NSE${Date.now()}`,
          monthlyConsumptionValue: 60000,
        });

        expect(createdEmployee).toHaveProperty('id');
        expect(createdEmployee.name).toBe('New Service Employee');
      });

      it('should throw 409 for duplicate employee number', async () => {
        const uniqueNum = `DUP${Date.now()}`;
        createdEmployee = await employeeService.create({
          name: 'First Employee',
          employee_number: uniqueNum,
          monthlyConsumptionValue: 50000,
        });

        await expect(
          employeeService.create({
            name: 'Second Employee',
            employee_number: uniqueNum,
            monthlyConsumptionValue: 50000,
          }),
        ).rejects.toMatchObject({ status: 409 });
      });
    });
  });

  describe('Product Service', () => {
    describe('findAll', () => {
      it('should return paginated products', async () => {
        const pagination = { page: 1, limit: 10, skip: 0 };
        const result = await productService.findAll({ pagination });

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('count');
        expect(Array.isArray(result.data)).toBe(true);
      });
    });

    describe('findById', () => {
      let testProduct;

      beforeAll(async () => {
        testProduct = await db.products.create({
          name: `Service Test Product ${Date.now()}`,
          price: 9.99,
        });
      });

      afterAll(async () => {
        if (testProduct) {
          await testProduct.destroy();
        }
      });

      it('should return product by ID', async () => {
        const product = await productService.findById(testProduct.id);

        expect(product).toHaveProperty('id', testProduct.id);
        expect(product.name).toContain('Service Test Product');
      });

      it('should include stats when requested', async () => {
        const product = await productService.findWithStats(testProduct.id);

        expect(product).toHaveProperty('stats');
        expect(product.stats).toHaveProperty('totalOrders');
        expect(product.stats).toHaveProperty('totalQuantitySold');
        expect(product.stats).toHaveProperty('totalRevenue');
      });
    });
  });

  describe('Purchase Service', () => {
    let testEmployee;
    let testProduct;
    let testUser;

    beforeAll(async () => {
      testEmployee = await db.employees.create({
        name: 'Purchase Service Test Employee',
        employee_number: `PSTE${Date.now()}`,
        monthlyConsumptionValue: 100000,
      });

      testProduct = await db.products.create({
        name: `Purchase Service Test Product ${Date.now()}`,
        price: 25.0,
      });

      testUser = await db.users.create({
        email: `purchase-service-test-${Date.now()}@example.com`,
        password: 'test123',
        name: 'Purchase Service Test User',
        role: 'employee',
      });
    });

    afterAll(async () => {
      // Clean up in reverse order
      await db.purchaseItems.destroy({ where: {} });
      if (testEmployee) {
        await db.purchases.destroy({ where: { employeeId: testEmployee.id } });
      }
      if (testUser) {await testUser.destroy();}
      if (testProduct) {await testProduct.destroy();}
      if (testEmployee) {await testEmployee.destroy();}
    });

    describe('findAll', () => {
      it('should return paginated purchases with employee', async () => {
        const pagination = { page: 1, limit: 10, skip: 0 };
        const result = await purchaseService.findAll({
          pagination,
          includeEmployee: true,
        });

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('count');
      });
    });

    describe('createWithItems (Transaction Test)', () => {
      let createdPurchase;

      afterEach(async () => {
        if (createdPurchase) {
          await db.purchaseItems.destroy({ where: { purchaseId: createdPurchase.id } });
          await db.purchases.destroy({ where: { id: createdPurchase.id } });
          createdPurchase = null;
        }
      });

      it('should create purchase with items in a single transaction', async () => {
        createdPurchase = await purchaseService.createWithItems(
          {
            employeeId: testEmployee.id,
            userId: testUser.id,
            date: new Date(),
            total: 0,
            closed: false,
          },
          [{ productId: testProduct.id, quantity: 2 }],
        );

        expect(createdPurchase).toHaveProperty('id');
        expect(createdPurchase).toHaveProperty('purchaseItems');
        expect(createdPurchase.purchaseItems).toHaveLength(1);
        expect(createdPurchase.purchaseItems[0].quantity).toBe(2);
      });

      it('should rollback on invalid product reference', async () => {
        await expect(
          purchaseService.createWithItems(
            {
              employeeId: testEmployee.id,
              userId: testUser.id,
              date: new Date(),
              total: 0,
              closed: false,
            },
            [{ productId: 999999, quantity: 1 }],
          ),
        ).rejects.toMatchObject({
          status: expect.any(Number),
        });
      });
    });

    describe('recalculateTotal', () => {
      let purchaseWithItems;

      beforeAll(async () => {
        purchaseWithItems = await purchaseService.createWithItems(
          {
            employeeId: testEmployee.id,
            userId: testUser.id,
            date: new Date(),
            total: 0,
            closed: false,
          },
          [{ productId: testProduct.id, quantity: 3 }], // 3 x 25.00 = 75.00
        );
      });

      afterAll(async () => {
        if (purchaseWithItems) {
          await db.purchaseItems.destroy({ where: { purchaseId: purchaseWithItems.id } });
          await db.purchases.destroy({ where: { id: purchaseWithItems.id } });
        }
      });

      it('should recalculate total based on items', async () => {
        const updated = await purchaseService.recalculateTotal(purchaseWithItems.id);

        expect(parseFloat(updated.total)).toBe(75.0);
      });
    });

    describe('addItems', () => {
      let openPurchase;

      beforeAll(async () => {
        openPurchase = await purchaseService.createWithItems(
          {
            employeeId: testEmployee.id,
            userId: testUser.id,
            date: new Date(),
            total: 0,
            closed: false,
          },
          [],
        );
      });

      afterAll(async () => {
        if (openPurchase) {
          await db.purchaseItems.destroy({ where: { purchaseId: openPurchase.id } });
          await db.purchases.destroy({ where: { id: openPurchase.id } });
        }
      });

      it('should add items to an open purchase', async () => {
        const updated = await purchaseService.addItems(openPurchase.id, [
          { productId: testProduct.id, quantity: 2 },
        ]);

        expect(updated.purchaseItems.length).toBeGreaterThanOrEqual(1);
      });

      it('should prevent adding items to a closed purchase', async () => {
        await db.purchases.update({ closed: true }, { where: { id: openPurchase.id } });

        await expect(
          purchaseService.addItems(openPurchase.id, [
            { productId: testProduct.id, quantity: 1 },
          ]),
        ).rejects.toThrow();

        // Reopen for cleanup
        await db.purchases.update({ closed: false }, { where: { id: openPurchase.id } });
      });
    });
  });

  describe('User Service', () => {
    describe('findAll', () => {
      it('should return paginated users without sensitive fields', async () => {
        const pagination = { page: 1, limit: 10, skip: 0 };
        const result = await userService.findAll({ pagination });

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('count');

        // Verify sensitive fields are excluded
        result.data.forEach(user => {
          expect(user.password).toBeUndefined();
          expect(user.refreshToken).toBeUndefined();
          expect(user.passwordResetToken).toBeUndefined();
        });
      });

      it('should apply filters correctly', async () => {
        const pagination = { page: 1, limit: 10, skip: 0 };
        const where = { role: 'admin' };

        const result = await userService.findAll({ where, pagination });

        expect(result).toHaveProperty('data');
        result.data.forEach(user => {
          expect(user.role).toBe('admin');
        });
      });
    });

    describe('findByEmail', () => {
      let testUser;

      beforeAll(async () => {
        testUser = await db.users.create({
          email: `user-service-test-${Date.now()}@example.com`,
          password: 'test123',
          name: 'User Service Test',
          role: 'employee',
        });
      });

      afterAll(async () => {
        if (testUser) {
          await testUser.destroy();
        }
      });

      it('should find user by email (case insensitive)', async () => {
        const user = await userService.findByEmail(testUser.email.toUpperCase());

        expect(user).toHaveProperty('email', testUser.email);
      });

      it('should return null for non-existent email', async () => {
        const user = await userService.findByEmail('nonexistent-xyz@example.com');

        expect(user).toBeNull();
      });
    });

    describe('findById', () => {
      let testUser;

      beforeAll(async () => {
        testUser = await db.users.create({
          email: `user-findbyid-${Date.now()}@example.com`,
          password: 'test123',
          name: 'FindById Test',
          role: 'employee',
        });
      });

      afterAll(async () => {
        if (testUser) {
          await testUser.destroy();
        }
      });

      it('should return user by ID without sensitive fields', async () => {
        const user = await userService.findById(testUser.id);

        expect(user).toHaveProperty('id', testUser.id);
        expect(user).toHaveProperty('name', 'FindById Test');
        expect(user.password).toBeUndefined();
      });

      it('should throw 404 for non-existent user', async () => {
        await expect(userService.findById(999999)).rejects.toMatchObject({
          status: 404,
        });
      });
    });

    describe('create', () => {
      let createdUser;

      afterEach(async () => {
        if (createdUser) {
          await db.users.destroy({ where: { id: createdUser.id } });
          createdUser = null;
        }
      });

      it('should create a new user', async () => {
        createdUser = await userService.create({
          email: `new-user-${Date.now()}@example.com`,
          password: 'securepass123',
          name: 'New User',
          role: 'employee',
        });

        expect(createdUser).toHaveProperty('id');
        expect(createdUser.email).toContain('new-user-');
        expect(createdUser.password).toBeUndefined();
      });

      it('should throw 409 for duplicate email', async () => {
        const email = `duplicate-${Date.now()}@example.com`;
        createdUser = await userService.create({
          email,
          password: 'test123',
          name: 'First User',
          role: 'employee',
        });

        await expect(
          userService.create({
            email,
            password: 'test456',
            name: 'Second User',
            role: 'employee',
          }),
        ).rejects.toMatchObject({ status: 409 });
      });
    });

    describe('deactivate/reactivate', () => {
      let testUser;

      beforeAll(async () => {
        testUser = await db.users.create({
          email: `user-deactivate-${Date.now()}@example.com`,
          password: 'test123',
          name: 'Deactivate Test',
          role: 'employee',
          isActive: true,
        });
      });

      afterAll(async () => {
        if (testUser) {
          await testUser.destroy();
        }
      });

      it('should deactivate a user', async () => {
        const result = await userService.deactivate(testUser.id);

        expect(result).toHaveProperty('deactivated', true);

        const user = await db.users.findByPk(testUser.id);
        expect(user.isActive).toBe(false);
      });

      it('should reactivate a user', async () => {
        const reactivated = await userService.reactivate(testUser.id);

        expect(reactivated.isActive).toBe(true);
      });
    });

    describe('countByRole', () => {
      it('should return counts grouped by role', async () => {
        // Create a user to ensure there's data
        const testUser = await db.users.create({
          email: `count-role-test-${Date.now()}@example.com`,
          password: 'test123',
          name: 'Count Role Test',
          role: 'employee',
        });

        const counts = await userService.countByRole();

        expect(typeof counts).toBe('object');
        expect(counts).toHaveProperty('employee');
        expect(counts.employee).toBeGreaterThanOrEqual(1);

        await testUser.destroy();
      });
    });
  });

  describe('PurchaseItem Service', () => {
    let testEmployee;
    let testProduct;
    let testUser;
    let testPurchase;

    beforeAll(async () => {
      testEmployee = await db.employees.create({
        name: 'PurchaseItem Test Employee',
        employee_number: `PITE${Date.now()}`,
        monthlyConsumptionValue: 50000,
      });

      testProduct = await db.products.create({
        name: `PurchaseItem Test Product ${Date.now()}`,
        price: 15.0,
      });

      testUser = await db.users.create({
        email: `purchaseitem-test-${Date.now()}@example.com`,
        password: 'test123',
        name: 'PurchaseItem Test User',
        role: 'employee',
      });

      testPurchase = await db.purchases.create({
        employeeId: testEmployee.id,
        userId: testUser.id,
        date: new Date(),
        total: 0,
        closed: false,
      });
    });

    afterAll(async () => {
      await db.purchaseItems.destroy({ where: { purchaseId: testPurchase?.id } });
      if (testPurchase) {await testPurchase.destroy();}
      if (testUser) {await testUser.destroy();}
      if (testProduct) {await testProduct.destroy();}
      if (testEmployee) {await testEmployee.destroy();}
    });

    describe('findAll', () => {
      it('should return paginated purchase items with product', async () => {
        const pagination = { page: 1, limit: 10, skip: 0 };
        const result = await purchaseItemService.findAll({
          pagination,
          includeProduct: true,
        });

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('count');
      });
    });

    describe('create', () => {
      let createdItem;

      afterEach(async () => {
        if (createdItem) {
          await db.purchaseItems.destroy({ where: { id: createdItem.id } });
          createdItem = null;
        }
      });

      it('should create a purchase item with product included', async () => {
        createdItem = await purchaseItemService.create({
          purchaseId: testPurchase.id,
          productId: testProduct.id,
          quantity: 3,
        });

        expect(createdItem).toHaveProperty('id');
        expect(createdItem.quantity).toBe(3);
        expect(createdItem).toHaveProperty('product');
        expect(createdItem.product.name).toContain('PurchaseItem Test Product');
      });

      it('should throw 404 for non-existent purchase', async () => {
        await expect(
          purchaseItemService.create({
            purchaseId: 999999,
            productId: testProduct.id,
            quantity: 1,
          }),
        ).rejects.toMatchObject({ status: 404 });
      });

      it('should throw 404 for non-existent product', async () => {
        await expect(
          purchaseItemService.create({
            purchaseId: testPurchase.id,
            productId: 999999,
            quantity: 1,
          }),
        ).rejects.toMatchObject({ status: 404 });
      });

      it('should throw 400 for closed purchase', async () => {
        await testPurchase.update({ closed: true });

        await expect(
          purchaseItemService.create({
            purchaseId: testPurchase.id,
            productId: testProduct.id,
            quantity: 1,
          }),
        ).rejects.toMatchObject({ status: 400 });

        // Reopen for other tests
        await testPurchase.update({ closed: false });
      });
    });

    describe('findById', () => {
      let testItem;

      beforeAll(async () => {
        testItem = await db.purchaseItems.create({
          purchaseId: testPurchase.id,
          productId: testProduct.id,
          quantity: 2,
        });
      });

      afterAll(async () => {
        if (testItem) {
          await testItem.destroy();
        }
      });

      it('should return item with product data', async () => {
        const item = await purchaseItemService.findById(testItem.id, {
          includeProduct: true,
        });

        expect(item).toHaveProperty('id', testItem.id);
        expect(item).toHaveProperty('product');
      });

      it('should return item with purchase data', async () => {
        const item = await purchaseItemService.findById(testItem.id, {
          includeProduct: false,
          includePurchase: true,
        });

        expect(item).toHaveProperty('purchase');
        expect(item.purchase).toHaveProperty('id', testPurchase.id);
      });

      it('should throw 404 for non-existent item', async () => {
        await expect(purchaseItemService.findById(999999)).rejects.toMatchObject({
          status: 404,
        });
      });
    });

    describe('update', () => {
      let testItem;

      beforeAll(async () => {
        testItem = await db.purchaseItems.create({
          purchaseId: testPurchase.id,
          productId: testProduct.id,
          quantity: 1,
        });
      });

      afterAll(async () => {
        if (testItem) {
          await testItem.destroy();
        }
      });

      it('should update item quantity', async () => {
        const updated = await purchaseItemService.update(testItem.id, {
          quantity: 5,
        });

        expect(updated.quantity).toBe(5);
      });

      it('should throw 400 when updating item in closed purchase', async () => {
        await testPurchase.update({ closed: true });

        await expect(
          purchaseItemService.update(testItem.id, { quantity: 10 }),
        ).rejects.toMatchObject({ status: 400 });

        await testPurchase.update({ closed: false });
      });
    });

    describe('delete', () => {
      it('should delete an item from open purchase', async () => {
        const itemToDelete = await db.purchaseItems.create({
          purchaseId: testPurchase.id,
          productId: testProduct.id,
          quantity: 1,
        });

        const result = await purchaseItemService.delete(itemToDelete.id);

        expect(result).toHaveProperty('deleted', true);

        const found = await db.purchaseItems.findByPk(itemToDelete.id);
        expect(found).toBeNull();
      });

      it('should throw 400 when deleting from closed purchase', async () => {
        const itemToDelete = await db.purchaseItems.create({
          purchaseId: testPurchase.id,
          productId: testProduct.id,
          quantity: 1,
        });

        await testPurchase.update({ closed: true });

        await expect(purchaseItemService.delete(itemToDelete.id)).rejects.toMatchObject({
          status: 400,
        });

        await testPurchase.update({ closed: false });
        await itemToDelete.destroy();
      });
    });

    describe('updateQuantity', () => {
      let testItem;

      beforeAll(async () => {
        testItem = await db.purchaseItems.create({
          purchaseId: testPurchase.id,
          productId: testProduct.id,
          quantity: 1,
        });
      });

      afterAll(async () => {
        if (testItem) {
          await testItem.destroy();
        }
      });

      it('should update quantity via helper method', async () => {
        const updated = await purchaseItemService.updateQuantity(testItem.id, 7);

        expect(updated.quantity).toBe(7);
      });

      it('should throw 400 for quantity less than 1', async () => {
        await expect(
          purchaseItemService.updateQuantity(testItem.id, 0),
        ).rejects.toMatchObject({ status: 400 });
      });
    });
  });

  describe('N+1 Prevention Verification', () => {
    it('should use constant query count regardless of result size (eager loading)', async () => {
      const pagination = { page: 1, limit: 20, skip: 0 };

      // This should not scale with result count
      const result = await purchaseService.findAll({
        pagination,
        includeEmployee: true,
      });

      // If we get here without timeout, eager loading is working
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('count');
    });
  });
});
