/**
 * Test Controller
 *
 * These endpoints are ONLY available in test/development environment.
 * They provide database reset and seeding capabilities for E2E tests.
 *
 * NEVER expose these endpoints in production!
 */

const express = require('express');
const router = express.Router();
const db = require('../../model');
const logger = require('../../logger/logger');
const bcrypt = require('bcrypt');

// Guard: Only allow in test/development
if (process.env.NODE_ENV === 'production') {
  router.all('*', (req, res) => {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Test endpoints are not available in production',
      },
    });
  });
} else {
  /**
   * POST /api/v1/test/reset
   * Reset database to clean state and re-seed with initial data
   */
  router.post('/reset', async (req, res, next) => {
    try {
      logger.info('Resetting test database...');

      // Sync database with force: true (drops all tables)
      await db.sequelize.sync({ force: true });

      // Run initial seeders
      await seedInitialData();

      logger.info('Test database reset complete');

      res.json({
        success: true,
        message: 'Database reset successfully',
      });
    } catch (error) {
      logger.error('Database reset failed:', error);
      next(error);
    }
  });

  /**
   * POST /api/v1/test/seed
   * Seed specific test data
   *
   * Body: {
   *   products: Array<{ name: string, price: number }>,
   *   employees: Array<{ name: string, employee_number: string, monthlyConsumptionValue: number }>,
   *   purchases: Array<{ date: string, employeeId: number, closed: boolean }>
   * }
   */
  router.post('/seed', async (req, res, next) => {
    try {
      const { products, employees, purchases } = req.body;
      const results = { products: [], employees: [], purchases: [] };

      if (products && Array.isArray(products)) {
        for (const product of products) {
          const created = await db.products.create(product);
          results.products.push(created);
        }
      }

      if (employees && Array.isArray(employees)) {
        for (const employee of employees) {
          const created = await db.employees.create(employee);
          results.employees.push(created);
        }
      }

      if (purchases && Array.isArray(purchases)) {
        for (const purchase of purchases) {
          const created = await db.purchases.create(purchase);
          results.purchases.push(created);
        }
      }

      res.json({
        success: true,
        message: 'Data seeded successfully',
        data: results,
      });
    } catch (error) {
      logger.error('Seeding failed:', error);
      next(error);
    }
  });

  /**
   * DELETE /api/v1/test/cleanup
   * Clean up test data (optional, for specific cleanup without full reset)
   */
  router.delete('/cleanup', async (req, res, next) => {
    try {
      // Delete in order to respect foreign keys
      await db.purchaseItems.destroy({ where: {}, truncate: true, cascade: true });
      await db.purchases.destroy({ where: {}, truncate: true, cascade: true });
      await db.products.destroy({ where: {}, truncate: true, cascade: true });
      await db.employees.destroy({ where: {}, truncate: true, cascade: true });
      // Keep users - they are seeded separately

      res.json({
        success: true,
        message: 'Test data cleaned up',
      });
    } catch (error) {
      logger.error('Cleanup failed:', error);
      next(error);
    }
  });

  /**
   * GET /api/v1/test/health
   * Check if test endpoints are available
   */
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Test endpoints are available',
      environment: process.env.NODE_ENV || 'development',
    });
  });
}

/**
 * Seed initial data (demo users)
 */
async function seedInitialData() {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;

  const adminPassword = await bcrypt.hash('Admin123!', rounds);
  const managerPassword = await bcrypt.hash('Manager123!', rounds);
  const employeePassword = await bcrypt.hash('Employee123!', rounds);

  await db.users.bulkCreate([
    {
      email: 'admin@feastfrenzy.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin',
      isActive: true,
    },
    {
      email: 'manager@feastfrenzy.com',
      password: managerPassword,
      name: 'Manager User',
      role: 'manager',
      isActive: true,
    },
    {
      email: 'employee@feastfrenzy.com',
      password: employeePassword,
      name: 'Employee User',
      role: 'employee',
      isActive: true,
    },
  ]);

  // Seed some initial products
  await db.products.bulkCreate([
    { name: 'Coffee', price: 3.50 },
    { name: 'Sandwich', price: 7.99 },
    { name: 'Water', price: 1.50 },
    { name: 'Salad', price: 8.99 },
    { name: 'Cookie', price: 2.00 },
  ]);

  // Seed some initial employees
  await db.employees.bulkCreate([
    { name: 'John Doe', employee_number: 'EMP001', monthlyConsumptionValue: 500 },
    { name: 'Jane Smith', employee_number: 'EMP002', monthlyConsumptionValue: 750 },
    { name: 'Bob Wilson', employee_number: 'EMP003', monthlyConsumptionValue: 300 },
  ]);
}

module.exports = router;
