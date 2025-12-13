const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');

describe('Validation Middleware', () => {
  const API_BASE = '/api/v1';

  describe('Product Validation', () => {
    it('should reject product without name', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .send({ price: 10.00 })
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('name');
    });

    it('should reject product without price', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .send({ name: 'Test Product' })
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('price');
    });

    it('should reject product with negative price', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .send({ name: 'Test Product', price: -10 })
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message.toLowerCase()).to.include('price');
    });

    it('should reject product with price over max', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .send({ name: 'Test Product', price: 9999999.99 })
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message.toLowerCase()).to.include('price');
    });

    it('should reject product with empty name', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .send({ name: '', price: 10.00 })
        .expect(400);

      expect(res.body).to.have.property('success', false);
    });

    it('should reject update with no fields', async () => {
      const res = await request(app)
        .put(`${API_BASE}/products/1`)
        .send({})
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('At least one field');
    });

    it('should strip unknown fields', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .send({ 
          name: 'Test Product', 
          price: 10.00,
          unknownField: 'should be stripped',
          maliciousField: '<script>alert("xss")</script>'
        })
        .expect(201);

      expect(res.body).to.not.have.property('unknownField');
      expect(res.body).to.not.have.property('maliciousField');
    });
  });

  describe('Employee Validation', () => {
    it('should reject employee without name', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .send({ 
          employee_number: 'EMP001',
          monthlyConsumptionValue: 1000
        })
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('name');
    });

    it('should reject employee without employee_number', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .send({ 
          name: 'Test Employee',
          monthlyConsumptionValue: 1000
        })
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('employee_number');
    });

    it('should reject employee with negative consumption value', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .send({ 
          name: 'Test Employee',
          employee_number: 'EMP001',
          monthlyConsumptionValue: -100
        })
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('consumption');
    });
  });

  describe('Purchase Validation', () => {
    it('should reject purchase without date', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .send({ 
          employeeId: 1,
          total: 100
        })
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('date');
    });

    it('should reject purchase without employeeId', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .send({ 
          date: new Date().toISOString(),
          total: 100
        })
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('Employee');
    });

    it('should reject purchase with invalid date format', async () => {
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .send({ 
          date: 'not-a-date',
          employeeId: 1,
          total: 100
        })
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('date');
    });

    it('should accept purchase with default values', async () => {
      
      
      const res = await request(app)
        .post(`${API_BASE}/purchases`)
        .send({ 
          date: new Date().toISOString(),
          employeeId: 1
        });

      
      expect(res.status).to.not.equal(400);
    });
  });

  describe('ID Parameter Validation', () => {
    it('should reject non-numeric ID', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/abc`)
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('ID');
    });

    it('should reject negative ID', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/-1`)
        .expect(400);

      expect(res.body).to.have.property('success', false);
    });

    it('should reject zero ID', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/0`)
        .expect(400);

      expect(res.body).to.have.property('success', false);
    });

    it('should accept valid numeric ID', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/1`);

      
      expect(res.status).to.not.equal(400);
    });
  });

  describe('Error Response Format', () => {
    it('should return all validation errors at once', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .send({})
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error).to.have.property('details');
      expect(res.body.error.details).to.be.an('array');
      expect(res.body.error.details.length).to.be.greaterThan(1);
    });

    it('should include field name in error details', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .send({ name: 'Test' })
        .expect(400);

      expect(res.body.error.details).to.be.an('array');
      expect(res.body.error.details[0]).to.have.property('field');
      expect(res.body.error.details[0]).to.have.property('message');
    });
  });
});
