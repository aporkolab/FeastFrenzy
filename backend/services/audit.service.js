const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * AuditService
 *
 * Centralized service for all audit logging operations.
 * This is where we track who did what, when, and from where.
 *
 * IMPORTANT: Audit logs should be periodically cleaned up in production.
 * Use the cleanup() method with a cron job to delete logs older than
 * your retention policy (default: 365 days). Example:
 *
 *   // Run weekly cleanup
 *   cron.schedule('0 3 * * 0', () => AuditService.cleanup(365));
 *
 * Usage:
 *   AuditService.log({ action: 'CREATE', resource: 'product', ... })
 *   AuditService.query({ userId: 1, from: '2024-01-01', ... })
 */
class AuditService {
  constructor() {
    // Lazy-load the model to avoid circular dependency issues
    this._model = null;
  }

  /**
   * Get the AuditLog model (lazy loading)
   */
  get model() {
    if (!this._model) {
      const db = require('../model');
      this._model = db.audit_logs;
    }
    return this._model;
  }

  /**
   * Log an audit entry
   *
   * @param {Object} params - Audit parameters
   * @param {number|null} params.userId - ID of user who performed action
   * @param {string} params.action - Action type (CREATE, UPDATE, DELETE, etc.)
   * @param {string} params.resource - Resource type (product, employee, etc.)
   * @param {number|null} params.resourceId - ID of affected resource
   * @param {Object|null} params.oldValue - Previous state (for UPDATE/DELETE)
   * @param {Object|null} params.newValue - New state (for CREATE/UPDATE)
   * @param {Object|null} params.req - Express request object for context
   * @returns {Promise<Object>} Created audit log entry
   */
  async log({
    userId = null,
    action,
    resource,
    resourceId = null,
    oldValue = null,
    newValue = null,
    req = null,
  }) {
    try {
      // Don't let audit logging failures break the main operation
      const sanitizedOldValue = this.sanitize(oldValue);
      const sanitizedNewValue = this.sanitize(newValue);

      const auditEntry = await this.model.create({
        userId,
        action,
        resource,
        resourceId,
        oldValue: sanitizedOldValue,
        newValue: sanitizedNewValue,
        ipAddress: this.extractIp(req),
        userAgent: req?.get?.('user-agent')?.substring(0, 500) || null,
        requestId: req?.id || null,
        timestamp: new Date(),
      });

      logger.debug('Audit log created', {
        auditId: auditEntry.id,
        action,
        resource,
        resourceId,
        userId,
        requestId: req?.id,
      });

      return auditEntry;
    } catch (error) {
      // Log the error but don't throw - audit failures shouldn't break business logic
      logger.error('Failed to create audit log', {
        error: error.message,
        action,
        resource,
        resourceId,
        userId,
      });
      return null;
    }
  }

  /**
   * Query audit logs with filtering and pagination
   *
   * @param {Object} params - Query parameters
   * @param {number} params.userId - Filter by user ID
   * @param {string} params.action - Filter by action type
   * @param {string} params.resource - Filter by resource type
   * @param {number} params.resourceId - Filter by resource ID
   * @param {string|Date} params.from - Start date filter
   * @param {string|Date} params.to - End date filter
   * @param {number} params.page - Page number (1-based)
   * @param {number} params.limit - Items per page
   * @returns {Promise<Object>} Paginated audit logs
   */
  async query({
    userId,
    action,
    resource,
    resourceId,
    from,
    to,
    page = 1,
    limit = 20,
  } = {}) {
    try {
      const where = {};

      // Build filter conditions
      if (userId !== undefined) {
        where.userId = userId;
      }

      if (action) {
        where.action = action;
      }

      if (resource) {
        where.resource = resource;
      }

      if (resourceId !== undefined) {
        where.resourceId = resourceId;
      }

      // Date range filter
      if (from || to) {
        where.timestamp = {};
        if (from) {
          where.timestamp[Op.gte] = new Date(from);
        }
        if (to) {
          where.timestamp[Op.lte] = new Date(to);
        }
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Execute query
      const queryOptions = {
        where,
        order: [['timestamp', 'DESC']],
        limit,
        offset,
      };

      // Only include user association if users model is available
      try {
        const db = require('../model');
        if (db.users) {
          queryOptions.include = [
            {
              association: 'user',
              attributes: ['id', 'name', 'email'],
              required: false, // LEFT JOIN - don't fail if user doesn't exist
            },
          ];
        }
      } catch (e) {
        // Skip user include if there's an issue
      }

      const { count, rows } = await this.model.findAndCountAll(queryOptions);

      return {
        data: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: offset + rows.length < count,
        },
      };
    } catch (error) {
      logger.error('Failed to query audit logs', {
        error: error.message,
        filters: { userId, action, resource, resourceId, from, to },
      });
      throw error;
    }
  }

  /**
   * Get audit history for a specific resource
   *
   * @param {string} resource - Resource type
   * @param {number} resourceId - Resource ID
   * @param {number} limit - Max entries to return
   * @returns {Promise<Array>} Audit log entries
   */
  async getResourceHistory(resource, resourceId, limit = 50) {
    try {
      const entries = await this.model.findAll({
        where: {
          resource,
          resourceId,
        },
        order: [['timestamp', 'DESC']],
        limit,
        include: [
          {
            association: 'user',
            attributes: ['id', 'name', 'email'],
          },
        ],
      });

      return entries;
    } catch (error) {
      logger.error('Failed to get resource history', {
        error: error.message,
        resource,
        resourceId,
      });
      throw error;
    }
  }

  /**
   * Get user activity log
   *
   * @param {number} userId - User ID
   * @param {number} limit - Max entries to return
   * @returns {Promise<Array>} Audit log entries
   */
  async getUserActivity(userId, limit = 100) {
    try {
      const entries = await this.model.findAll({
        where: { userId },
        order: [['timestamp', 'DESC']],
        limit,
      });

      return entries;
    } catch (error) {
      logger.error('Failed to get user activity', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get failed login attempts (security monitoring)
   *
   * @param {Object} options - Query options
   * @param {string|Date} options.since - Start date
   * @param {number} options.limit - Max entries
   * @returns {Promise<Array>} Failed login entries
   */
  async getFailedLogins({ since, limit = 100 } = {}) {
    try {
      const where = {
        action: 'LOGIN_FAILED',
      };

      if (since) {
        where.timestamp = {
          [Op.gte]: new Date(since),
        };
      }

      const entries = await this.model.findAll({
        where,
        order: [['timestamp', 'DESC']],
        limit,
        attributes: ['id', 'ipAddress', 'userAgent', 'timestamp', 'newValue'],
      });

      return entries;
    } catch (error) {
      logger.error('Failed to get failed logins', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clean up old audit logs (for maintenance)
   *
   * @param {number} daysToKeep - Number of days to retain logs
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanup(daysToKeep = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = await this.model.destroy({
        where: {
          timestamp: {
            [Op.lt]: cutoffDate,
          },
        },
      });

      logger.info('Audit log cleanup completed', {
        daysToKeep,
        cutoffDate,
        deletedRecords: deleted,
      });

      return deleted;
    } catch (error) {
      logger.error('Failed to cleanup audit logs', {
        error: error.message,
        daysToKeep,
      });
      throw error;
    }
  }

  /**
   * Extract client IP address from request
   * Handles proxies and load balancers
   *
   * @param {Object} req - Express request object
   * @returns {string|null} IP address
   */
  extractIp(req) {
    if (!req) {return null;}

    // Check various headers for proxied requests
    const forwarded = req.get?.('x-forwarded-for');
    if (forwarded) {
      // Take the first IP if there are multiple
      return forwarded.split(',')[0].trim();
    }

    return (
      req.get?.('x-real-ip') ||
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      null
    );
  }

  /**
   * Sanitize data before logging
   * Removes sensitive fields like passwords and tokens
   *
   * @param {Object} data - Data to sanitize
   * @returns {Object|null} Sanitized data
   */
  sanitize(data) {
    if (!data) {return null;}
    if (typeof data !== 'object') {return data;}

    // Handle Sequelize model instances - extract plain data
    if (data.dataValues) {
      data = data.dataValues;
    }

    // If it's a Sequelize model with toJSON, use that
    if (typeof data.toJSON === 'function') {
      data = data.toJSON();
    }

    // Fields that should never be logged
    const sensitiveFields = [
      'password',
      'refreshToken',
      'passwordResetToken',
      'passwordResetExpires',
      'accessToken',
      'token',
      'secret',
      'apiKey',
      'privateKey',
    ];

    const sanitized = Array.isArray(data)
      ? [...data]
      : { ...data };

    if (Array.isArray(sanitized)) {
      return sanitized.map(item => this.sanitize(item));
    }

    for (const field of sensitiveFields) {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const key of Object.keys(sanitized)) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }
}

// Export singleton instance
module.exports = new AuditService();

// Also export the class for testing
module.exports.AuditService = AuditService;
