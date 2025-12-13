const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const logger = require('./logger/logger');
const httpErrors = require('http-errors');
const { requestIdMiddleware, getRequestId } = require('./middleware/requestId');
require('dotenv').config();

const app = express();





app.use(cors());


app.use(requestIdMiddleware);


morgan.token('request-id', (req) => req.id || '-');
app.use(morgan(':request-id :method :url :status :response-time ms', { stream: logger.stream }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));





const API_V1_PREFIX = '/api/v1';

app.use(`${API_V1_PREFIX}/employees`, require('./controller/employee/router'));
app.use(`${API_V1_PREFIX}/products`, require('./controller/product/router'));
app.use(`${API_V1_PREFIX}/purchases`, require('./controller/purchase/router'));
app.use(`${API_V1_PREFIX}/purchase-items`, require('./controller/purchase-item/router'));






app.use('/employees', (req, res) => {
  res.redirect(301, `${API_V1_PREFIX}/employees${req.url === '/' ? '' : req.url}`);
});

app.use('/products', (req, res) => {
  res.redirect(301, `${API_V1_PREFIX}/products${req.url === '/' ? '' : req.url}`);
});

app.use('/purchases', (req, res) => {
  res.redirect(301, `${API_V1_PREFIX}/purchases${req.url === '/' ? '' : req.url}`);
});

app.use('/purchase-items', (req, res) => {
  res.redirect(301, `${API_V1_PREFIX}/purchase-items${req.url === '/' ? '' : req.url}`);
});





app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: req.id,
  });
});






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
