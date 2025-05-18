const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const db = require('../model');

// Use same fallback as auth router to ensure consistency
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw createError(401, 'Access token required');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw createError(
        401,
        'Invalid authorization header format. Use: Bearer <token>',
      );
    }

    const token = parts[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw createError(401, 'Access token expired');
      }
      if (err.name === 'JsonWebTokenError') {
        throw createError(401, 'Invalid access token');
      }
      throw createError(401, 'Token verification failed');
    }

    const user = await db.users.findByPk(decoded.id);
    if (!user) {
      throw createError(401, 'User no longer exists');
    }

    if (!user.isActive) {
      throw createError(401, 'User account is deactivated');
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        createError(
          403,
          `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        ),
      );
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.users.findByPk(decoded.id);

      if (user && user.isActive) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        };
      }
    } catch {
      // intentionally ignored
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};
