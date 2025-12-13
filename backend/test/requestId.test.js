const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const db = require('../model');
const { generateTestToken, createTestUsers } = require('./test_helper');

describe('Request ID & API Versioning', () => {
  const API_BASE = '/api/v1';
  let adminToken;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await db.sequelize.sync({ force: true });
    
    
    await createTestUsers(db);
    
    
    adminToken = generateTestToken('admin');
  });

  describe('Request ID Middleware', () => {
    it('should return X-Request-ID header in response', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.headers).to.have.property('x-request-id');
      expect(res.headers['x-request-id']).to.be.a('string');
      expect(res.headers['x-request-id']).to.have.lengthOf(36); 
    });

    it('should return custom X-Request-ID when provided by client', async () => {
      const customRequestId = 'custom-trace-id-12345-abcde';
      
      const res = await request(app)
        .get('/health')
        .set('X-Request-ID', customRequestId)
        .expect(200);

      expect(res.headers['x-request-id']).to.equal(customRequestId);
    });

    it('should include requestId in health response body', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body).to.have.property('requestId');
      expect(res.body.requestId).to.equal(res.headers['x-request-id']);
    });

    it('should include requestId in error responses', async () => {
      const res = await request(app)
        .get('/this-route-does-not-exist')
        .expect(404);

      expect(res.headers).to.have.property('x-request-id');
      expect(res.body).to.have.property('requestId');
      expect(res.body.requestId).to.equal(res.headers['x-request-id']);
    });

    it('should generate unique request IDs for each request', async () => {
      const res1 = await request(app).get('/health');
      const res2 = await request(app).get('/health');

      expect(res1.headers['x-request-id']).to.not.equal(res2.headers['x-request-id']);
    });

    it('should include X-Request-ID in API responses', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers).to.have.property('x-request-id');
      expect(res.headers['x-request-id']).to.be.a('string');
    });
  });

  describe('Legacy Route Redirects', () => {
    it('should redirect /products to /api/v1/products with 301', async () => {
      const res = await request(app)
        .get('/products')
        .expect(301);

      expect(res.headers.location).to.equal('/api/v1/products');
    });

    it('should redirect /products/:id to /api/v1/products/:id with 301', async () => {
      const res = await request(app)
        .get('/products/123')
        .expect(301);

      expect(res.headers.location).to.equal('/api/v1/products/123');
    });

    it('should redirect /employees to /api/v1/employees with 301', async () => {
      const res = await request(app)
        .get('/employees')
        .expect(301);

      expect(res.headers.location).to.equal('/api/v1/employees');
    });

    it('should redirect /purchases to /api/v1/purchases with 301', async () => {
      const res = await request(app)
        .get('/purchases')
        .expect(301);

      expect(res.headers.location).to.equal('/api/v1/purchases');
    });

    it('should redirect /purchase-items to /api/v1/purchase-items with 301', async () => {
      const res = await request(app)
        .get('/purchase-items')
        .expect(301);

      expect(res.headers.location).to.equal('/api/v1/purchase-items');
    });

    it('should preserve query parameters in redirect', async () => {
      const res = await request(app)
        .get('/products?page=2&limit=10')
        .expect(301);

      expect(res.headers.location).to.include('/api/v1/products');
      expect(res.headers.location).to.include('page=2');
      expect(res.headers.location).to.include('limit=10');
    });
  });

  describe('API Versioning', () => {
    it('should respond to /api/v1/products', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.an('array');
    });

    it('should respond to /api/v1/employees', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.an('array');
    });

    it('should respond to /api/v1/purchases', async () => {
      const res = await request(app)
        .get('/api/v1/purchases')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.an('array');
    });

    it('should return 404 for non-existent API versions', async () => {
      const res = await request(app)
        .get('/api/v2/products')
        .expect(404);

      expect(res.body).to.have.property('success', false);
    });

    it('health endpoint should not require versioning', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body).to.have.property('status', 'healthy');
    });
  });
});
