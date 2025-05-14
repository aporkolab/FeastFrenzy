const fs = require('fs');
const path = require('path');
const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Multi-Environment Configuration Management System
 * Provides centralized configuration with validation, environment-specific settings, and secrets management
 */

class ConfigurationManager {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.config = {};
    this.schema = null;
    this.secrets = new Map();
    this.initialized = false;
  }

  /**
   * Initialize configuration with validation
   */
  initialize() {
    if (this.initialized) {
      return this.config;
    }

    try {
      // Load environment-specific configuration
      this.loadEnvironmentConfig();

      // Set up validation schema
      this.setupValidationSchema();

      // Validate configuration
      this.validateConfiguration();

      // Load secrets
      this.loadSecrets();

      // Apply environment-specific overrides
      this.applyEnvironmentOverrides();

      this.initialized = true;

      logger.info('Configuration initialized successfully', {
        environment: this.environment,
        configKeys: Object.keys(this.config).length,
      });

      return this.config;

    } catch (error) {
      logger.error('Failed to initialize configuration', { error: error.message });
      throw error;
    }
  }

  /**
   * Load base configuration and environment-specific overrides
   */
  loadEnvironmentConfig() {
    const configDir = __dirname;

    // Load base configuration
    const baseConfigPath = path.join(configDir, 'base.js');
    if (fs.existsSync(baseConfigPath)) {
      const baseConfig = require(baseConfigPath);
      this.config = { ...baseConfig };
    }

    // Load environment-specific configuration
    const envConfigPath = path.join(configDir, `${this.environment}.js`);
    if (fs.existsSync(envConfigPath)) {
      const envConfig = require(envConfigPath);
      this.config = this.deepMerge(this.config, envConfig);
    }

    // Load local configuration overrides (not committed to git)
    const localConfigPath = path.join(configDir, 'local.js');
    if (fs.existsSync(localConfigPath)) {
      try {
        const localConfig = require(localConfigPath);
        this.config = this.deepMerge(this.config, localConfig);
        logger.debug('Local configuration overrides loaded');
      } catch (error) {
        logger.warn('Failed to load local configuration', { error: error.message });
      }
    }

    // Apply environment variables
    this.applyEnvironmentVariables();
  }

  /**
   * Apply environment variables to configuration
   */
  applyEnvironmentVariables() {
    // Database configuration
    if (process.env.DB_HOST) {this.config.database.host = process.env.DB_HOST;}
    if (process.env.DB_PORT) {this.config.database.port = parseInt(process.env.DB_PORT, 10);}
    if (process.env.DB_NAME) {this.config.database.database = process.env.DB_NAME;}
    if (process.env.DB_USER) {this.config.database.username = process.env.DB_USER;}
    if (process.env.DB_PASS) {this.config.database.password = process.env.DB_PASS;}
    if (process.env.DB_SSL) {this.config.database.ssl = process.env.DB_SSL === 'true';}

    // Server configuration
    if (process.env.PORT) {this.config.server.port = parseInt(process.env.PORT, 10);}
    if (process.env.HOST) {this.config.server.host = process.env.HOST;}
    if (process.env.CORS_ORIGIN) {
      this.config.cors.origin = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
    }

    // JWT configuration
    if (process.env.JWT_SECRET) {this.config.jwt.secret = process.env.JWT_SECRET;}
    if (process.env.JWT_EXPIRES_IN) {this.config.jwt.expiresIn = process.env.JWT_EXPIRES_IN;}
    if (process.env.JWT_REFRESH_SECRET) {this.config.jwt.refreshSecret = process.env.JWT_REFRESH_SECRET;}
    if (process.env.JWT_REFRESH_EXPIRES_IN) {this.config.jwt.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN;}

    // Security configuration
    if (process.env.API_KEY) {this.config.security.apiKey = process.env.API_KEY;}
    if (process.env.RATE_LIMIT_MAX) {this.config.security.rateLimit.max = parseInt(process.env.RATE_LIMIT_MAX, 10);}
    if (process.env.BCRYPT_ROUNDS) {this.config.security.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS, 10);}

    // Redis configuration
    if (process.env.REDIS_URL) {this.config.redis.url = process.env.REDIS_URL;}
    if (process.env.REDIS_HOST) {this.config.redis.host = process.env.REDIS_HOST;}
    if (process.env.REDIS_PORT) {this.config.redis.port = parseInt(process.env.REDIS_PORT, 10);}
    if (process.env.REDIS_PASSWORD) {this.config.redis.password = process.env.REDIS_PASSWORD;}

    // Logging configuration
    if (process.env.LOG_LEVEL) {this.config.logging.level = process.env.LOG_LEVEL;}
    if (process.env.LOG_FILE) {this.config.logging.file = process.env.LOG_FILE;}

    // External services
    if (process.env.SENTRY_DSN) {this.config.sentry.dsn = process.env.SENTRY_DSN;}
    if (process.env.FRONTEND_URL) {this.config.frontend.url = process.env.FRONTEND_URL;}

    // Monitoring
    if (process.env.METRICS_PORT) {this.config.monitoring.metricsPort = parseInt(process.env.METRICS_PORT, 10);}
    if (process.env.HEALTH_CHECK_PORT) {this.config.monitoring.healthCheckPort = parseInt(process.env.HEALTH_CHECK_PORT, 10);}

    // Performance
    if (process.env.SHUTDOWN_TIMEOUT) {this.config.performance.shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT, 10);}
    if (process.env.REQUEST_TIMEOUT) {this.config.performance.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT, 10);}
  }

  /**
   * Set up Joi validation schema for configuration
   */
  setupValidationSchema() {
    this.schema = Joi.object({
      environment: Joi.string().valid('development', 'test', 'staging', 'production').required(),

      server: Joi.object({
        port: Joi.number().integer().min(1).max(65535).required(),
        host: Joi.string().required(),
        trustProxy: Joi.boolean().required(),
      }).required(),

      database: Joi.object({
        host: Joi.string().required(),
        port: Joi.number().integer().min(1).max(65535).required(),
        database: Joi.string().required(),
        username: Joi.string().required(),
        password: Joi.string().min(1).required(),
        dialect: Joi.string().valid('mysql', 'postgres', 'sqlite', 'mariadb', 'mssql').required(),
        ssl: Joi.boolean(),
        pool: Joi.object({
          max: Joi.number().integer().min(1),
          min: Joi.number().integer().min(0),
          acquire: Joi.number().integer().min(1000),
          idle: Joi.number().integer().min(1000),
        }),
        logging: Joi.alternatives().try(Joi.boolean(), Joi.function()),
      }).required(),

      jwt: Joi.object({
        secret: Joi.string().min(32).required(),
        expiresIn: Joi.string().required(),
        refreshSecret: Joi.string().min(32).required(),
        refreshExpiresIn: Joi.string().required(),
        algorithm: Joi.string().valid('HS256', 'HS384', 'HS512').required(),
      }).required(),

      security: Joi.object({
        apiKey: Joi.string().min(16),
        bcryptRounds: Joi.number().integer().min(10).max(15).required(),
        rateLimit: Joi.object({
          windowMs: Joi.number().integer().min(1000).required(),
          max: Joi.number().integer().min(1).required(),
        }).required(),
        cors: Joi.object({
          origin: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string()),
            Joi.boolean(),
          ).required(),
          credentials: Joi.boolean(),
          optionsSuccessStatus: Joi.number().integer(),
        }),
        helmet: Joi.object({
          contentSecurityPolicy: Joi.boolean(),
          hsts: Joi.boolean(),
        }),
      }).required(),

      redis: Joi.object({
        url: Joi.string(),
        host: Joi.string(),
        port: Joi.number().integer().min(1).max(65535),
        password: Joi.string().allow(''),
        db: Joi.number().integer().min(0),
        maxRetriesPerRequest: Joi.number().integer(),
        retryDelayOnFailover: Joi.number().integer(),
        enableReadyCheck: Joi.boolean(),
      }),

      logging: Joi.object({
        level: Joi.string().valid('error', 'warn', 'info', 'debug').required(),
        file: Joi.string(),
        maxFiles: Joi.string(),
        maxsize: Joi.string(),
        format: Joi.string().valid('json', 'simple', 'combined'),
        colorize: Joi.boolean(),
        timestamp: Joi.boolean(),
      }).required(),

      sentry: Joi.object({
        dsn: Joi.string().uri(),
        environment: Joi.string(),
        tracesSampleRate: Joi.number().min(0).max(1),
        profilesSampleRate: Joi.number().min(0).max(1),
      }),

      frontend: Joi.object({
        url: Joi.string().uri().required(),
        staticPath: Joi.string(),
      }).required(),

      monitoring: Joi.object({
        enabled: Joi.boolean().required(),
        metricsPort: Joi.number().integer().min(1).max(65535),
        healthCheckPort: Joi.number().integer().min(1).max(65535),
        prometheus: Joi.object({
          enabled: Joi.boolean(),
          collectDefaultMetrics: Joi.boolean(),
        }),
      }).required(),

      performance: Joi.object({
        shutdownTimeout: Joi.number().integer().min(1000).required(),
        requestTimeout: Joi.number().integer().min(1000).required(),
        compressionEnabled: Joi.boolean(),
        cacheControl: Joi.object({
          maxAge: Joi.number().integer().min(0),
        }),
      }).required(),

      features: Joi.object().pattern(
        Joi.string(),
        Joi.boolean(),
      ),

    }).unknown(false); // Don't allow unknown keys
  }

  /**
   * Validate configuration against schema
   */
  validateConfiguration() {
    if (!this.schema) {
      throw new Error('Validation schema not set up');
    }

    const { error, value } = this.schema.validate(this.config, {
      abortEarly: false,
      allowUnknown: false,
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.error('Configuration validation failed', { validationErrors });

      throw new Error(`Configuration validation failed: ${error.message}`);
    }

    this.config = value;
    logger.debug('Configuration validation passed');
  }

  /**
   * Load secrets from various sources
   */
  loadSecrets() {
    // Load from AWS Secrets Manager, Azure Key Vault, etc.
    // This is a placeholder - implement based on your infrastructure

    if (this.environment === 'production') {
      this.loadProductionSecrets();
    } else {
      this.loadDevelopmentSecrets();
    }
  }

  /**
   * Load production secrets from secure storage
   */
  async loadProductionSecrets() {
    // Implementation would depend on your secrets management system
    // Examples: AWS Secrets Manager, Azure Key Vault, HashiCorp Vault

    logger.info('Loading production secrets from secure storage...');

    try {
      // Example implementation for AWS Secrets Manager
      if (process.env.AWS_SECRETS_MANAGER_ENABLED === 'true') {
        // const secrets = await this.loadFromAWSSecretsManager();
        // this.mergeSecrets(secrets);
      }

      // Example implementation for environment-based secrets
      const criticalSecrets = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'DB_PASSWORD',
        'API_KEY',
      ];

      const missingSecrets = criticalSecrets.filter(secret => !process.env[secret]);

      if (missingSecrets.length > 0) {
        throw new Error(`Critical secrets missing: ${missingSecrets.join(', ')}`);
      }

    } catch (error) {
      logger.error('Failed to load production secrets', { error: error.message });
      throw error;
    }
  }

  /**
   * Load development secrets
   */
  loadDevelopmentSecrets() {
    logger.debug('Using development defaults for secrets');

    // Provide sensible defaults for development
    if (!this.config.jwt.secret) {
      this.config.jwt.secret = 'development-jwt-secret-change-in-production';
      logger.warn('Using default JWT secret for development');
    }

    if (!this.config.jwt.refreshSecret) {
      this.config.jwt.refreshSecret = 'development-refresh-secret-change-in-production';
      logger.warn('Using default refresh secret for development');
    }
  }

  /**
   * Apply environment-specific overrides
   */
  applyEnvironmentOverrides() {
    switch (this.environment) {
      case 'production':
        this.applyProductionOverrides();
        break;
      case 'staging':
        this.applyStagingOverrides();
        break;
      case 'test':
        this.applyTestOverrides();
        break;
      case 'development':
        this.applyDevelopmentOverrides();
        break;
    }
  }

  /**
   * Production-specific configuration overrides
   */
  applyProductionOverrides() {
    // Enhanced security for production
    this.config.security.rateLimit.max = Math.min(this.config.security.rateLimit.max, 100);
    this.config.logging.level = 'info'; // Less verbose logging
    this.config.database.logging = false; // No SQL query logging
    this.config.performance.compressionEnabled = true;

    // Feature flags for production
    this.config.features = {
      ...this.config.features,
      debugMode: false,
      verboseLogging: false,
      developmentTools: false,
    };

    logger.info('Applied production configuration overrides');
  }

  /**
   * Staging-specific configuration overrides
   */
  applyStagingOverrides() {
    // Similar to production but with more logging
    this.config.logging.level = 'debug';
    this.config.database.logging = false;

    this.config.features = {
      ...this.config.features,
      debugMode: true,
      verboseLogging: true,
      developmentTools: false,
    };

    logger.info('Applied staging configuration overrides');
  }

  /**
   * Test-specific configuration overrides
   */
  applyTestOverrides() {
    // Fast and isolated for testing
    this.config.database.logging = false;
    this.config.logging.level = 'error'; // Minimal logging during tests
    this.config.performance.shutdownTimeout = 1000; // Fast shutdown
    this.config.security.bcryptRounds = 4; // Faster password hashing

    this.config.features = {
      ...this.config.features,
      debugMode: false,
      verboseLogging: false,
      developmentTools: true,
    };

    logger.info('Applied test configuration overrides');
  }

  /**
   * Development-specific configuration overrides
   */
  applyDevelopmentOverrides() {
    // Developer-friendly settings
    this.config.logging.level = 'debug';
    this.config.database.logging = console.log; // SQL query logging
    this.config.security.rateLimit.max = 1000; // Relaxed rate limiting

    this.config.features = {
      ...this.config.features,
      debugMode: true,
      verboseLogging: true,
      developmentTools: true,
    };

    logger.info('Applied development configuration overrides');
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Get configuration value by path
   */
  get(path, defaultValue = undefined) {
    if (!this.initialized) {
      this.initialize();
    }

    return this.getNestedValue(this.config, path) ?? defaultValue;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature) {
    return this.get(`features.${feature}`, false);
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * Check if running in production
   */
  isProduction() {
    return this.environment === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment() {
    return this.environment === 'development';
  }

  /**
   * Check if running in test mode
   */
  isTest() {
    return this.environment === 'test';
  }

  /**
   * Get full configuration object (be careful with secrets)
   */
  getFullConfig() {
    if (!this.initialized) {
      this.initialize();
    }

    return { ...this.config };
  }

  /**
   * Get sanitized configuration (without secrets) for logging
   */
  getSanitizedConfig() {
    if (!this.initialized) {
      this.initialize();
    }

    const sanitized = JSON.parse(JSON.stringify(this.config));

    // Remove sensitive information
    if (sanitized.jwt) {
      sanitized.jwt.secret = '[REDACTED]';
      sanitized.jwt.refreshSecret = '[REDACTED]';
    }

    if (sanitized.database?.password) {
      sanitized.database.password = '[REDACTED]';
    }

    if (sanitized.security?.apiKey) {
      sanitized.security.apiKey = '[REDACTED]';
    }

    if (sanitized.redis?.password) {
      sanitized.redis.password = '[REDACTED]';
    }

    return sanitized;
  }
}

// Create singleton instance
const configManager = new ConfigurationManager();

// Export convenience functions
const config = {
  init: () => configManager.initialize(),
  get: (path, defaultValue) => configManager.get(path, defaultValue),
  isFeatureEnabled: (feature) => configManager.isFeatureEnabled(feature),
  getEnvironment: () => configManager.getEnvironment(),
  isProduction: () => configManager.isProduction(),
  isDevelopment: () => configManager.isDevelopment(),
  isTest: () => configManager.isTest(),
  getFullConfig: () => configManager.getFullConfig(),
  getSanitizedConfig: () => configManager.getSanitizedConfig(),
};

module.exports = config;
