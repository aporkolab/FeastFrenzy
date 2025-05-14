require('dotenv').config();

/**
 * Database Configuration
 *
 * Optimized settings for each environment:
 * - Development: Query logging with timing, smaller pool
 * - Test: Minimal logging, small pool
 * - Production: Slow query logging only, optimized pool
 *
 * Supports Railway DATABASE_URL connection strings
 */

// Slow query threshold in milliseconds
const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_THRESHOLD, 10) || 100;

/**
 * Parse DATABASE_URL connection string (Railway, Heroku, etc.)
 * Format: mysql://username:password@host:port/database
 * @param {string} url - Database connection URL
 * @returns {Object|null} - Parsed connection parameters
 */
const parseDbUrl = (url) => {
  if (!url) {return null;}

  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 3306,
      database: parsed.pathname.slice(1), // Remove leading '/'
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error.message);
    return null;
  }
};

/**
 * Create a query logger that tracks execution time
 * @param {string} env - Environment name
 * @returns {Function|boolean} - Logging function or false
 */
const createQueryLogger = env => {
  if (env === 'test') {
    return false;
  }

  return (sql, timing) => {
    // Skip logging in production unless it's a slow query
    if (env === 'production' && timing < SLOW_QUERY_THRESHOLD) {
      return;
    }

    const duration = timing ? `${timing}ms` : 'N/A';
    const isSlowQuery = timing && timing >= SLOW_QUERY_THRESHOLD;

    // Format the log message
    const logMessage = {
      type: isSlowQuery ? 'SLOW_QUERY' : 'SQL',
      duration,
      sql: sql.length > 500 ? `${sql.substring(0, 500)}...` : sql,
      timestamp: new Date().toISOString(),
    };

    if (isSlowQuery) {
      console.warn('⚠️  SLOW QUERY:', JSON.stringify(logMessage, null, 2));
    } else if (process.env.DB_LOGGING === 'true') {
      console.log('📊 SQL:', logMessage.sql, `[${duration}]`);
    }
  };
};

const config = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'feastfrenzy',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      // Enable multiple statements for migrations
      multipleStatements: true,
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: false,
      freezeTableName: false,
    },
    pool: {
      max: 10, // Max connections in pool
      min: 2, // Min connections to keep warm
      acquire: 30000, // Max time (ms) to get connection
      idle: 10000, // Max time (ms) connection can be idle
      evict: 1000, // How often to check for idle connections
    },
    logging: createQueryLogger('development'),
    benchmark: true, // Enable timing measurement
    retry: {
      max: 3, // Retry failed queries up to 3 times
    },
  },

  test: {
    username: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASSWORD || '',
    database: process.env.TEST_DB_NAME || 'feastfrenzy_test',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT, 10) || 3306,
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: false,
      freezeTableName: false,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: false,
    benchmark: false,
  },

  production: {
    // Support both DATABASE_URL (Railway/Heroku) and individual env vars
    ...(process.env.DATABASE_URL
      ? parseDbUrl(process.env.DATABASE_URL)
      : {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 3306,
      }
    ),
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      ssl:
        process.env.DB_SSL === 'true'
          ? {
            require: true,
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
          : false,
      // Connection timeout
      connectTimeout: 10000,
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: false,
      freezeTableName: false,
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10, // Railway free tier - keep modest
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      acquire: 60000, // More time to get connection under load
      idle: 10000, // Release idle connections after 10s
      evict: 1000, // Check every second for idle connections
    },
    logging: createQueryLogger('production'),
    benchmark: true, // Need timing for slow query detection
    retry: {
      max: 3,
      match: [
        /Deadlock/i,
        /Lock wait timeout/i,
        /ETIMEDOUT/,
        /ECONNRESET/,
        /ECONNREFUSED/,
      ],
    },
  },
};

module.exports = config;
