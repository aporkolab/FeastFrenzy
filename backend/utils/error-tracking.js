const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const logger = require('./logger');

/**
 * Error Tracking and Alerting System
 * Provides comprehensive error monitoring, alerting, and incident response
 */

class ErrorTracker {
  constructor() {
    this.initialized = false;
    this.environment = process.env.NODE_ENV || 'development';
    this.alertRules = new Map();
    this.incidentThresholds = {
      errorRate: 0.05, // 5% error rate threshold
      responseTime: 5000, // 5 second response time threshold
      criticalErrorCount: 10, // 10 critical errors in time window
      timeWindow: 300000, // 5 minutes in milliseconds
    };
  }

  /**
   * Initialize Sentry and error tracking
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    const dsn = process.env.SENTRY_DSN;
    if (!dsn && this.environment === 'production') {
      logger.warn('Sentry DSN not provided, error tracking disabled');
      return;
    }

    if (!dsn && this.environment !== 'production') {
      logger.info('Sentry DSN not provided, skipping initialization in development');
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment: this.environment,

        // Performance monitoring
        tracesSampleRate: this.environment === 'production' ? 0.1 : 1.0,
        profilesSampleRate: this.environment === 'production' ? 0.1 : 1.0,

        // Integrations
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: null }), // Will be set later
          new Sentry.Integrations.RequestData({
            include: {
              request: ['url', 'method', 'headers', 'query_string'],
              user: ['id', 'email', 'username'],
            },
          }),
          new ProfilingIntegration(),
        ],

        // Filtering
        beforeSend: (event, hint) => {
          return this.filterEvent(event, hint);
        },

        beforeSendTransaction: (event) => {
          return this.filterTransaction(event);
        },

        // Error filtering
        ignoreErrors: [
          // Ignore common browser errors
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',

          // Ignore network errors that aren't actionable
          'NetworkError',
          'fetch',

          // Ignore validation errors (these should be handled gracefully)
          /ValidationError/,
          /CastError/,
        ],

        // Release tracking
        release: process.env.npm_package_version || process.env.VERSION || 'unknown',

        // Additional options
        maxBreadcrumbs: 100,
        attachStacktrace: true,
        sendDefaultPii: false, // Don't send personally identifiable information

        // Server name
        serverName: process.env.SERVER_NAME || require('os').hostname(),

        // Tags
        initialScope: {
          tags: {
            component: 'backend',
            service: 'feastfrenzy-api',
          },
          extra: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
          },
        },
      });

      // Set up global error handlers
      this.setupGlobalErrorHandlers();

      // Set up custom alert rules
      this.setupAlertRules();

      this.initialized = true;
      logger.info('Error tracking initialized successfully', {
        environment: this.environment,
        dsn: dsn ? `${dsn.substring(0, 50) }...` : 'none',
      });

    } catch (error) {
      logger.error('Failed to initialize error tracking', { error: error.message });
    }
  }

  /**
   * Set up Express middleware for Sentry
   */
  setupExpressMiddleware(app) {
    if (!this.initialized) {
      logger.warn('Error tracking not initialized, skipping Express middleware');
      return { requestHandler: (req, res, next) => next(), errorHandler: (err, req, res, next) => next(err) };
    }

    const requestHandler = Sentry.Handlers.requestHandler({
      user: ['id', 'email', 'role'],
      request: ['url', 'method', 'headers', 'query_string'],
      serverName: false,
    });

    const errorHandler = Sentry.Handlers.errorHandler({
      shouldHandleError: (error) => {
        // Handle all errors in production, only 4xx+ in development
        if (this.environment === 'production') {
          return true;
        }

        return error.status >= 400 || !error.status;
      },
    });

    return { requestHandler, errorHandler };
  }

  /**
   * Capture an exception with context
   */
  captureException(error, context = {}) {
    if (!this.initialized) {
      logger.error('Exception occurred (tracking disabled)', { error: error.message, context });
      return null;
    }

    return Sentry.withScope((scope) => {
      // Add context information
      if (context.user) {
        scope.setUser(context.user);
      }

      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      if (context.level) {
        scope.setLevel(context.level);
      }

      // Set fingerprint for grouping
      if (context.fingerprint) {
        scope.setFingerprint(context.fingerprint);
      }

      return Sentry.captureException(error);
    });
  }

  /**
   * Capture a message with context
   */
  captureMessage(message, level = 'info', context = {}) {
    if (!this.initialized) {
      logger[level](message, context);
      return null;
    }

    return Sentry.withScope((scope) => {
      if (context.user) {
        scope.setUser(context.user);
      }

      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      return Sentry.captureMessage(message, level);
    });
  }

  /**
   * Add breadcrumb for tracking user actions
   */
  addBreadcrumb(breadcrumb) {
    if (!this.initialized) {
      return;
    }

    Sentry.addBreadcrumb({
      timestamp: Date.now() / 1000,
      ...breadcrumb,
    });
  }

  /**
   * Set user context for all subsequent events
   */
  setUser(user) {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(user);
  }

  /**
   * Set tag for all subsequent events
   */
  setTag(key, value) {
    if (!this.initialized) {
      return;
    }

    Sentry.setTag(key, value);
  }

  /**
   * Set extra context for all subsequent events
   */
  setExtra(key, value) {
    if (!this.initialized) {
      return;
    }

    Sentry.setExtra(key, value);
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name, op = 'http') {
    if (!this.initialized) {
      return null;
    }

    return Sentry.startTransaction({ name, op });
  }

  /**
   * Filter events before sending to Sentry
   */
  filterEvent(event, hint) {
    // Don't send events in test environment
    if (this.environment === 'test') {
      return null;
    }

    // Filter out low-priority errors in production
    if (this.environment === 'production') {
      const error = hint.originalException;

      // Skip validation errors
      if (error && error.name === 'ValidationError') {
        return null;
      }

      // Skip 404 errors
      if (error && error.status === 404) {
        return null;
      }

      // Skip rate limit errors
      if (error && error.status === 429) {
        return null;
      }
    }

    // Add additional context
    event.extra = event.extra || {};
    event.extra.timestamp = new Date().toISOString();
    event.extra.processId = process.pid;
    event.extra.memoryUsage = process.memoryUsage();

    return event;
  }

  /**
   * Filter transactions before sending to Sentry
   */
  filterTransaction(event) {
    // Don't send transactions in test environment
    if (this.environment === 'test') {
      return null;
    }

    // Filter out health check requests
    if (event.transaction && event.transaction.includes('/health')) {
      return null;
    }

    // Filter out metrics requests
    if (event.transaction && event.transaction.includes('/metrics')) {
      return null;
    }

    return event;
  }

  /**
   * Set up global error handlers
   */
  setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', { reason, promise });

      this.captureException(new Error(`Unhandled Promise Rejection: ${reason}`), {
        tags: { errorType: 'unhandledRejection' },
        extra: { promise: promise.toString() },
        level: 'error',
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error });

      this.captureException(error, {
        tags: { errorType: 'uncaughtException' },
        level: 'fatal',
      });

      // Don't exit immediately in production, let graceful shutdown handle it
      if (this.environment !== 'production') {
        process.exit(1);
      }
    });
  }

  /**
   * Set up custom alert rules
   */
  setupAlertRules() {
    // High error rate alert
    this.alertRules.set('high_error_rate', {
      name: 'High Error Rate',
      condition: (metrics) => metrics.errorRate > this.incidentThresholds.errorRate,
      severity: 'warning',
      cooldown: 900000, // 15 minutes
      lastTriggered: 0,
    });

    // Critical error burst alert
    this.alertRules.set('critical_error_burst', {
      name: 'Critical Error Burst',
      condition: (metrics) => metrics.criticalErrors > this.incidentThresholds.criticalErrorCount,
      severity: 'critical',
      cooldown: 300000, // 5 minutes
      lastTriggered: 0,
    });

    // High response time alert
    this.alertRules.set('high_response_time', {
      name: 'High Response Time',
      condition: (metrics) => metrics.avgResponseTime > this.incidentThresholds.responseTime,
      severity: 'warning',
      cooldown: 1800000, // 30 minutes
      lastTriggered: 0,
    });
  }

  /**
   * Check alert rules and trigger alerts if necessary
   */
  checkAlertRules(metrics) {
    if (!this.initialized) {
      return;
    }

    const now = Date.now();

    this.alertRules.forEach((rule, ruleId) => {
      // Check if rule is in cooldown period
      if (now - rule.lastTriggered < rule.cooldown) {
        return;
      }

      // Check if condition is met
      if (rule.condition(metrics)) {
        this.triggerAlert(ruleId, rule, metrics);
        rule.lastTriggered = now;
      }
    });
  }

  /**
   * Trigger an alert
   */
  triggerAlert(ruleId, rule, metrics) {
    logger.warn(`Alert triggered: ${rule.name}`, {
      alertRule: ruleId,
      severity: rule.severity,
      metrics,
    });

    // Send to Sentry
    this.captureMessage(`Alert: ${rule.name}`, rule.severity, {
      tags: {
        alertType: 'automated',
        alertRule: ruleId,
        severity: rule.severity,
      },
      extra: {
        metrics,
        rule: {
          name: rule.name,
          condition: rule.condition.toString(),
        },
      },
    });

    // Trigger incident response if critical
    if (rule.severity === 'critical') {
      this.triggerIncidentResponse(ruleId, rule, metrics);
    }
  }

  /**
   * Trigger incident response procedures
   */
  triggerIncidentResponse(ruleId, rule, metrics) {
    logger.error(`Critical incident detected: ${rule.name}`, {
      alertRule: ruleId,
      metrics,
      action: 'incident_response_triggered',
    });

    // Create incident in Sentry
    this.captureException(new Error(`Critical Incident: ${rule.name}`), {
      tags: {
        incident: 'true',
        severity: 'critical',
        alertRule: ruleId,
      },
      extra: {
        incidentMetrics: metrics,
        responseActions: [
          'Check system health',
          'Review recent deployments',
          'Scale up resources if needed',
          'Contact on-call engineer',
        ],
      },
      level: 'fatal',
      fingerprint: [`incident-${ruleId}`],
    });

    // In a real system, this would trigger:
    // - PagerDuty/Opsgenie alerts
    // - Slack/Teams notifications
    // - Automated scaling
    // - Circuit breaker activation
  }

  /**
   * Health check for error tracking system
   */
  async healthCheck() {
    if (!this.initialized) {
      return {
        status: 'disabled',
        message: 'Error tracking not initialized',
      };
    }

    try {
      // Test connectivity by sending a test event
      const testEventId = Sentry.captureMessage('Health check test', 'debug');

      return {
        status: 'healthy',
        message: 'Error tracking operational',
        details: {
          environment: this.environment,
          initialized: this.initialized,
          testEventId,
          alertRules: this.alertRules.size,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Error tracking connection failed',
        error: error.message,
      };
    }
  }

  /**
   * Flush all pending events (useful for graceful shutdown)
   */
  async flush(timeout = 5000) {
    if (!this.initialized) {
      return true;
    }

    try {
      await Sentry.flush(timeout);
      logger.info('Error tracking events flushed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to flush error tracking events', { error: error.message });
      return false;
    }
  }

  /**
   * Close the error tracking client
   */
  async close(timeout = 5000) {
    if (!this.initialized) {
      return true;
    }

    try {
      await Sentry.close(timeout);
      this.initialized = false;
      logger.info('Error tracking client closed');
      return true;
    } catch (error) {
      logger.error('Failed to close error tracking client', { error: error.message });
      return false;
    }
  }
}

// Export singleton instance
const errorTracker = new ErrorTracker();

// Express middleware helper
const setupErrorTracking = (app) => {
  errorTracker.initialize();
  const { requestHandler, errorHandler } = errorTracker.setupExpressMiddleware(app);

  return {
    requestHandler,
    errorHandler,
    errorTracker,
  };
};

module.exports = {
  errorTracker,
  setupErrorTracking,
  ErrorTracker,
};
