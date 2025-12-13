const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');

describe('Health & Error Handling', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body).to.have.property('status', 'healthy');
      expect(res.body).to.have.property('timestamp');
      expect(res.body).to.have.property('uptime');
    });

    it('should return valid timestamp format', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(res.body.timestamp);
      expect(timestamp).to.be.instanceOf(Date);
      expect(timestamp.getTime()).to.not.be.NaN;
    });

    it('should return positive uptime', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.uptime).to.be.a('number');
      expect(res.body.uptime).to.be.at.least(0);
    });
  });

  describe('404 Not Found Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app)
        .get('/this-route-does-not-exist')
        .expect(404);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error).to.have.property('code', 'NOT_FOUND');
      expect(res.body.error.message).to.include('not found');
    });

    it('should return 404 for unknown API routes', async () => {
      const res = await request(app)
        .get('/api/v2/unknown-endpoint')
        .expect(404);

      expect(res.body).to.have.property('success', false);
    });

    it('should include timestamp in error response', async () => {
      const res = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(res.body).to.have.property('timestamp');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error structure for 404', async () => {
      const res = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(res.body).to.have.property('success', false);
      expect(res.body).to.have.property('error');
      expect(res.body.error).to.have.property('code');
      expect(res.body.error).to.have.property('message');
      expect(res.body).to.have.property('timestamp');
    });
  });

  describe('Content-Type Headers', () => {
    it('should return JSON content type for success', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.headers['content-type']).to.include('application/json');
    });

    it('should return JSON content type for errors', async () => {
      const res = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(res.headers['content-type']).to.include('application/json');
    });
  });
});
