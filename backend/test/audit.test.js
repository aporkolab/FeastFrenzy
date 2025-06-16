const request = require('supertest');

const app = require('../server');
const db = require('../model');
const AuditService = require('../services/audit.service');
const { generateTestToken, createTestUsers } = require('./test_helper');

/**
 * Audit Logging System Tests
 *
 * 8 Required Tests:
 * 1. Product create generates audit log
 * 2. Product update captures old and new value
 * 3. Product delete captures old value
 * 4. Login generates audit log
 * 5. Login failed generates audit log
 * 6. Admin can query audit logs
 * 7. Non-admin cannot query audit logs → 403
 * 8. Audit log contains requestId
 */
describe('Audit Logging System', () => {
  const API_BASE = '/api/v1';
  let adminToken;
  let employeeToken;
  let adminUser;

  // Helper to wait for async audit logging
  const waitForAudit = () => new Promise(resolve => setTimeout(resolve, 150));

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await db.sequelize.sync({ force: true });

    // Create test users via helper
    await createTestUsers(db);

    // Get admin user for ID reference
    adminUser = await db.users.findOne({ where: { role: 'admin' } });

    // Generate tokens
    adminToken = generateTestToken('admin');
    employeeToken = generateTestToken('employee');

    // Clear any audit logs from setup
    if (db.audit_logs) {
      await db.audit_logs.destroy({ where: {} });
    }
  });

  beforeEach(async () => {
    // Clean audit logs and products before each test
    if (db.audit_logs) {
      await db.audit_logs.destroy({ where: {} });
    }
    if (db.products) {
      await db.products.destroy({ where: {} });
    }
  });

  /**
   * TEST 1: Product create generates audit log
   */
  it('should generate audit log when product is created', async () => {
    const response = await request(app)
      .post(`${API_BASE}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Audit Test Product', price: 9.99 });

    expect(response.status).toBe(201);
    await waitForAudit();

    const logs = await db.audit_logs.findAll({
      where: { action: 'CREATE', resource: 'product' },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].resourceId).toBe(response.body.id);
    expect(logs[0].newValue).toBeDefined();
  });

  /**
   * TEST 2: Product update captures old and new value
   */
  it('should capture old and new value when product is updated', async () => {
    // Create product first
    const createResponse = await request(app)
      .post(`${API_BASE}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Original Name', price: 5.00 });

    const productId = createResponse.body.id;
    await waitForAudit();

    // Clear logs from create
    await db.audit_logs.destroy({ where: {} });

    // Update product
    await request(app)
      .put(`${API_BASE}/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Name', price: 7.50 });

    await waitForAudit();

    const logs = await db.audit_logs.findAll({
      where: { action: 'UPDATE', resource: 'product', resourceId: productId },
    });

    expect(logs).toHaveLength(1);

    // Parse JSON values if they're strings (SQLite stores JSON as TEXT)
    const oldValue = typeof logs[0].oldValue === 'string'
      ? JSON.parse(logs[0].oldValue)
      : logs[0].oldValue;
    const newValue = typeof logs[0].newValue === 'string'
      ? JSON.parse(logs[0].newValue)
      : logs[0].newValue;

    expect(oldValue).toBeDefined();
    expect(oldValue.name).toBe('Original Name');
    expect(newValue).toBeDefined();
    expect(newValue.name).toBe('Updated Name');
  });

  /**
   * TEST 3: Product delete captures old value
   */
  it('should capture old value when product is deleted', async () => {
    // Create product
    const createResponse = await request(app)
      .post(`${API_BASE}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Product To Delete', price: 1.00 });

    const productId = createResponse.body.id;
    await waitForAudit();

    // Clear logs from create
    await db.audit_logs.destroy({ where: {} });

    // Delete product
    await request(app)
      .delete(`${API_BASE}/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    await waitForAudit();

    const logs = await db.audit_logs.findAll({
      where: { action: 'DELETE', resource: 'product', resourceId: productId },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].oldValue).toBeDefined();
    expect(logs[0].oldValue.name).toBe('Product To Delete');
  });

  /**
   * TEST 4: Login generates audit log
   */
  it('should generate audit log on successful login', async () => {
    // Clear any existing logs
    await db.audit_logs.destroy({ where: {} });

    // Need to use real credentials - create a fresh user for login test
    const testUser = await db.users.create({
      email: 'logintest@test.com',
      password: 'Password123!',
      name: 'Login Test User',
      role: 'employee',
    });

    await request(app)
      .post(`${API_BASE}/auth/login`)
      .send({ email: 'logintest@test.com', password: 'Password123!' });

    await waitForAudit();

    const logs = await db.audit_logs.findAll({
      where: { action: 'LOGIN', resource: 'auth' },
    });

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].userId).toBe(testUser.id);

    // Cleanup
    await testUser.destroy();
  });

  /**
   * TEST 5: Login failed generates audit log
   */
  it('should generate audit log on failed login', async () => {
    // Create user for failed login test
    const testUser = await db.users.create({
      email: 'failtest@test.com',
      password: 'Password123!',
      name: 'Fail Test User',
      role: 'employee',
    });

    await db.audit_logs.destroy({ where: {} });

    await request(app)
      .post(`${API_BASE}/auth/login`)
      .send({ email: 'failtest@test.com', password: 'WrongPassword123!' });

    await waitForAudit();

    const logs = await db.audit_logs.findAll({
      where: { action: 'LOGIN_FAILED', resource: 'auth' },
    });

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].newValue.reason).toBe('Invalid password');

    // Cleanup
    await testUser.destroy();
  });

  /**
   * TEST 6: Admin can query audit logs
   */
  it('should allow admin to query audit logs', async () => {
    // Create some audit entries
    await AuditService.log({
      userId: adminUser.id,
      action: 'CREATE',
      resource: 'product',
      resourceId: 1,
    });

    const response = await request(app)
      .get(`${API_BASE}/admin/audit-logs`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.pagination).toBeDefined();
    expect(response.body.data).toEqual(expect.any(Array));
  });

  /**
   * TEST 7: Non-admin cannot query audit logs → 403
   */
  it('should deny non-admin access to audit logs with 403', async () => {
    const response = await request(app)
      .get(`${API_BASE}/admin/audit-logs`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(response.status).toBe(403);
  });

  /**
   * TEST 8: Audit log contains requestId
   */
  it('should include requestId in audit log entries', async () => {
    const response = await request(app)
      .post(`${API_BASE}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'RequestId Test Product', price: 3.00 });

    expect(response.status).toBe(201);
    await waitForAudit();

    const logs = await db.audit_logs.findAll({
      where: { action: 'CREATE', resource: 'product' },
      order: [['id', 'DESC']],
      limit: 1,
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].requestId).toBeDefined();
    expect(logs[0].requestId).not.toBeNull();
    // RequestId should be UUID format
    expect(logs[0].requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
