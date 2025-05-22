const app = require('./server');
const logger = require('./logger/logger');
const db = require('./model');
const { getClient, disconnect: disconnectRedis } = require('./utils/redis');
const { gracefulShutdown, commonHandlers } = require('./utils/graceful-shutdown');

const port = process.env.PORT || 3000;

// Initialize Redis connection (non-blocking)
const initRedis = async () => {
  try {
    const client = getClient();
    if (client && process.env.CACHE_ENABLED !== 'false') {
      logger.info('Redis client initialized');
    }
  } catch (error) {
    logger.warn('Redis initialization failed - caching disabled', {
      error: error.message,
    });
  }
};

// Start server
const startServer = async () => {
  // Initialize Redis (non-blocking, app works without it)
  await initRedis();

  const server = app.listen(port, () => {
    logger.info(`App listening at http://localhost:${port}`);
  });

  // Register shutdown handlers
  commonHandlers.closeServer(server);
  commonHandlers.closeDatabase(db.sequelize);

  // Register Redis shutdown
  gracefulShutdown.register('redis', async () => {
    logger.info('Closing Redis connection...');
    await disconnectRedis();
  }, 3000);
};

startServer().catch(err => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});
