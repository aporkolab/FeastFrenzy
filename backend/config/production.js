/**
 * Production Environment Configuration
 * Overrides for production deployment
 */

module.exports = {
  environment: 'production',

  // Server configuration for production
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    trustProxy: true,
  },

  // Production database settings
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'feastfrenzy_prod',
    username: process.env.DB_USER || 'feastfrenzy_user',
    password: process.env.DB_PASS,
    dialect: 'mysql',
    ssl: true,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 30000,
    },
    logging: false, // No SQL logging in production
  },

  // Production JWT settings
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: '7d',
    algorithm: 'HS256',
  },

  // Enhanced security for production
  security: {
    apiKey: process.env.API_KEY,
    bcryptRounds: 12,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Strict rate limiting
    },
    cors: {
      origin: [
        'https://feastfrenzy.com',
        'https://app.feastfrenzy.com',
        'https://admin.feastfrenzy.com',
      ],
      credentials: true,
      optionsSuccessStatus: 200,
    },
    helmet: {
      contentSecurityPolicy: true,
      hsts: true,
    },
  },

  // Redis configuration for production
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: 0,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
  },

  // Production logging
  logging: {
    level: 'info',
    file: '/var/log/feastfrenzy/app.log',
    maxFiles: '30d',
    maxsize: '100m',
    format: 'json',
    colorize: false,
    timestamp: true,
  },

  // Sentry error tracking
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  },

  // Production frontend configuration
  frontend: {
    url: 'https://feastfrenzy.com',
    staticPath: '/var/www/feastfrenzy',
  },

  // Monitoring enabled in production
  monitoring: {
    enabled: true,
    metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
    healthCheckPort: parseInt(process.env.HEALTH_CHECK_PORT || '8080', 10),
    prometheus: {
      enabled: true,
      collectDefaultMetrics: true,
    },
  },

  // Performance optimizations
  performance: {
    shutdownTimeout: 30000,
    requestTimeout: 30000,
    compressionEnabled: true,
    cacheControl: {
      maxAge: 3600, // 1 hour
    },
  },

  // Production feature flags
  features: {
    debugMode: false,
    verboseLogging: false,
    developmentTools: false,
    metricsEnabled: true,
    healthChecksEnabled: true,
    rateLimitingEnabled: true,
    corsEnabled: true,
    compressionEnabled: true,
    securityHeadersEnabled: true,
    requestLoggingEnabled: true,
    errorTrackingEnabled: true,
  },
};
