const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const logger = require('./logger/logger');
const httpErrors = require('http-errors');
require('dotenv').config();

const app = express();


app.use(cors());
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));


app.use('/employees', require('./controller/employee/router'));
app.use('/products', require('./controller/product/router'));
app.use('/purchases', require('./controller/purchase/router'));
app.use('/purchase-items', require('./controller/purchase-item/router'));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});


app.use((req, res, next) => {
  next(httpErrors(404, `Route ${req.method} ${req.path} not found`));
});


app.use((err, req, res, next) => {
  
  if (process.env.NODE_ENV !== 'test') {
    logger.error({
      message: err.message,
      status: err.status || 500,
      path: req.path,
      method: req.method,
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
