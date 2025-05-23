/**
 * Production-Ready FeastFrenzy Backend Server
 *
 * Production features:
 * - Graceful shutdown handling
 * - Health checks for Railway
 * - Compression
 * - Enhanced security headers
 * - Structured logging
 * - Dynamic PORT binding (Railway requirement)
 */
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();

const app = require('./server');
const { sequelize } = require('./model');
const logger = require('./logger/logger');
const { disconnect: disconnectRedis, getClient: getRedisClient } = require('./utils/redis');

// Railway provides PORT dynamically
const PORT = process.env.PORT || 3000;

// Server instance for graceful shutdown
let server;

/**
 * Initialize and start the production server
 */
async function startServer() {
  try {
    // Add compression for production
    app.use(compression());

    // Add production security headers (if not already added)
    app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for API
      crossOriginEmbedderPolicy: false,
    }));

    // Test database connection before starting
    logger.info('Testing database connection...');
    await sequelize.authenticate();
    logger.info('✅ Database connection established');

    // NOTE: In production, use migrations instead of sync
    // Run: npx sequelize-cli db:migrate
    // The sync is disabled to avoid schema conflicts
    logger.info('✅ Database ready (migrations should be run separately)');

    // Initialize Redis connection
    logger.info('Connecting to Redis...');
    const redisClient = getRedisClient();
    if (redisClient) {
      logger.info('✅ Redis client initialized');
    } else {
      logger.warn('⚠️ Redis disabled or unavailable');
    }

    // Start HTTP server
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 FeastFrenzy Backend running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        pid: process.pid,
        nodeVersion: process.version,
        memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024) }MB`,
      });
    });

    // Configure server timeouts for Railway/load balancers
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', { error: error.message });
      }
      process.exit(1);
    });

    return server;

  } catch (error) {
    logger.error('❌ Failed to start server:', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  logger.info(`⚠️  Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      logger.info('✅ HTTP server closed');

      try {
        // Close database connection
        await sequelize.close();
        logger.info('✅ Database connection closed');

        // Close Redis connection
        await disconnectRedis();
        logger.info('✅ Redis connection closed');

        logger.info('👋 Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', { error: error.message });
        process.exit(1);
      }
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('⚠️  Forcing shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
  // Don't exit on unhandled rejections, just log them
});

// Start the server
startServer();

module.exports = { app, startServer };
