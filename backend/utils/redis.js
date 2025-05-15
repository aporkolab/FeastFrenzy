const Redis = require('ioredis');
const logger = require('./logger');

/**
 * Redis Client Utility
 *
 * Features:
 * - Singleton pattern for connection reuse
 * - Graceful degradation when Redis is unavailable
 * - Automatic reconnection handling
 * - Comprehensive error logging
 * - Support for REDIS_URL connection string (Railway, Heroku, etc.)
 */

let client = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Get or create Redis client instance
 * @returns {Redis|null} Redis client or null if disabled
 */
const getClient = () => {
  // Check if caching is disabled
  if (process.env.CACHE_ENABLED === 'false') {
    logger.info('Redis caching is disabled via CACHE_ENABLED env var');
    return null;
  }

  if (client) {
    return client;
  }

  try {
    // Support REDIS_URL (Railway, Heroku) or individual env vars
    const redisConfig = process.env.REDIS_URL
      ? process.env.REDIS_URL
      : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB, 10) || 0,
      };

    const connectionOptions = {
      // Connection options - removed lazyConnect for auto-connect
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,

      // Reconnection strategy
      retryStrategy: (times) => {
        connectionAttempts = times;

        if (times > MAX_RECONNECT_ATTEMPTS) {
          logger.error('Redis max reconnection attempts reached', {
            attempts: times,
          });
          return null; // Stop retrying
        }

        const delay = Math.min(times * 200, 5000);
        logger.warn(`Redis reconnecting in ${delay}ms`, {
          attempt: times,
        });
        return delay;
      },

      // TLS for production (Railway uses TLS by default for Redis)
      ...(process.env.REDIS_TLS === 'true' && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
    };

    // Create client - ioredis handles URL parsing automatically
    if (typeof redisConfig === 'string') {
      client = new Redis(redisConfig, connectionOptions);
      logger.info('Redis connecting via REDIS_URL...');
    } else {
      client = new Redis({
        ...redisConfig,
        ...connectionOptions,
      });
    }

    // Event handlers
    client.on('connect', () => {
      logger.info('Redis connecting...');
    });

    client.on('ready', () => {
      isConnected = true;
      connectionAttempts = 0;
      logger.info('Redis connected and ready', {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      });
    });

    client.on('error', (err) => {
      isConnected = false;
      logger.error('Redis connection error', {
        error: err.message,
        code: err.code,
      });
    });

    client.on('close', () => {
      isConnected = false;
      logger.warn('Redis connection closed');
    });

    client.on('reconnecting', (delay) => {
      logger.info('Redis reconnecting...', { delay });
    });

    client.on('end', () => {
      isConnected = false;
      logger.info('Redis connection ended');
    });

    // ioredis connects automatically when lazyConnect is not set

  } catch (error) {
    logger.error('Redis client creation failed', {
      error: error.message,
    });
    return null;
  }

  return client;
};

/**
 * Check if Redis is connected and ready
 * @returns {boolean}
 */
const isReady = () => {
  return client && isConnected && client.status === 'ready';
};

/**
 * Disconnect Redis client gracefully
 * @returns {Promise<void>}
 */
const disconnect = async () => {
  if (client) {
    try {
      await client.quit();
      client = null;
      isConnected = false;
      logger.info('Redis disconnected gracefully');
    } catch (error) {
      logger.error('Error during Redis disconnect', {
        error: error.message,
      });
      // Force disconnect if quit fails
      client.disconnect();
      client = null;
      isConnected = false;
    }
  }
};

/**
 * Ping Redis to check connectivity
 * @returns {Promise<boolean>}
 */
const ping = async () => {
  if (!client) {
    return false;
  }

  try {
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis ping failed', { error: error.message });
    return false;
  }
};

/**
 * Get Redis info/stats
 * @param {string} section - Optional section (memory, stats, etc.)
 * @returns {Promise<Object|null>}
 */
const getInfo = async (section = null) => {
  if (!client) {
    return null;
  }

  try {
    const info = section
      ? await client.info(section)
      : await client.info();
    return parseRedisInfo(info);
  } catch (error) {
    logger.error('Failed to get Redis info', { error: error.message });
    return null;
  }
};

/**
 * Parse Redis INFO command output to object
 * @param {string} info - Raw INFO output
 * @returns {Object}
 */
const parseRedisInfo = (info) => {
  const result = {};
  const lines = info.split('\r\n');

  let currentSection = 'default';

  for (const line of lines) {
    if (line.startsWith('#')) {
      currentSection = line.substring(2).toLowerCase();
      result[currentSection] = {};
    } else if (line.includes(':')) {
      const [key, value] = line.split(':');
      if (result[currentSection]) {
        result[currentSection][key] = value;
      } else {
        result[key] = value;
      }
    }
  }

  return result;
};

/**
 * Get database size (number of keys)
 * @returns {Promise<number|null>}
 */
const getDbSize = async () => {
  if (!client) {
    return null;
  }

  try {
    return await client.dbsize();
  } catch (error) {
    logger.error('Failed to get Redis DB size', { error: error.message });
    return null;
  }
};

module.exports = {
  getClient,
  isReady,
  disconnect,
  ping,
  getInfo,
  getDbSize,
  parseRedisInfo,
};
