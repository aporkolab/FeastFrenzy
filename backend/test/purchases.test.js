const request = require('supertest');

const app = require('../server');
const db = require('../model');
const { generateTestToken, createTestUsers } = require('./test_helper');

describe('Purchases API', () => {
  const API_BASE = '/api/v1';
  let adminToken, managerToken, employeeToken;
  let testEmployee;

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

    testEmployee = await db.employees.create({
      name: 'Test Employee',
      employee_number: 'TEST001',
      monthlyConsumptionValue: 1000,
    });
  });

  describe(`GET ${API_BASE}/purchases`, () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get(`${API_BASE}/purchases`).expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return empty array when no purchases exist for admin', async () => {
      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data).toHaveLength(0);
    });

    it('should return all purchases for admin', async () => {
      await db.purchases.bulkCreate([
        {
          employeeId: testEmployee.id,
          date: new Date(),
          total: 25.5,
          closed: false,
          userId: 1,
        },
        {
          employeeId: testEmployee.id,
          date: new Date(),
          total: 15.0,
          closed: true,
          userId: 2,
        },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data).toHaveLength(2);
    });

    it('should return all purchases for manager', async () => {
      await db.purchases.bulkCreate([
        {
          employeeId: testEmployee.id,
          date: new Date(),
          total: 25.5,
          closed: false,
        },
        {
          employeeId: testEmployee.id,
          date: new Date(),
          total: 15.0,
          closed: true,
        },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data).toHaveLength(2);
    });

    it('should return only own purchases for employee', async () => {
      await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 25.5,
        closed: false,
        userId: 3,
      });

      await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 15.0,
        closed: true,
        userId: 1,
      });

      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data).toHaveLength(1);
      expect(parseFloat(res.body.data[0].total)).toBe(25.5);
    });
  });

  describe(`GET ${API_BASE}/purchases/:id`, () => {
    it('should return 403 when employee tries to access another user purchase', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date('2024-01-15'),
        total: 50.0,
        closed: false,
        userId: 1,
      });

      const res = await request(app)
        .get(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should return own purchase for employee', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date('2024-01-15'),
        total: 50.0,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .get(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', purchase.id);
      expect(parseFloat(res.body.total)).toBe(50.0);
    });

    it('should return any purchase for admin', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date('2024-01-15'),
        total: 50.0,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .get(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', purchase.id);
    });

    it('should return 404 for non-existent purchase', async () => {
      const res = await request(app)
        .get(`${API_BASE}/purchases/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe(`POST ${API_BASE}/purchases`, () => {
    it('should create a new purchase with admin token', async () => {
      const newPurchase = {
        employeeId: testEmployee.id,
        date: '2024-06-15T10:00:00Z',
        total: 75.5,
        closed: false,
      };

      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newPurchase)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('employeeId', testEmployee.id);
      expect(parseFloat(res.body.total)).toBe(75.5);
      expect(res.body).toHaveProperty('closed', false);

      const dbPurchase = await db.purchases.findByPk(res.body.id);
      expect(dbPurchase).not.toBeNull();
    });

    it('should create a purchase with employee token and attach userId', async () => {
      const newPurchase = {
        employeeId: testEmployee.id,
        date: '2024-06-15T10:00:00Z',
        total: 50.0,
        closed: false,
      };

      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(newPurchase)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('userId', 3);

      const dbPurchase = await db.purchases.findByPk(res.body.id);
      expect(dbPurchase.userId).toBe(3);
    });

    it('should create a closed purchase', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployee.id,
          date: new Date().toISOString(),
          total: 100.0,
          closed: true,
        })
        .expect(201);

      expect(res.body).toHaveProperty('closed', true);
    });

    it('should handle zero total purchase', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployee.id,
          date: new Date().toISOString(),
          total: 0,
          closed: false,
        })
        .expect(201);

      expect(parseFloat(res.body.total)).toBe(0);
    });
  });

  describe(`PUT ${API_BASE}/purchases/:id`, () => {
    it('should return 403 when employee tries to update another user purchase', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 30.0,
        closed: false,
        userId: 1,
      });

      const res = await request(app)
        .put(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ total: 45.0, closed: true })
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should update own purchase for employee', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 30.0,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .put(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ total: 45.0, closed: true })
        .expect(200);

      expect(parseFloat(res.body.total)).toBe(45.0);
      expect(res.body).toHaveProperty('closed', true);
    });

    it('should update any purchase for admin', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 30.0,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .put(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ total: 45.0, closed: true })
        .expect(200);

      expect(parseFloat(res.body.total)).toBe(45.0);
    });

    it('should return 404 when updating non-existent purchase', async () => {
      const res = await request(app)
        .put(`${API_BASE}/purchases/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ total: 100.0 })
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should allow closing a purchase', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 50.0,
        closed: false,
        userId: 2,
      });

      const res = await request(app)
        .put(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ closed: true })
        .expect(200);

      expect(res.body).toHaveProperty('closed', true);
    });
  });

  describe(`DELETE ${API_BASE}/purchases/:id`, () => {
    it('should return 403 when employee tries to delete', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 20.0,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .delete(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should delete an existing purchase with admin token', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 20.0,
        closed: false,
      });

      const res = await request(app)
        .delete(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('deleted', true);

      const deleted = await db.purchases.findByPk(purchase.id);
      expect(deleted).toBeNull();
    });

    it('should delete an existing purchase with manager token', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 20.0,
        closed: false,
      });

      const res = await request(app)
        .delete(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('deleted', true);
    });

    it('should return 404 when deleting non-existent purchase', async () => {
      const res = await request(app)
        .delete(`${API_BASE}/purchases/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Business Logic', () => {
    it('should handle large purchase amounts', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployee.id,
          date: new Date().toISOString(),
          total: 99999.99,
          closed: false,
        })
        .expect(201);

      expect(parseFloat(res.body.total)).toBe(99999.99);
    });

    it('should handle decimal precision correctly', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployee.id,
          date: new Date().toISOString(),
          total: 123.45,
          closed: false,
        })
        .expect(201);

      expect(parseFloat(res.body.total)).toBe(123.45);
    });

    it('should track open vs closed purchases', async () => {
      await db.purchases.bulkCreate([
        {
          employeeId: testEmployee.id,
          date: new Date(),
          total: 10,
          closed: false,
        },
        {
          employeeId: testEmployee.id,
          date: new Date(),
          total: 20,
          closed: true,
        },
        {
          employeeId: testEmployee.id,
          date: new Date(),
          total: 30,
          closed: false,
        },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const openPurchases = res.body.data.filter(p => !p.closed);
      const closedPurchases = res.body.data.filter(p => p.closed);

      expect(openPurchases).toHaveLength(2);
      expect(closedPurchases).toHaveLength(1);
    });
  });
});
