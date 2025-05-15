const os = require('os');
const fs = require('fs').promises;
const { promisify } = require('util');
const { execFile } = require('child_process');
const logger = require('./logger');

const execFileAsync = promisify(execFile);

/**
 * Health Check Service for Production Monitoring
 * Provides comprehensive health endpoints for load balancers and monitoring systems
 */

class HealthCheckService {
  constructor() {
    this.startTime = Date.now();
    this.customChecks = new Map();
    this.lastHealthCheckResults = new Map();

    // Cache health check results for a short period to prevent excessive checks
    this.cacheTimeout = 30000; // 30 seconds
    this.cachedResults = new Map();
  }

  /**
   * Register a custom health check
   * @param {string} name - Name of the health check
   * @param {Function} checkFunction - Async function that returns { healthy: boolean, details?: any }
   * @param {number} timeout - Timeout for the check in milliseconds
   */
  register(name, checkFunction, timeout = 5000) {
    this.customChecks.set(name, {
      name,
      check: checkFunction,
      timeout,
    });

    logger.debug(`Registered health check: ${name}`);
  }

  /**
   * Remove a custom health check
   * @param {string} name - Name of the health check to remove
   */
  unregister(name) {
    this.customChecks.delete(name);
    this.lastHealthCheckResults.delete(name);
    this.cachedResults.delete(name);

    logger.debug(`Unregistered health check: ${name}`);
  }

  /**
   * Basic liveness probe - always returns healthy unless the process is shutting down
   */
  async liveness() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      pid: process.pid,
      memory: this.getMemoryUsage(),
    };
  }

  /**
   * Readiness probe - checks if the application is ready to serve traffic
   */
  async readiness() {
    const results = await this.runAllChecks();
    const isHealthy = results.every(result => result.healthy);

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: results,
      summary: {
        total: results.length,
        healthy: results.filter(r => r.healthy).length,
        unhealthy: results.filter(r => !r.healthy).length,
      },
    };
  }

  /**
   * Comprehensive health check with detailed system information
   */
  async health() {
    const [systemHealth, applicationHealth] = await Promise.all([
      this.getSystemHealth(),
      this.readiness(),
    ]);

    return {
      status: applicationHealth.status,
      timestamp: new Date().toISOString(),
      application: applicationHealth,
      system: systemHealth,
      environment: this.getEnvironmentInfo(),
    };
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    const [diskUsage, networkConnections] = await Promise.all([
      this.getDiskUsage(),
      this.getNetworkConnections(),
    ]);

    return {
      uptime: this.getUptime(),
      memory: this.getMemoryUsage(),
      cpu: await this.getCpuUsage(),
      disk: diskUsage,
      network: networkConnections,
      load: this.getLoadAverage(),
      processes: this.getProcessInfo(),
    };
  }

  /**
   * Run all registered health checks
   */
  async runAllChecks() {
    const checkPromises = Array.from(this.customChecks.values()).map(
      async ({ name, check, timeout }) => {
        // Check cache first
        const cached = this.getCachedResult(name);
        if (cached) {
          return cached;
        }

        const startTime = Date.now();

        try {
          const result = await Promise.race([
            check(),
            this.createTimeoutPromise(timeout, name),
          ]);

          const duration = Date.now() - startTime;
          const healthResult = {
            name,
            healthy: result.healthy || false,
            duration,
            details: result.details || null,
            error: null,
            timestamp: new Date().toISOString(),
          };

          // Cache the result
          this.setCachedResult(name, healthResult);
          this.lastHealthCheckResults.set(name, healthResult);

          return healthResult;
        } catch (error) {
          const duration = Date.now() - startTime;
          const healthResult = {
            name,
            healthy: false,
            duration,
            details: null,
            error: error.message,
            timestamp: new Date().toISOString(),
          };

          // Cache the error result for a shorter time
          this.setCachedResult(name, healthResult, 5000);
          this.lastHealthCheckResults.set(name, healthResult);

          logger.error(`Health check ${name} failed`, { error });
          return healthResult;
        }
      },
    );

    return Promise.all(checkPromises);
  }

  /**
   * Create a timeout promise that rejects after the specified time
   */
  createTimeoutPromise(timeout, name) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check ${name} timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Get cached result if available and not expired
   */
  getCachedResult(name) {
    const cached = this.cachedResults.get(name);
    if (cached && Date.now() - cached.cachedAt < this.cacheTimeout) {
      return cached.result;
    }
    return null;
  }

  /**
   * Cache a health check result
   */
  setCachedResult(name, result, customTimeout = null) {
    this.cachedResults.set(name, {
      result,
      cachedAt: Date.now(),
      timeout: customTimeout || this.cacheTimeout,
    });
  }

  /**
   * Get application uptime
   */
  getUptime() {
    const uptimeMs = Date.now() - this.startTime;
    return {
      milliseconds: uptimeMs,
      seconds: Math.floor(uptimeMs / 1000),
      human: this.formatDuration(uptimeMs),
    };
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
    };

    return {
      process: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      system: {
        total: systemMemory.total,
        free: systemMemory.free,
        used: systemMemory.total - systemMemory.free,
        percentage: ((systemMemory.total - systemMemory.free) / systemMemory.total) * 100,
      },
    };
  }

  /**
   * Get CPU usage information
   */
  async getCpuUsage() {
    const cpus = os.cpus();
    const startTime = Date.now();
    const startUsage = process.cpuUsage();

    // Wait a short time to calculate CPU usage
    await new Promise(resolve => setTimeout(resolve, 100));

    const endUsage = process.cpuUsage(startUsage);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const userCpuPercent = (endUsage.user / 1000) / duration * 100;
    const systemCpuPercent = (endUsage.system / 1000) / duration * 100;

    return {
      count: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      load: os.loadavg(),
      usage: {
        user: userCpuPercent,
        system: systemCpuPercent,
        total: userCpuPercent + systemCpuPercent,
      },
    };
  }

  /**
   * Get disk usage information
   */
  async getDiskUsage() {
    try {
      // Use 'df' command to get disk usage (Unix-like systems)
      const { stdout } = await execFileAsync('df', ['-h', '/']);
      const lines = stdout.trim().split('\n');

      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        return {
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          available: parts[3],
          usePercentage: parts[4],
        };
      }
    } catch (error) {
      logger.warn('Could not get disk usage', { error });
    }

    return {
      filesystem: 'Unknown',
      size: 'Unknown',
      used: 'Unknown',
      available: 'Unknown',
      usePercentage: 'Unknown',
    };
  }

  /**
   * Get network connection information
   */
  async getNetworkConnections() {
    try {
      // Get network interface information
      const interfaces = os.networkInterfaces();
      const activeInterfaces = [];

      for (const [name, addresses] of Object.entries(interfaces)) {
        const validAddresses = addresses?.filter(addr => !addr.internal) || [];
        if (validAddresses.length > 0) {
          activeInterfaces.push({
            name,
            addresses: validAddresses.map(addr => ({
              address: addr.address,
              family: addr.family,
              netmask: addr.netmask,
            })),
          });
        }
      }

      return {
        interfaces: activeInterfaces,
        hostname: os.hostname(),
      };
    } catch (error) {
      logger.warn('Could not get network information', { error });
      return {
        interfaces: [],
        hostname: os.hostname(),
      };
    }
  }

  /**
   * Get system load average
   */
  getLoadAverage() {
    const load = os.loadavg();
    return {
      '1min': load[0],
      '5min': load[1],
      '15min': load[2],
    };
  }

  /**
   * Get process information
   */
  getProcessInfo() {
    return {
      pid: process.pid,
      ppid: process.ppid,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      title: process.title,
      argv: process.argv,
      cwd: process.cwd(),
      uid: process.getuid ? process.getuid() : null,
      gid: process.getgid ? process.getgid() : null,
    };
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo() {
    return {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      uptime: os.uptime(),
    };
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Express middleware factory for health check endpoints
   */
  middleware() {
    return {
      // Liveness probe endpoint
      liveness: async (req, res) => {
        try {
          const result = await this.liveness();
          res.status(200).json(result);
        } catch (error) {
          logger.error('Liveness check failed', { error });
          res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      },

      // Readiness probe endpoint
      readiness: async (req, res) => {
        try {
          const result = await this.readiness();
          const statusCode = result.status === 'healthy' ? 200 : 503;
          res.status(statusCode).json(result);
        } catch (error) {
          logger.error('Readiness check failed', { error });
          res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      },

      // Comprehensive health endpoint
      health: async (req, res) => {
        try {
          const result = await this.health();
          const statusCode = result.status === 'healthy' ? 200 : 503;
          res.status(statusCode).json(result);
        } catch (error) {
          logger.error('Health check failed', { error });
          res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      },
    };
  }
}

// Common health checks for typical Node.js applications
const commonChecks = {
  /**
   * Database connectivity check
   * @param {Object} db - Database instance (Sequelize, etc.)
   */
  database: (db) => async () => {
    try {
      if (db && typeof db.authenticate === 'function') {
        // Sequelize
        await db.authenticate();
      } else if (db && typeof db.raw === 'function') {
        // Knex
        await db.raw('SELECT 1');
      } else if (db && typeof db.ping === 'function') {
        // Generic ping method
        await db.ping();
      } else {
        throw new Error('Database instance does not have a recognized health check method');
      }

      return {
        healthy: true,
        details: { connectionPool: 'available' },
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error.message },
      };
    }
  },

  /**
   * Redis connectivity check
   * @param {Object} redis - Redis client instance
   */
  redis: (redis) => async () => {
    try {
      if (redis && typeof redis.ping === 'function') {
        await redis.ping();
      } else if (redis && typeof redis.get === 'function') {
        // Try a simple get operation
        await redis.get('__health_check__');
      } else {
        throw new Error('Redis instance does not have a recognized health check method');
      }

      return {
        healthy: true,
        details: { connection: 'active' },
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error.message },
      };
    }
  },

  /**
   * External API dependency check
   * @param {string} url - URL to check
   * @param {Object} options - Request options
   */
  externalApi: (url, options = {}) => async () => {
    try {
      const fetch = require('node-fetch');
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 5000,
        ...options,
      });

      const healthy = response.status >= 200 && response.status < 400;

      return {
        healthy,
        details: {
          status: response.status,
          statusText: response.statusText,
          responseTime: response.headers.get('x-response-time'),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error.message },
      };
    }
  },

  /**
   * File system check
   * @param {string} path - Path to check
   */
  fileSystem: (path) => async () => {
    try {
      await fs.access(path);
      const stats = await fs.stat(path);

      return {
        healthy: true,
        details: {
          path,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error.message, path },
      };
    }
  },

  /**
   * Memory usage check
   * @param {number} threshold - Memory usage threshold (0-1)
   */
  memoryUsage: (threshold = 0.9) => async () => {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const usedMemory = memoryUsage.rss;
    const usage = usedMemory / totalMemory;

    return {
      healthy: usage < threshold,
      details: {
        usage: Math.round(usage * 100) / 100,
        threshold,
        usedBytes: usedMemory,
        totalBytes: totalMemory,
      },
    };
  },
};

// Create singleton instance
const healthCheckService = new HealthCheckService();

module.exports = {
  healthCheckService,
  commonChecks,
};
