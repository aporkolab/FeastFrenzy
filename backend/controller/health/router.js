const express = require('express');
const router = express.Router();
const { sequelize } = require('../../model');
const { ping: pingRedis } = require('../../utils/redis');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns health status of the application and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All systems operational
 *       503:
 *         description: One or more systems degraded
 */
router.get('/health', async (req, res) => {
  const isTestEnv = process.env.NODE_ENV === 'test';

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    requestId: req.id,
    checks: {},
  };

  // Skip dependency checks in test environment
  if (isTestEnv) {
    health.checks.database = 'skipped (test)';
    health.checks.redis = 'skipped (test)';
  } else {
    // DB check
    try {
      await sequelize.authenticate();
      health.checks.database = 'ok';
    } catch (error) {
      health.checks.database = 'error';
      health.checks.databaseError = error.message;
      health.status = 'degraded';
    }

    // Redis check
    if (process.env.CACHE_ENABLED !== 'false') {
      try {
        const pong = await pingRedis();
        health.checks.redis = pong ? 'ok' : 'disconnected';
        if (!pong) {
          health.status = 'degraded';
        }
      } catch (error) {
        health.checks.redis = 'error';
        health.checks.redisError = error.message;
        health.status = 'degraded';
      }
    } else {
      health.checks.redis = 'disabled';
    }
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  health.memory = {
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024) }MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024) }MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024) }MB`,
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Simple check if the service is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Check if service is ready to accept traffic
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/health/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: error.message });
  }
});

module.exports = router;
