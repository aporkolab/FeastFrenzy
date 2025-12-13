const createError = require('http-errors');
const db = require('../model');

const checkOwnership = resourceType => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(createError(401, 'Authentication required'));
      }

      if (['admin', 'manager'].includes(req.user.role)) {
        return next();
      }

      const resourceId = req.params.id;

      switch (resourceType) {
        case 'purchase': {
          const purchase = await db.purchases.findByPk(resourceId);
          if (!purchase) {
            return next(createError(404, 'Purchase not found'));
          }

          if (purchase.userId !== req.user.id) {
            return next(
              createError(
                403,
                'Access denied. You can only access your own purchases.'
              )
            );
          }
          break;
        }

        case 'employee': {
          const employee = await db.employees.findByPk(resourceId);
          if (!employee) {
            return next(createError(404, 'Employee not found'));
          }

          if (employee.userId !== req.user.id) {
            return next(
              createError(
                403,
                'Access denied. You can only access your own profile.'
              )
            );
          }
          break;
        }

        default:
          return next(
            createError(500, `Unknown resource type: ${resourceType}`)
          );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

const filterByOwnership = resourceType => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Authentication required'));
    }

    if (['admin', 'manager'].includes(req.user.role)) {
      return next();
    }

    req.ownershipFilter = {
      userId: req.user.id,
    };

    next();
  };
};

const ensureOwnership = resourceType => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Authentication required'));
    }

    if (resourceType === 'purchase') {
      req.body.userId = req.user.id;
    }

    next();
  };
};

module.exports = {
  checkOwnership,
  filterByOwnership,
  ensureOwnership,
};
