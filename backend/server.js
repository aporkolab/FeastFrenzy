const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const logger = require('./logger/logger');
const httpErrors = require('http-errors');
const { requestIdMiddleware, getRequestId } = require('./middleware/requestId');
require('dotenv').config();

const app = express();

// CORS Configuration - handles Railway's separate frontend/backend domains
const getDevOrigins = () => {
  const origins = process.env.CORS_ORIGINS || 'http://localhost:4200,http://127.0.0.1:4200';
  return origins.split(',').map(o => o.trim()).filter(Boolean);
};

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
      process.env.FRONTEND_URL,
      /\.railway\.app$/, // Allow all Railway subdomains
      /\.up\.railway\.app$/,
    ].filter(Boolean) // Remove undefined/null values
    : getDevOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-Total-Count', 'X-Total-Pages'],
};

app.use(cors(corsOptions));

app.use(requestIdMiddleware);

morgan.token('request-id', req => req.id || '-');
app.use(
  morgan(':request-id :method :url :status :response-time ms', {
    stream: logger.stream,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// Swagger Documentation - skip in test environment to avoid YAML parsing overhead
if (process.env.NODE_ENV !== 'test') {
  const { specs, swaggerUi, swaggerOptions } = require('./config/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

  // Export OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}

const API_V1_PREFIX = '/api/v1';

app.use(`${API_V1_PREFIX}/auth`, require('./controller/auth/router'));

app.use(`${API_V1_PREFIX}/employees`, require('./controller/employee/router'));
app.use(`${API_V1_PREFIX}/products`, require('./controller/product/router'));
app.use(`${API_V1_PREFIX}/purchases`, require('./controller/purchase/router'));
app.use(`${API_V1_PREFIX}/users`, require('./controller/user/router'));
app.use(
  `${API_V1_PREFIX}/purchase-items`,
  require('./controller/purchase-item/router'),
);
app.use(`${API_V1_PREFIX}/admin/audit-logs`, require('./controller/audit/router'));
app.use(`${API_V1_PREFIX}/admin/cache`, require('./controller/admin/router'));

// Test endpoints - only available in test/development
if (process.env.NODE_ENV !== 'production') {
  app.use(`${API_V1_PREFIX}/test`, require('./controller/test/router'));
}

app.use('/employees', (req, res) => {
  res.redirect(
    301,
    `${API_V1_PREFIX}/employees${req.url === '/' ? '' : req.url}`,
  );
});

app.use('/products', (req, res) => {
  res.redirect(
    301,
    `${API_V1_PREFIX}/products${req.url === '/' ? '' : req.url}`,
  );
});

app.use('/purchases', (req, res) => {
  res.redirect(
    301,
    `${API_V1_PREFIX}/purchases${req.url === '/' ? '' : req.url}`,
  );
});

app.use('/purchase-items', (req, res) => {
  res.redirect(
    301,
    `${API_V1_PREFIX}/purchase-items${req.url === '/' ? '' : req.url}`,
  );
});

// Health Check Routes (Railway, Kubernetes probes)
app.use('/', require('./controller/health/router'));

app.use((req, res, next) => {
  next(httpErrors(404, `Route ${req.method} ${req.path} not found`));
});

app.use((err, req, res, next) => {
  const requestId = getRequestId(req);

  if (process.env.NODE_ENV !== 'test') {
    logger.error({
      message: err.message,
      status: err.status || 500,
      path: req.path,
      method: req.method,
      requestId,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  const statusCode = err.status || err.statusCode || 500;

  const errorResponse = {
    success: false,
    error: {
      code: err.code || getErrorCode(statusCode),
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    requestId,
    timestamp: new Date().toISOString(),
  };

  if (err.details) {
    errorResponse.error.details = err.details;
  }

  res.status(statusCode).json(errorResponse);
});

function getErrorCode(status) {
  const errorCodes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
  };
  return errorCodes[status] || 'UNKNOWN_ERROR';
}

module.exports = app;
