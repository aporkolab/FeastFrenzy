const request = require('supertest');

const app = require('../server');
const db = require('../model');
const { generateTestToken, createTestUsers } = require('./test_helper');

describe('Validation Middleware', () => {
  const API_BASE = '/api/v1';
  let adminToken;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await db.sequelize.sync({ force: true });

    await createTestUsers(db);

    adminToken = generateTestToken('admin');
  });

  describe('Product Validation', () => {
    it('should reject product without name', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 10.0 })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('name');
    });

    it('should reject product without price', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Product' })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('price');
    });

    it('should reject product with negative price', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Product', price: -10 })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message.toLowerCase()).toContain('price');
    });

    it('should reject product with price over max', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Product', price: 9999999.99 })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message.toLowerCase()).toContain('price');
    });

    it('should reject product with empty name', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '', price: 10.0 })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should reject update with no fields', async () => {
      const res = await request(app)
        .put(`${API_BASE}/products/1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('At least one field');
    });

    it('should strip unknown fields', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          price: 10.0,
          unknownField: 'should be stripped',
          maliciousField: '<script>alert("xss")</script>',
        })
        .expect(201);

      expect(res.body).not.toHaveProperty('unknownField');
      expect(res.body).not.toHaveProperty('maliciousField');
    });
  });

  describe('Employee Validation', () => {
    it('should reject employee without name', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_number: 'EMP001',
          monthlyConsumptionValue: 1000,
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('name');
    });

    it('should reject employee without employee_number', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Employee',
          monthlyConsumptionValue: 1000,
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('employee_number');
    });

    it('should reject employee with negative consumption value', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Employee',
          employee_number: 'EMP001',
          monthlyConsumptionValue: -100,
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('consumption');
    });
  });

  describe('Purchase Validation', () => {
    it('should reject purchase without date', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 1,
          total: 100,
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('date');
    });

    it('should reject purchase without employeeId', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: new Date().toISOString(),
          total: 100,
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('Employee');
    });

    it('should reject purchase with invalid date format', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: 'not-a-date',
          employeeId: 1,
          total: 100,
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('date');
    });

    it('should accept purchase with default values', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: new Date().toISOString(),
          employeeId: 1,
        });

      expect(res.status).not.toBe(400);
    });
  });

  describe('ID Parameter Validation', () => {
    it('should reject non-numeric ID', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/abc`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('ID');
    });

    it('should reject negative ID', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/-1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should reject zero ID', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/0`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should accept valid numeric ID', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/1`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).not.toBe(400);
    });
  });

  describe('Error Response Format', () => {
    it('should return all validation errors at once', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('details');
      expect(res.body.error.details).toEqual(expect.any(Array));
      expect(res.body.error.details.length).toBeGreaterThan(1);
    });

    it('should include field name in error details', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(400);

      expect(res.body.error.details).toEqual(expect.any(Array));
      expect(res.body.error.details[0]).toHaveProperty('field');
      expect(res.body.error.details[0]).toHaveProperty('message');
    });
  });
});
