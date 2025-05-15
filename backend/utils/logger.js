const winston = require('winston');
const path = require('path');

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint(),
);

// Development format (more readable)
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += `\n${ JSON.stringify(metadata, null, 2)}`;
    }

    return msg;
  }),
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
try {
  require('fs').mkdirSync(logsDir, { recursive: true });
} catch (error) {
  // Directory might already exist
}

// Configure transports based on environment
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.NODE_ENV === 'production' ? logFormat : devFormat,
    handleExceptions: true,
    handleRejections: true,
  }),
);

// File transports (production and development)
if (process.env.NODE_ENV !== 'test') {
  // General application log
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      level: 'info',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      handleExceptions: true,
      handleRejections: true,
    }),
  );

  // Error log
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      handleExceptions: true,
      handleRejections: true,
    }),
  );

  // Access log (HTTP requests)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 20,
    }),
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test',
});

// Custom logging methods for different contexts
logger.security = (message, metadata = {}) => {
  logger.warn(`[SECURITY] ${message}`, {
    ...metadata,
    category: 'security',
    timestamp: new Date().toISOString(),
  });
};

logger.performance = (message, metadata = {}) => {
  logger.info(`[PERFORMANCE] ${message}`, {
    ...metadata,
    category: 'performance',
    timestamp: new Date().toISOString(),
  });
};

logger.business = (message, metadata = {}) => {
  logger.info(`[BUSINESS] ${message}`, {
    ...metadata,
    category: 'business',
    timestamp: new Date().toISOString(),
  });
};

logger.database = (message, metadata = {}) => {
  logger.debug(`[DATABASE] ${message}`, {
    ...metadata,
    category: 'database',
    timestamp: new Date().toISOString(),
  });
};

logger.api = (message, metadata = {}) => {
  logger.http(`[API] ${message}`, {
    ...metadata,
    category: 'api',
    timestamp: new Date().toISOString(),
  });
};

// Request logging middleware
logger.requestMiddleware = () => {
  return (req, res, next) => {
    const startTime = Date.now();

    // Log request
    logger.api('Incoming request', {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.id,
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logLevel = res.statusCode >= 400 ? 'warn' : 'http';

      logger[logLevel]('Request completed', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        requestId: req.id,
        userAgent: req.get('User-Agent'),
        responseSize: res.get('content-length') || 0,
      });
    });

    next();
  };
};

// Error logging middleware
logger.errorMiddleware = () => {
  return (error, req, res, next) => {
    logger.error('Unhandled error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id,
      },
    });

    next(error);
  };
};

// Graceful shutdown
logger.shutdown = () => {
  return new Promise((resolve) => {
    logger.info('Shutting down logger...');
    logger.on('finish', resolve);
    logger.end();
  });
};

// Handle unhandled exceptions and rejections
if (process.env.NODE_ENV !== 'test') {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason.toString(),
      stack: reason.stack,
      promise: promise.toString(),
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });

    // Give logger time to write then exit
    setTimeout(() => process.exit(1), 1000);
  });
}

// Export logger and utilities
module.exports = logger;
