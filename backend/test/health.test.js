const request = require('supertest');

const app = require('../server');

describe('Health & Error Handling', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });

    it('should return valid timestamp format', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(res.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should return positive uptime', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.uptime).toEqual(expect.any(Number));
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('404 Not Found Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app)
        .get('/this-route-does-not-exist')
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(res.body.error.message).toContain('not found');
    });

    it('should return 404 for unknown API routes', async () => {
      const res = await request(app)
        .get('/api/v2/unknown-endpoint')
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should include timestamp in error response', async () => {
      const res = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error structure for 404', async () => {
      const res = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Content-Type Headers', () => {
    it('should return JSON content type for success', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.headers['content-type']).toContain('application/json');
    });

    it('should return JSON content type for errors', async () => {
      const res = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(res.headers['content-type']).toContain('application/json');
    });
  });
});
