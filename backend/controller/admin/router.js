const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const cacheService = require('../../services/cache.service');
const { getClient, ping, getInfo, getDbSize } = require('../../utils/redis');
const logger = require('../../utils/logger');

/**
 * @swagger
 * tags:
 *   name: Admin - Cache
 *   description: Cache management endpoints (admin only)
 */

/**
 * @swagger
 * /admin/cache/stats:
 *   get:
 *     tags: [Admin - Cache]
 *     summary: Get cache statistics
 *     description: Returns Redis cache statistics including memory usage, hit rate, and key count
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     available:
 *                       type: boolean
 *                     dbSize:
 *                       type: integer
 *                     memory:
 *                       type: object
 *                     stats:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.get(
  '/stats',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const stats = await cacheService.getStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @swagger
 * /admin/cache/health:
 *   get:
 *     tags: [Admin - Cache]
 *     summary: Check cache health
 *     description: Pings Redis to verify connectivity
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy, unavailable]
 *                     latency:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.get(
  '/health',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const startTime = Date.now();
      const isHealthy = await ping();
      const latency = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          latency: `${latency}ms`,
          available: cacheService.isAvailable(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.json({
        success: true,
        data: {
          status: 'unavailable',
          error: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @swagger
 * /admin/cache/keys:
 *   get:
 *     tags: [Admin - Cache]
 *     summary: List cache keys
 *     description: Lists cache keys matching a pattern (use with caution in production)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: pattern
 *         in: query
 *         description: "Key pattern to match (default: *)"
 *         schema:
 *           type: string
 *           default: "*"
 *       - name: limit
 *         in: query
 *         description: Maximum number of keys to return
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 1000
 *     responses:
 *       200:
 *         description: List of cache keys
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.get(
  '/keys',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const client = getClient();

      if (!client) {
        return res.json({
          success: false,
          error: 'Redis not available',
        });
      }

      const pattern = req.query.pattern || '*';
      const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);

      // Use SCAN for production safety
      const keys = [];
      let cursor = '0';

      do {
        const [newCursor, foundKeys] = await client.scan(
          cursor,
          'MATCH',
          `feastfrenzy:${pattern}`,
          'COUNT',
          100,
        );

        cursor = newCursor;
        keys.push(...foundKeys);

        if (keys.length >= limit) {
          break;
        }
      } while (cursor !== '0');

      res.json({
        success: true,
        data: {
          keys: keys.slice(0, limit),
          count: keys.length,
          truncated: keys.length >= limit,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @swagger
 * /admin/cache/flush:
 *   delete:
 *     tags: [Admin - Cache]
 *     summary: Flush all cache
 *     description: Clears all cached data (use with caution!)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache flushed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.delete(
  '/flush',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const flushed = await cacheService.flush();

      logger.warn('Cache flush requested by admin', {
        userId: req.user.id,
        username: req.user.username,
      });

      res.json({
        success: flushed,
        message: flushed ? 'Cache flushed successfully' : 'Cache flush failed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @swagger
 * /admin/cache/invalidate:
 *   post:
 *     tags: [Admin - Cache]
 *     summary: Invalidate cache by pattern
 *     description: Invalidates cache entries matching specified patterns
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patterns
 *             properties:
 *               patterns:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of patterns to invalidate (e.g., ["products:*", "employees:*"])
 *           example:
 *             patterns: ["products:*"]
 *     responses:
 *       200:
 *         description: Cache invalidated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     patterns:
 *                       type: array
 *                       items:
 *                         type: string
 *                     deletedCount:
 *                       type: integer
 *       400:
 *         description: Invalid patterns
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.post(
  '/invalidate',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const { patterns } = req.body;

      if (!patterns || !Array.isArray(patterns) || patterns.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'patterns must be a non-empty array',
          },
        });
      }

      let totalDeleted = 0;

      for (const pattern of patterns) {
        const deleted = await cacheService.delPattern(pattern);
        totalDeleted += deleted;
      }

      logger.info('Cache invalidation requested by admin', {
        userId: req.user.id,
        username: req.user.username,
        patterns,
        deletedCount: totalDeleted,
      });

      res.json({
        success: true,
        data: {
          patterns,
          deletedCount: totalDeleted,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @swagger
 * /admin/cache/key/{key}:
 *   get:
 *     tags: [Admin - Cache]
 *     summary: Get cache value by key
 *     description: Retrieves a specific cache value (for debugging)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         description: Cache key (without prefix)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cache value
 *       404:
 *         description: Key not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.get(
  '/key/:key',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const client = getClient();

      if (!client) {
        return res.status(503).json({
          success: false,
          error: 'Redis not available',
        });
      }

      const key = `feastfrenzy:${req.params.key}`;
      const value = await client.get(key);
      const ttl = await client.ttl(key);

      if (value === null) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Cache key not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          key,
          value: JSON.parse(value),
          ttl: ttl > 0 ? `${ttl}s` : (ttl === -1 ? 'no expiry' : 'expired'),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @swagger
 * /admin/cache/key/{key}:
 *   delete:
 *     tags: [Admin - Cache]
 *     summary: Delete cache key
 *     description: Deletes a specific cache key
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         description: Cache key (without prefix)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.delete(
  '/key/:key',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const key = `feastfrenzy:${req.params.key}`;
      const deleted = await cacheService.del(key);

      res.json({
        success: true,
        data: {
          key,
          deleted,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
