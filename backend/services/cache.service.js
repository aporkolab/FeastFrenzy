const { getClient, isReady } = require('../utils/redis');
const logger = require('../utils/logger');

/**
 * Cache Service
 *
 * Provides centralized caching functionality with:
 * - Graceful degradation when Redis is unavailable
 * - Key generation with prefixes
 * - Pattern-based invalidation
 * - TTL management
 * - Cache statistics
 */
class CacheService {
  constructor() {
    this.defaultTTL = parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300; // 5 minutes
    this.keyPrefix = process.env.CACHE_KEY_PREFIX || 'feastfrenzy';
  }

  /**
   * Get Redis client with null check
   * @returns {Redis|null}
   */
  getRedisClient() {
    return getClient();
  }

  /**
   * Check if caching is available
   * @returns {boolean}
   */
  isAvailable() {
    const client = this.getRedisClient();
    return client && isReady();
  }

  /**
   * Generate cache key from prefix and parameters
   * @param {string} prefix - Key prefix (e.g., 'products', 'employees')
   * @param {Object} params - Parameters to include in key
   * @returns {string}
   */
  generateKey(prefix, params = {}) {
    // Filter out undefined/null values and sort keys for consistency
    const filteredParams = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b));

    if (filteredParams.length === 0) {
      return `${this.keyPrefix}:${prefix}:all`;
    }

    const paramString = filteredParams
      .map(([key, value]) => `${key}=${value}`)
      .join(':');

    return `${this.keyPrefix}:${prefix}:${paramString}`;
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    const client = this.getRedisClient();

    if (!client) {
      return null;
    }

    try {
      const data = await client.get(key);

      if (data) {
        logger.debug('Cache hit', { key });
        return JSON.parse(data);
      }

      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Cache get error', {
        key,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Set cache value with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = this.defaultTTL) {
    const client = this.getRedisClient();

    if (!client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await client.setex(key, ttl, serialized);

      logger.debug('Cache set', { key, ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Delete cache by exact key
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async del(key) {
    const client = this.getRedisClient();

    if (!client) {
      return false;
    }

    try {
      const deleted = await client.del(key);

      logger.debug('Cache deleted', { key, deleted });
      return deleted > 0;
    } catch (error) {
      logger.error('Cache del error', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Delete cache by pattern (using SCAN for production safety)
   * @param {string} pattern - Redis pattern (e.g., 'products:*')
   * @returns {Promise<number>} Number of keys deleted
   */
  async delPattern(pattern) {
    const client = this.getRedisClient();

    if (!client) {
      return 0;
    }

    try {
      const fullPattern = `${this.keyPrefix}:${pattern}`;
      let deletedCount = 0;
      let cursor = '0';

      // Use SCAN for production safety (non-blocking)
      do {
        const [newCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          100,
        );

        cursor = newCursor;

        if (keys.length > 0) {
          const deleted = await client.del(...keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');

      if (deletedCount > 0) {
        logger.info('Cache pattern invalidated', {
          pattern: fullPattern,
          count: deletedCount,
        });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Cache delPattern error', {
        pattern,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    const client = this.getRedisClient();

    if (!client) {
      return false;
    }

    try {
      const exists = await client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Cache exists check error', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number|null>} TTL in seconds, -1 if no TTL, -2 if key doesn't exist
   */
  async ttl(key) {
    const client = this.getRedisClient();

    if (!client) {
      return null;
    }

    try {
      return await client.ttl(key);
    } catch (error) {
      logger.error('Cache TTL check error', {
        key,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Clear all cache (use with caution!)
   * @returns {Promise<boolean>}
   */
  async flush() {
    const client = this.getRedisClient();

    if (!client) {
      return false;
    }

    try {
      // Only flush keys with our prefix (safer than FLUSHDB)
      const deleted = await this.delPattern('*');

      logger.warn('Cache flushed', { deletedCount: deleted });
      return true;
    } catch (error) {
      logger.error('Cache flush error', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object|null>}
   */
  async getStats() {
    const client = this.getRedisClient();

    if (!client) {
      return {
        available: false,
        message: 'Redis not connected',
      };
    }

    try {
      const info = await client.info('memory');
      const dbSize = await client.dbsize();
      const stats = await client.info('stats');

      // Parse memory info
      const memoryInfo = {};
      info.split('\r\n').forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          memoryInfo[key] = value;
        }
      });

      // Parse stats
      const statsInfo = {};
      stats.split('\r\n').forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          statsInfo[key] = value;
        }
      });

      return {
        available: true,
        dbSize,
        memory: {
          used: memoryInfo.used_memory_human || 'unknown',
          peak: memoryInfo.used_memory_peak_human || 'unknown',
          fragmentation: memoryInfo.mem_fragmentation_ratio || 'unknown',
        },
        stats: {
          totalConnections: statsInfo.total_connections_received || 'unknown',
          totalCommands: statsInfo.total_commands_processed || 'unknown',
          keyspaceHits: statsInfo.keyspace_hits || 'unknown',
          keyspaceMisses: statsInfo.keyspace_misses || 'unknown',
          hitRate: statsInfo.keyspace_hits && statsInfo.keyspace_misses
            ? `${(
              parseInt(statsInfo.keyspace_hits, 10) /
                (parseInt(statsInfo.keyspace_hits, 10) + parseInt(statsInfo.keyspace_misses, 10)) *
                100
            ).toFixed(2) }%`
            : 'unknown',
        },
      };
    } catch (error) {
      logger.error('Failed to get cache stats', {
        error: error.message,
      });
      return {
        available: false,
        error: error.message,
      };
    }
  }

  /**
   * Get or set pattern (cache-aside)
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to call if cache miss
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<any>}
   */
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    // Try to get from cache first
    const cached = await this.get(key);

    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch fresh data
    const freshData = await fetchFn();

    // Cache the result (don't await, fire and forget)
    this.set(key, freshData, ttl).catch(err => {
      logger.error('Failed to cache fresh data', {
        key,
        error: err.message,
      });
    });

    return freshData;
  }
}

// Export singleton instance
module.exports = new CacheService();
