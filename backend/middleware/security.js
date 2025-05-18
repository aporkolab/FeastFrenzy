const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const cors = require('cors');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

/**
 * Security middleware configuration for FeastFrenzy
 * Implements OWASP security best practices
 */

// Rate limiting configuration
const rateLimitConfig = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // requests per window
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/metrics';
    },
  }),

  // Strict rate limiting for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 5 : 50, // login attempts
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes',
    },
    skipSuccessfulRequests: true,
  }),

  // API endpoints rate limiting
  api: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 60 : 300, // requests per minute
    message: {
      error: 'API rate limit exceeded, please slow down.',
      retryAfter: '1 minute',
    },
  }),
};

// Slow down configuration for progressive delays
const slowDownConfig = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: process.env.NODE_ENV === 'production' ? 50 : 100, // requests before delay
  delayMs: 500, // delay per request after limit
  maxDelayMs: 5000, // maximum delay
});

// CORS configuration
const corsConfig = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {return callback(null, true);}

    const allowedOrigins = [
      'http://localhost:4200',
      'http://localhost:3000',
      'https://feastfrenzy.com',
      'https://staging.feastfrenzy.com',
      ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
    ];

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
};

// Helmet configuration for security headers
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Compatibility with some browsers
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer-when-downgrade' },
  xssFilter: true,
};

// Compression configuration
const compressionConfig = {
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress responses if the client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  },
};

// Security middleware factory
const createSecurityMiddleware = () => {
  const middleware = [];

  // Trust proxy (for load balancers/reverse proxies)
  if (process.env.NODE_ENV === 'production') {
    middleware.push((req, res, next) => {
      // Configure Express to trust the first proxy
      req.app.set('trust proxy', 1);
      next();
    });
  }

  // Compression middleware
  middleware.push(compression(compressionConfig));

  // Security headers
  middleware.push(helmet(helmetConfig));

  // CORS configuration
  middleware.push(cors(corsConfig));

  // Rate limiting
  middleware.push(rateLimitConfig.general);
  middleware.push(slowDownConfig);

  // Data sanitization
  middleware.push(mongoSanitize()); // Remove potential NoSQL injection
  middleware.push(hpp()); // Prevent HTTP Parameter Pollution

  // Custom security headers
  middleware.push((req, res, next) => {
    // Remove server information
    res.removeHeader('X-Powered-By');

    // Add custom security headers
    res.setHeader('X-API-Version', '1.0');
    res.setHeader('X-Request-ID', req.id || 'unknown');

    // Prevent caching of sensitive endpoints
    if (req.path.includes('/auth') || req.path.includes('/api')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '-1');
    }

    next();
  });

  return middleware;
};

// Export configurations and middleware
module.exports = {
  // Middleware
  security: createSecurityMiddleware(),
  rateLimitAuth: rateLimitConfig.auth,
  rateLimitApi: rateLimitConfig.api,

  // Configurations (for testing/customization)
  rateLimitConfig,
  corsConfig,
  helmetConfig,
  compressionConfig,

  // Utility functions
  createCustomRateLimit: (options) => rateLimit({ ...rateLimitConfig.general, ...options }),

  // Security validation middleware
  validateApiKey: (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKeys = process.env.API_KEYS?.split(',') || [];

    if (process.env.NODE_ENV === 'production' && validApiKeys.length > 0) {
      if (!apiKey || !validApiKeys.includes(apiKey)) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Valid API key required',
          },
        });
      }
    }
    next();
  },

  // IP whitelist middleware
  ipWhitelist: (allowedIPs = []) => (req, res, next) => {
    if (process.env.NODE_ENV === 'production' && allowedIPs.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress;
      if (!allowedIPs.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'IP_NOT_ALLOWED',
            message: 'Access denied from this IP address',
          },
        });
      }
    }
    next();
  },
};
