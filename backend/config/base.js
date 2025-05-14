/**
 * Base Configuration
 * Default configuration values that apply to all environments
 */

module.exports = {
  // Environment (will be overridden by NODE_ENV)
  environment: 'development',

  // Server configuration
  server: {
    port: 3000,
    host: '0.0.0.0',
    trustProxy: true,
  },

  // Database configuration
  database: {
    host: 'localhost',
    port: 3306,
    database: 'feastfrenzy',
    username: 'root',
    password: process.env.DB_PASSWORD || 'change-me-in-production',
    dialect: 'mysql',
    ssl: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: false,
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production-use-env-var',
    expiresIn: '1h',
    refreshSecret: 'your-super-secret-refresh-key-change-in-production',
    refreshExpiresIn: '7d',
    algorithm: 'HS256',
  },

  // Security configuration
  security: {
    apiKey: null,
    bcryptRounds: 12,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
    },
    cors: {
      origin: ['http://localhost:4200'],
      credentials: true,
      optionsSuccessStatus: 200,
    },
    helmet: {
      contentSecurityPolicy: true,
      hsts: true,
    },
  },

  // Redis configuration (optional)
  redis: {
    host: 'localhost',
    port: 6379,
    password: '',
    db: 0,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
  },

  // Logging configuration
  logging: {
    level: 'info',
    file: null,
    maxFiles: '14d',
    maxsize: '20m',
    format: 'json',
    colorize: false,
    timestamp: true,
  },

  // Sentry error tracking configuration
  sentry: {
    dsn: null,
    environment: 'development',
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  },

  // Frontend configuration
  frontend: {
    url: 'http://localhost:4200',
    staticPath: null,
  },

  // Monitoring configuration
  monitoring: {
    enabled: true,
    metricsPort: null,
    healthCheckPort: null,
    prometheus: {
      enabled: true,
      collectDefaultMetrics: true,
    },
  },

  // Performance configuration
  performance: {
    shutdownTimeout: 30000, // 30 seconds
    requestTimeout: 30000, // 30 seconds
    compressionEnabled: false,
    cacheControl: {
      maxAge: 0,
    },
  },

  // Feature flags
  features: {
    debugMode: false,
    verboseLogging: false,
    developmentTools: false,
    metricsEnabled: true,
    healthChecksEnabled: true,
    rateLimitingEnabled: true,
    corsEnabled: true,
    compressionEnabled: false,
    securityHeadersEnabled: true,
    requestLoggingEnabled: true,
    errorTrackingEnabled: false,
  },
};
