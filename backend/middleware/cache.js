const cacheService = require('../services/cache.service');
const logger = require('../utils/logger');

/**
 * Cache Middleware
 *
 * Provides Express middleware for:
 * - Automatic GET response caching
 * - Cache invalidation on mutations
 * - X-Cache header for debugging
 */

/**
 * Cache middleware for GET requests
 * Automatically caches successful responses and returns cached data on subsequent requests
 *
 * @param {string} prefix - Cache key prefix (e.g., 'products')
 * @param {number} ttl - Time to live in seconds (default: 300)
 * @param {Object} options - Additional options
 * @param {boolean} options.userSpecific - Include user ID in cache key (default: true)
 * @param {string[]} options.varyBy - Additional query params to vary cache by
 * @returns {Function} Express middleware
 */
const cache = (prefix, ttl = 300, options = {}) => {
  const {
    userSpecific = true,
    varyBy = [],
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if disabled
    if (!cacheService.isAvailable()) {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    // Build cache key parameters
    const keyParams = { ...req.query };

    // Add user ID for user-specific caching
    if (userSpecific && req.user?.id) {
      keyParams.userId = req.user.id;
    }

    // Add route params (e.g., :id)
    if (req.params.id) {
      keyParams.id = req.params.id;
    }

    // Add any custom vary-by parameters
    varyBy.forEach(param => {
      if (req.headers[param]) {
        keyParams[`header_${param}`] = req.headers[param];
      }
    });

    const cacheKey = cacheService.generateKey(prefix, keyParams);

    try {
      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData !== null) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);

        logger.debug('Serving from cache', {
          key: cacheKey,
          path: req.path,
        });

        return res.json(cachedData);
      }

      // Cache miss - intercept response
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json to cache the response
      res.json = async (body) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await cacheService.set(cacheKey, body, ttl);

          logger.debug('Response cached', {
            key: cacheKey,
            ttl,
            path: req.path,
          });
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', {
        error: error.message,
        path: req.path,
      });

      // Continue without caching on error
      res.setHeader('X-Cache', 'ERROR');
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 * Clears cache entries matching specified patterns after successful mutations
 *
 * @param {string[]} patterns - Array of patterns to invalidate (e.g., ['products:*'])
 * @returns {Function} Express middleware
 */
const invalidateCache = (patterns) => {
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }

  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to invalidate cache after successful response
    res.json = async (body) => {
      // Only invalidate on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Fire and forget - don't block response
        Promise.all(
          patterns.map(pattern => cacheService.delPattern(pattern)),
        ).then(results => {
          const totalDeleted = results.reduce((sum, count) => sum + count, 0);

          if (totalDeleted > 0) {
            logger.debug('Cache invalidated', {
              patterns,
              totalDeleted,
              method: req.method,
              path: req.path,
            });
          }
        }).catch(error => {
          logger.error('Cache invalidation error', {
            error: error.message,
            patterns,
          });
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Manual cache invalidation helper
 * Use in controllers when you need more control over invalidation
 *
 * @param {string[]} patterns - Array of patterns to invalidate
 * @returns {Promise<number>} Total keys deleted
 */
const invalidatePatterns = async (patterns) => {
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }

  try {
    const results = await Promise.all(
      patterns.map(pattern => cacheService.delPattern(pattern)),
    );

    return results.reduce((sum, count) => sum + count, 0);
  } catch (error) {
    logger.error('Manual cache invalidation error', {
      error: error.message,
      patterns,
    });
    return 0;
  }
};

/**
 * Cache warming middleware
 * Pre-populates cache on application startup
 *
 * @param {Function} warmupFn - Async function that returns data to cache
 * @param {string} prefix - Cache key prefix
 * @param {number} ttl - TTL in seconds
 */
const warmCache = async (warmupFn, prefix, ttl = 300) => {
  if (!cacheService.isAvailable()) {
    logger.warn('Cache warming skipped - Redis not available');
    return;
  }

  try {
    logger.info('Starting cache warmup', { prefix });

    const data = await warmupFn();
    const cacheKey = cacheService.generateKey(prefix, {});

    await cacheService.set(cacheKey, data, ttl);

    logger.info('Cache warmup complete', { prefix, ttl });
  } catch (error) {
    logger.error('Cache warmup failed', {
      error: error.message,
      prefix,
    });
  }
};

/**
 * Conditional cache middleware
 * Only caches if condition is met
 *
 * @param {Function} conditionFn - Function that receives req and returns boolean
 * @param {string} prefix - Cache key prefix
 * @param {number} ttl - TTL in seconds
 * @returns {Function} Express middleware
 */
const cacheIf = (conditionFn, prefix, ttl = 300) => {
  return async (req, res, next) => {
    if (!conditionFn(req)) {
      res.setHeader('X-Cache', 'SKIP');
      return next();
    }

    return cache(prefix, ttl)(req, res, next);
  };
};

module.exports = {
  cache,
  invalidateCache,
  invalidatePatterns,
  warmCache,
  cacheIf,
};
