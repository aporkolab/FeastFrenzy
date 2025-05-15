const logger = require('./logger');

/**
 * Graceful shutdown handler for production environments
 * Ensures clean termination of all resources and connections
 */

class GracefulShutdown {
  constructor() {
    this.shutdownHandlers = [];
    this.isShuttingDown = false;
    this.shutdownTimeout = process.env.SHUTDOWN_TIMEOUT || 30000; // 30 seconds

    this.setupSignalHandlers();
  }

  /**
   * Register a shutdown handler
   * @param {string} name - Name of the handler for logging
   * @param {Function} handler - Async function to execute during shutdown
   * @param {number} timeout - Max time to wait for this handler (ms)
   */
  register(name, handler, timeout = 5000) {
    this.shutdownHandlers.push({
      name,
      handler,
      timeout,
    });

    logger.debug(`Registered shutdown handler: ${name}`);
  }

  /**
   * Set up signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    // Handle termination signals
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach(signal => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, initiating graceful shutdown...`);
        this.shutdown(signal);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception - shutting down gracefully', { error });
      this.shutdown('uncaughtException', 1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection - shutting down gracefully', { reason, promise });
      this.shutdown('unhandledRejection', 1);
    });
  }

  /**
   * Execute graceful shutdown
   * @param {string} signal - The signal that triggered the shutdown
   * @param {number} exitCode - Exit code for the process
   */
  async shutdown(signal = 'unknown', exitCode = 0) {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Graceful shutdown initiated by ${signal}`);

    // Set a timeout to force exit if shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Execute all shutdown handlers
      await this.executeShutdownHandlers();

      logger.info('Graceful shutdown completed successfully');
      clearTimeout(forceExitTimeout);
      process.exit(exitCode);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  }

  /**
   * Execute all registered shutdown handlers
   */
  async executeShutdownHandlers() {
    logger.info(`Executing ${this.shutdownHandlers.length} shutdown handlers...`);

    // Execute handlers in parallel with individual timeouts
    const shutdownPromises = this.shutdownHandlers.map(async ({ name, handler, timeout }) => {
      logger.debug(`Executing shutdown handler: ${name}`);

      try {
        await Promise.race([
          handler(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Handler ${name} timed out`)), timeout),
          ),
        ]);

        logger.debug(`Shutdown handler ${name} completed successfully`);
      } catch (error) {
        logger.error(`Error in shutdown handler ${name}`, { error });
        // Continue with other handlers even if one fails
      }
    });

    await Promise.allSettled(shutdownPromises);
    logger.info('All shutdown handlers completed');
  }

  /**
   * Check if the application is shutting down
   * @returns {boolean}
   */
  isShuttingDownCheck() {
    return this.isShuttingDown;
  }

  /**
   * Express middleware to reject new requests during shutdown
   */
  middleware() {
    return (req, res, next) => {
      if (this.isShuttingDown) {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_SHUTTING_DOWN',
            message: 'Service is shutting down, please try again later',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next();
    };
  }
}

// Create singleton instance
const gracefulShutdown = new GracefulShutdown();

// Common shutdown handlers for typical Node.js applications
const commonHandlers = {
  /**
   * Close HTTP server gracefully
   * @param {http.Server} server - Express server instance
   */
  closeServer: (server) => {
    gracefulShutdown.register('http-server', async () => {
      return new Promise((resolve) => {
        logger.info('Closing HTTP server...');
        server.close((error) => {
          if (error) {
            logger.error('Error closing HTTP server', { error });
          } else {
            logger.info('HTTP server closed successfully');
          }
          resolve();
        });
      });
    }, 10000); // 10 second timeout
  },

  /**
   * Close database connections
   * @param {Object} db - Database instance (Sequelize, etc.)
   */
  closeDatabase: (db) => {
    gracefulShutdown.register('database', async () => {
      logger.info('Closing database connections...');
      try {
        if (db && typeof db.close === 'function') {
          await db.close();
        } else if (db && typeof db.destroy === 'function') {
          await db.destroy();
        }
        logger.info('Database connections closed successfully');
      } catch (error) {
        logger.error('Error closing database connections', { error });
        throw error;
      }
    }, 5000); // 5 second timeout
  },

  /**
   * Close Redis connections
   * @param {Object} redis - Redis client instance
   */
  closeRedis: (redis) => {
    gracefulShutdown.register('redis', async () => {
      logger.info('Closing Redis connections...');
      try {
        if (redis && typeof redis.disconnect === 'function') {
          await redis.disconnect();
        } else if (redis && typeof redis.quit === 'function') {
          await redis.quit();
        }
        logger.info('Redis connections closed successfully');
      } catch (error) {
        logger.error('Error closing Redis connections', { error });
        throw error;
      }
    }, 3000); // 3 second timeout
  },

  /**
   * Close logger and flush remaining logs
   * @param {Object} logger - Winston logger instance
   */
  closeLogger: (logger) => {
    gracefulShutdown.register('logger', async () => {
      if (logger && typeof logger.shutdown === 'function') {
        logger.info('Flushing remaining logs...');
        await logger.shutdown();
      }
    }, 2000); // 2 second timeout
  },

  /**
   * Cancel scheduled jobs/crons
   * @param {Array} jobs - Array of scheduled jobs
   */
  cancelJobs: (jobs = []) => {
    gracefulShutdown.register('scheduled-jobs', async () => {
      logger.info(`Cancelling ${jobs.length} scheduled jobs...`);

      for (const job of jobs) {
        try {
          if (job && typeof job.cancel === 'function') {
            job.cancel();
          } else if (job && typeof job.destroy === 'function') {
            job.destroy();
          }
        } catch (error) {
          logger.error('Error cancelling job', { error, job });
        }
      }

      logger.info('Scheduled jobs cancelled');
    }, 1000); // 1 second timeout
  },

  /**
   * Wait for ongoing requests to complete
   * @param {number} maxWaitTime - Maximum time to wait (ms)
   */
  waitForOngoingRequests: (maxWaitTime = 5000) => {
    gracefulShutdown.register('ongoing-requests', async () => {
      logger.info('Waiting for ongoing requests to complete...');

      // This would need to be implemented based on your request tracking
      // For example, you could track active request counts

      await new Promise(resolve => setTimeout(resolve, Math.min(maxWaitTime, 2000)));
      logger.info('Ongoing requests handling completed');
    }, maxWaitTime + 1000);
  },
};

module.exports = {
  gracefulShutdown,
  commonHandlers,
};
