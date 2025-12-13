const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const db = require('../model');
const { generateTestToken, createTestUsers } = require('./test_helper');

describe('Purchases API', () => {
  const API_BASE = '/api/v1';
  let adminToken, managerToken, employeeToken;
  let testEmployee;

  before(async () => {
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
      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .expect(401);

      expect(res.body).to.have.property('error');
    });

    it('should return empty array when no purchases exist for admin', async () => {
      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(0);
    });

    it('should return all purchases for admin', async () => {
      await db.purchases.bulkCreate([
        { employeeId: testEmployee.id, date: new Date(), total: 25.50, closed: false, userId: 1 },
        { employeeId: testEmployee.id, date: new Date(), total: 15.00, closed: true, userId: 2 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(2);
    });

    it('should return all purchases for manager', async () => {
      await db.purchases.bulkCreate([
        { employeeId: testEmployee.id, date: new Date(), total: 25.50, closed: false },
        { employeeId: testEmployee.id, date: new Date(), total: 15.00, closed: true },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(2);
    });

    it('should return only own purchases for employee', async () => {
      
      await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 25.50,
        closed: false,
        userId: 3, 
      });

      
      await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 15.00,
        closed: true,
        userId: 1, 
      });

      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(1);
      expect(parseFloat(res.body[0].total)).to.equal(25.50);
    });
  });

  describe(`GET ${API_BASE}/purchases/:id`, () => {
    it('should return 403 when employee tries to access another user purchase', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date('2024-01-15'),
        total: 50.00,
        closed: false,
        userId: 1, 
      });

      const res = await request(app)
        .get(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).to.have.property('error');
    });

    it('should return own purchase for employee', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date('2024-01-15'),
        total: 50.00,
        closed: false,
        userId: 3, 
      });

      const res = await request(app)
        .get(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).to.have.property('id', purchase.id);
      expect(parseFloat(res.body.total)).to.equal(50.00);
    });

    it('should return any purchase for admin', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date('2024-01-15'),
        total: 50.00,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .get(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.have.property('id', purchase.id);
    });

    it('should return 404 for non-existent purchase', async () => {
      const res = await request(app)
        .get(`${API_BASE}/purchases/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error).to.have.property('code', 'NOT_FOUND');
    });
  });

  describe(`POST ${API_BASE}/purchases`, () => {
    it('should create a new purchase with admin token', async () => {
      const newPurchase = {
        employeeId: testEmployee.id,
        date: '2024-06-15T10:00:00Z',
        total: 75.50,
        closed: false,
      };

      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newPurchase)
        .expect(201);

      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('employeeId', testEmployee.id);
      expect(parseFloat(res.body.total)).to.equal(75.50);
      expect(res.body).to.have.property('closed', false);

      const dbPurchase = await db.purchases.findByPk(res.body.id);
      expect(dbPurchase).to.not.be.null;
    });

    it('should create a purchase with employee token and attach userId', async () => {
      const newPurchase = {
        employeeId: testEmployee.id,
        date: '2024-06-15T10:00:00Z',
        total: 50.00,
        closed: false,
      };

      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(newPurchase)
        .expect(201);

      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('userId', 3); 

      const dbPurchase = await db.purchases.findByPk(res.body.id);
      expect(dbPurchase.userId).to.equal(3);
    });

    it('should create a closed purchase', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployee.id,
          date: new Date().toISOString(),
          total: 100.00,
          closed: true,
        })
        .expect(201);

      expect(res.body).to.have.property('closed', true);
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

      expect(parseFloat(res.body.total)).to.equal(0);
    });
  });

  describe(`PUT ${API_BASE}/purchases/:id`, () => {
    it('should return 403 when employee tries to update another user purchase', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 30.00,
        closed: false,
        userId: 1, 
      });

      const res = await request(app)
        .put(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ total: 45.00, closed: true })
        .expect(403);

      expect(res.body).to.have.property('error');
    });

    it('should update own purchase for employee', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 30.00,
        closed: false,
        userId: 3, 
      });

      const res = await request(app)
        .put(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ total: 45.00, closed: true })
        .expect(200);

      expect(parseFloat(res.body.total)).to.equal(45.00);
      expect(res.body).to.have.property('closed', true);
    });

    it('should update any purchase for admin', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 30.00,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .put(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ total: 45.00, closed: true })
        .expect(200);

      expect(parseFloat(res.body.total)).to.equal(45.00);
    });

    it('should return 404 when updating non-existent purchase', async () => {
      const res = await request(app)
        .put(`${API_BASE}/purchases/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ total: 100.00 })
        .expect(404);

      expect(res.body).to.have.property('success', false);
    });

    it('should allow closing a purchase', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 50.00,
        closed: false,
        userId: 2,
      });

      const res = await request(app)
        .put(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ closed: true })
        .expect(200);

      expect(res.body).to.have.property('closed', true);
    });
  });

  describe(`DELETE ${API_BASE}/purchases/:id`, () => {
    it('should return 403 when employee tries to delete', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 20.00,
        closed: false,
        userId: 3,
      });

      const res = await request(app)
        .delete(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).to.have.property('error');
    });

    it('should delete an existing purchase with admin token', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 20.00,
        closed: false,
      });

      const res = await request(app)
        .delete(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.have.property('deleted', true);

      const deleted = await db.purchases.findByPk(purchase.id);
      expect(deleted).to.be.null;
    });

    it('should delete an existing purchase with manager token', async () => {
      const purchase = await db.purchases.create({
        employeeId: testEmployee.id,
        date: new Date(),
        total: 20.00,
        closed: false,
      });

      const res = await request(app)
        .delete(`${API_BASE}/purchases/${purchase.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body).to.have.property('deleted', true);
    });

    it('should return 404 when deleting non-existent purchase', async () => {
      const res = await request(app)
        .delete(`${API_BASE}/purchases/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).to.have.property('success', false);
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

      expect(parseFloat(res.body.total)).to.equal(99999.99);
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

      expect(parseFloat(res.body.total)).to.equal(123.45);
    });

    it('should track open vs closed purchases', async () => {
      await db.purchases.bulkCreate([
        { employeeId: testEmployee.id, date: new Date(), total: 10, closed: false },
        { employeeId: testEmployee.id, date: new Date(), total: 20, closed: true },
        { employeeId: testEmployee.id, date: new Date(), total: 30, closed: false },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const openPurchases = res.body.filter(p => !p.closed);
      const closedPurchases = res.body.filter(p => p.closed);

      expect(openPurchases).to.have.lengthOf(2);
      expect(closedPurchases).to.have.lengthOf(1);
    });
  });
});
