const AuditService = require('../services/audit.service');
const logger = require('../utils/logger');

/**
 * Audit Middleware Factory Functions
 *
 * These middlewares automatically log Create, Update, and Delete operations.
 * They intercept res.json() to capture the response data for logging.
 *
 * PERFORMANCE NOTE: Audit logging is fire-and-forget (async, non-blocking).
 * The response is sent immediately; audit logs are written in the background.
 * This ensures audit failures don't affect API response times.
 *
 * SECURITY NOTE: Sensitive data (passwords, tokens) is automatically redacted
 * by AuditService.sanitize() - it NEVER ends up in audit logs.
 *
 * Usage:
 *   router.post('/', auditCreate('product'), controller.create);
 *   router.put('/:id', auditUpdate('product', getOldProduct), controller.update);
 *   router.delete('/:id', auditDelete('product', getOldProduct), controller.delete);
 */

/**
 * Middleware to audit CREATE operations
 *
 * Intercepts the response to log what was created.
 *
 * @param {string} resource - Resource type (e.g., 'product', 'employee')
 * @returns {Function} Express middleware
 */
const auditCreate = resource => {
  return async (req, res, next) => {
    // Store original res.json
    const originalJson = res.json.bind(res);

    res.json = body => {
      // Only log successful creates (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Fire-and-forget: don't await, don't block the response
        const resourceId = extractResourceId(body);

        AuditService.log({
          userId: req.user?.id,
          action: 'CREATE',
          resource,
          resourceId,
          newValue: body,
          req,
        }).catch(error => {
          logger.error('Audit CREATE failed', {
            error: error.message,
            resource,
          });
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Middleware to audit UPDATE operations
 *
 * Captures the old value before update, then logs both old and new values.
 *
 * @param {string} resource - Resource type
 * @param {Function} getOldValue - Async function to fetch old value: (id) => Promise<Object>
 * @returns {Function} Express middleware
 */
const auditUpdate = (resource, getOldValue) => {
  return async (req, res, next) => {
    try {
      // Get the old value before the update happens
      const resourceId = parseInt(req.params.id, 10);

      if (getOldValue && !isNaN(resourceId)) {
        const oldValue = await getOldValue(resourceId);
        req.auditOldValue = oldValue;
      }
    } catch (error) {
      // Log but don't block the request
      logger.warn('Could not fetch old value for audit', {
        error: error.message,
        resource,
        resourceId: req.params.id,
      });
    }

    // Store original res.json
    const originalJson = res.json.bind(res);

    res.json = body => {
      // Only log successful updates (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = parseInt(req.params.id, 10);

        // Fire-and-forget: don't await, don't block the response
        AuditService.log({
          userId: req.user?.id,
          action: 'UPDATE',
          resource,
          resourceId: isNaN(resourceId) ? extractResourceId(body) : resourceId,
          oldValue: req.auditOldValue || null,
          newValue: body,
          req,
        }).catch(error => {
          logger.error('Audit UPDATE failed', {
            error: error.message,
            resource,
          });
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Middleware to audit DELETE operations
 *
 * Captures what was deleted before removal.
 *
 * @param {string} resource - Resource type
 * @param {Function} getOldValue - Async function to fetch value before delete
 * @returns {Function} Express middleware
 */
const auditDelete = (resource, getOldValue) => {
  return async (req, res, next) => {
    try {
      // Get the value before deletion
      const resourceId = parseInt(req.params.id, 10);

      if (getOldValue && !isNaN(resourceId)) {
        const oldValue = await getOldValue(resourceId);
        req.auditOldValue = oldValue;
      }
    } catch (error) {
      logger.warn('Could not fetch value for delete audit', {
        error: error.message,
        resource,
        resourceId: req.params.id,
      });
    }

    // Store original res.json
    const originalJson = res.json.bind(res);

    res.json = body => {
      // Only log successful deletes (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = parseInt(req.params.id, 10);

        // Fire-and-forget: don't await, don't block the response
        AuditService.log({
          userId: req.user?.id,
          action: 'DELETE',
          resource,
          resourceId: isNaN(resourceId) ? null : resourceId,
          oldValue: req.auditOldValue || null,
          req,
        }).catch(error => {
          logger.error('Audit DELETE failed', {
            error: error.message,
            resource,
          });
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Log authentication events manually
 * Used in auth controller for login/logout/password reset
 *
 * @param {string} action - LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_RESET
 * @param {Object} options - Logging options
 * @param {number|null} options.userId - User ID (if known)
 * @param {string|null} options.email - Email (for failed logins)
 * @param {Object} options.req - Express request object
 * @param {Object} options.metadata - Additional metadata to log
 */
const logAuthEvent = async (action, { userId = null, email = null, req, metadata = {} }) => {
  try {
    await AuditService.log({
      userId,
      action,
      resource: 'auth',
      resourceId: userId,
      newValue: {
        email,
        ...metadata,
      },
      req,
    });
  } catch (error) {
    logger.error('Failed to log auth event', {
      error: error.message,
      action,
      email,
    });
  }
};

/**
 * Helper to extract resource ID from various response formats
 *
 * @param {Object} body - Response body
 * @returns {number|null} Resource ID
 */
const extractResourceId = body => {
  if (!body) {return null;}

  // Direct ID
  if (body.id) {return body.id;}

  // Nested in data object
  if (body.data?.id) {return body.data.id;}

  // Array response (take first item)
  if (Array.isArray(body) && body[0]?.id) {return body[0].id;}

  return null;
};

/**
 * Create getter functions for common models
 * These are used to fetch old values before updates/deletes
 */
const createModelGetter = model => {
  return async id => {
    const record = await model.findByPk(id);
    return record ? record.toJSON() : null;
  };
};

module.exports = {
  auditCreate,
  auditUpdate,
  auditDelete,
  logAuthEvent,
  createModelGetter,
};
