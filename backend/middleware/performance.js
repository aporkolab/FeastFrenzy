const responseTime = require('response-time');
const prometheus = require('prom-client');

/**
 * Performance monitoring middleware
 * Tracks metrics, response times, and system performance
 */

// Create Prometheus registry
const register = new prometheus.Registry();

// Add default system metrics
prometheus.collectDefaultMetrics({
  register,
  timeout: 5000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom metrics
const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

const httpRequestSize = new prometheus.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

const httpResponseSize = new prometheus.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

const databaseQueryDuration = new prometheus.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

const memoryUsage = new prometheus.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
  registers: [register],
});

// Business metrics
const employeesTotal = new prometheus.Gauge({
  name: 'employees_total',
  help: 'Total number of employees',
  registers: [register],
});

const productsTotal = new prometheus.Gauge({
  name: 'products_total',
  help: 'Total number of products',
  registers: [register],
});

const purchasesToday = new prometheus.Counter({
  name: 'purchases_today_total',
  help: 'Total purchases made today',
  registers: [register],
});

const revenueToday = new prometheus.Gauge({
  name: 'revenue_today_total',
  help: 'Total revenue generated today',
  registers: [register],
});

// Error tracking
const errorsTotal = new prometheus.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code'],
  registers: [register],
});

// Performance tracking middleware
const performanceMiddleware = () => {
  let connectionCount = 0;

  return [
    // Track connection count
    (req, res, next) => {
      connectionCount++;
      activeConnections.set(connectionCount);

      res.on('finish', () => {
        connectionCount--;
        activeConnections.set(connectionCount);
      });

      next();
    },

    // Response time tracking
    responseTime((req, res, time) => {
      const route = req.route?.path || req.path;
      const method = req.method;
      const statusCode = res.statusCode.toString();

      // Record metrics
      httpRequestsTotal.labels(method, route, statusCode).inc();
      httpRequestDuration.labels(method, route, statusCode).observe(time / 1000);

      // Track request/response sizes
      if (req.headers['content-length']) {
        httpRequestSize.labels(method, route).observe(parseInt(req.headers['content-length']));
      }

      const responseSize = res.get('content-length');
      if (responseSize) {
        httpResponseSize.labels(method, route, statusCode).observe(parseInt(responseSize));
      }
    }),

    // Memory usage tracking
    (req, res, next) => {
      const usage = process.memoryUsage();
      memoryUsage.labels('rss').set(usage.rss);
      memoryUsage.labels('heapTotal').set(usage.heapTotal);
      memoryUsage.labels('heapUsed').set(usage.heapUsed);
      memoryUsage.labels('external').set(usage.external);

      next();
    },

    // Error tracking
    (req, res, next) => {
      const originalSend = res.send;

      res.send = function (body) {
        if (res.statusCode >= 400) {
          const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
          errorsTotal.labels(errorType, res.statusCode.toString()).inc();
        }

        return originalSend.call(this, body);
      };

      next();
    },
  ];
};

// Database query tracking
const trackDatabaseQuery = (operation, table, startTime) => {
  const duration = (Date.now() - startTime) / 1000;
  databaseQueryDuration.labels(operation, table).observe(duration);
};

// Business metrics updater
const updateBusinessMetrics = async () => {
  try {
    // This would be called periodically to update business metrics
    // Implementation depends on your models being available

    // Example:
    // const employeeCount = await Employee.count();
    // employeesTotal.set(employeeCount);

    // const productCount = await Product.count();
    // productsTotal.set(productCount);

    // const todayPurchases = await Purchase.count({
    //   where: {
    //     createdAt: {
    //       [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
    //     }
    //   }
    // });
    // purchasesToday.inc(todayPurchases);

    console.log('📊 Business metrics updated');
  } catch (error) {
    console.error('❌ Failed to update business metrics:', error);
  }
};

// Performance monitoring utilities
const performanceUtils = {
  // Start a timer for custom operations
  startTimer: (name) => {
    const startTime = Date.now();
    return {
      end: () => {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`⏱️  ${name} took ${duration}s`);
        return duration;
      },
    };
  },

  // Memory snapshot
  getMemoryUsage: () => {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
    };
  },

  // CPU usage (requires periodic sampling)
  getCPUUsage: () => {
    const usage = process.cpuUsage();
    return {
      user: Math.round(usage.user / 1000),
      system: Math.round(usage.system / 1000),
    };
  },

  // Performance report
  getPerformanceReport: () => {
    return {
      uptime: process.uptime(),
      memory: performanceUtils.getMemoryUsage(),
      cpu: performanceUtils.getCPUUsage(),
      timestamp: new Date().toISOString(),
    };
  },
};

// Metrics endpoint
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error generating metrics');
  }
};

// Health check with performance data
const healthCheck = (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    performance: performanceUtils.getPerformanceReport(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  // Check if system is under stress
  const memUsage = performanceUtils.getMemoryUsage();
  if (memUsage.heapUsed > 1000) { // 1GB threshold
    health.status = 'warning';
    health.warnings = ['High memory usage'];
  }

  res.json(health);
};

// Start periodic business metrics collection
const startMetricsCollection = () => {
  // Update business metrics every 5 minutes
  setInterval(updateBusinessMetrics, 5 * 60 * 1000);

  // Initial update
  setTimeout(updateBusinessMetrics, 10000); // Wait 10s for app to initialize

  console.log('📈 Performance monitoring started');
};

module.exports = {
  // Middleware
  performance: performanceMiddleware(),

  // Endpoints
  metricsEndpoint,
  healthCheck,

  // Utilities
  trackDatabaseQuery,
  performanceUtils,
  startMetricsCollection,

  // Direct access to metrics (for custom tracking)
  metrics: {
    httpRequestsTotal,
    httpRequestDuration,
    httpRequestSize,
    httpResponseSize,
    databaseQueryDuration,
    activeConnections,
    memoryUsage,
    employeesTotal,
    productsTotal,
    purchasesToday,
    revenueToday,
    errorsTotal,
  },

  // Prometheus register
  register,
};
