const request = require('supertest');

const app = require('../server');
const db = require('../model');
const {
  generateTestToken,
  createTestUsers,
  generateExpiredToken,
  generateInvalidToken,
} = require('./test_helper');

describe('RBAC (Role-Based Access Control)', () => {
  const API_BASE = '/api/v1';
  let adminToken, managerToken, employeeToken;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await db.sequelize.sync({ force: true });

    await createTestUsers(db);

    adminToken = generateTestToken('admin');
    managerToken = generateTestToken('manager');
    employeeToken = generateTestToken('employee');
  });

  beforeEach(async () => {
    await db.purchases.destroy({ where: {}, truncate: true });
    await db.employees.destroy({ where: {}, truncate: true });
    await db.products.destroy({ where: {}, truncate: true });
  });

  describe('Authentication', () => {
    it('should return 401 when no token is provided', async () => {
      const res = await request(app).get(`${API_BASE}/products`).expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.message).toContain('token');
    });

    it('should return 401 when invalid token is provided', async () => {
      const invalidToken = generateInvalidToken();

      const res = await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 when expired token is provided', async () => {
      const expiredToken = generateExpiredToken('admin');

      const res = await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.message).toContain('expired');
    });

    it('should return 401 for malformed authorization header', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', 'InvalidFormat token123')
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Products - Role-Based Access', () => {
    it('should allow employee to view products (403 -> 200)', async () => {
      await db.products.create({ name: 'Test Product', price: 10.0 });

      const res = await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).toEqual(expect.any(Array));
    });

    it('should deny employee from creating product (403)', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'New Product', price: 10.0 })
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should allow manager to create product (201)', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Manager Product', price: 15.0 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Manager Product');
    });

    it('should allow admin to delete product (200)', async () => {
      const product = await db.products.create({
        name: 'To Delete',
        price: 10.0,
      });

      const res = await request(app)
        .delete(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.deleted).toBe(true);
    });

    it('should deny manager from deleting product (403)', async () => {
      const product = await db.products.create({
        name: 'Manager Cannot Delete',
        price: 10.0,
      });

      const res = await request(app)
        .delete(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Employees - Role-Based Access', () => {
    it('should deny employee from viewing all employees (403)', async () => {
      const res = await request(app)
        .get(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should allow manager to view employees (200)', async () => {
      await db.employees.create({
        name: 'Test Worker',
        employee_number: 'EMP001',
        monthlyConsumptionValue: 1000,
      });

      const res = await request(app)
        .get(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data).toHaveLength(1);
    });

    it('should deny manager from creating employee (403)', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'New Employee',
          employee_number: 'EMP999',
          monthlyConsumptionValue: 500,
        })
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should allow admin to create employee (201)', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Created',
          employee_number: 'EMP888',
          monthlyConsumptionValue: 750,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should deny employee from viewing single employee (403)', async () => {
      const employee = await db.employees.create({
        name: 'Test Worker',
        employee_number: 'EMP002',
        monthlyConsumptionValue: 1000,
      });

      const res = await request(app)
        .get(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Purchases - Role-Based Access', () => {
    let testEmployee;

    beforeEach(async () => {
      testEmployee = await db.employees.create({
        name: 'Test Employee',
        employee_number: 'TEST001',
        monthlyConsumptionValue: 1000,
      });
    });

    it('should only show own purchases to employee', async () => {
      await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 50.0,
        closed: false,
        userId: 3,
      });

      await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 100.0,
        closed: false,
        userId: 1,
      });

      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(parseFloat(res.body.data[0].total)).toBe(50.0);
    });

    it('should deny employee from deleting purchase (403)', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 50.0,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .delete(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should allow admin to delete any purchase (200)', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 50.0,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .delete(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.deleted).toBe(true);
    });

    it('should allow manager to delete any purchase (200)', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 75.0,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .delete(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.deleted).toBe(true);
    });

    it('should deny employee from accessing another user purchase (403)', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 100.0,
        closed: false,
        userId: 1,
      });

      const res = await request(app)
        .get(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should allow employee to access own purchase (200)', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 100.0,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .get(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', purchase.id);
    });
  });

  describe('Permission Matrix Verification', () => {
    it('should verify complete permission matrix for products', async () => {
      const product = await db.products.create({
        name: 'Matrix Test',
        price: 10.0,
      });

      await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Fail', price: 5.0 })
        .expect(403);

      await request(app)
        .put(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ price: 15.0 })
        .expect(403);

      await request(app)
        .delete(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      await request(app)
        .put(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ price: 15.0 })
        .expect(200);

      await request(app)
        .delete(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      const newProduct = await db.products.create({
        name: 'Admin Test',
        price: 10.0,
      });

      await request(app)
        .delete(`${API_BASE}/products/${newProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should verify complete permission matrix for employees', async () => {
      const employee = await db.employees.create({
        name: 'Matrix Employee',
        employee_number: 'MAT001',
        monthlyConsumptionValue: 500,
      });

      await request(app)
        .get(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      await request(app)
        .get(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      await request(app)
        .get(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Fail',
          employee_number: 'FAIL01',
          monthlyConsumptionValue: 100,
        })
        .expect(403);

      await request(app)
        .get(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app)
        .put(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ monthlyConsumptionValue: 750 })
        .expect(200);
    });
  });
});
