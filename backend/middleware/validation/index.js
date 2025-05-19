const createError = require('http-errors');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[property];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      const errorMessage = errorDetails.map(e => e.message).join('; ');

      const validationError = createError(
        400,
        `Validation failed: ${errorMessage}`,
      );
      validationError.details = errorDetails;

      return next(validationError);
    }

    req[property] = value;
    next();
  };
};

const validateBody = schema => validate(schema, 'body');

const validateParams = schema => validate(schema, 'params');

const validateQuery = schema => validate(schema, 'query');

const combineValidators = (...validators) => {
  return async (req, res, next) => {
    try {
      for (const validator of validators) {
        await new Promise((resolve, reject) => {
          validator(req, res, err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  validate,
  validateBody,
  validateParams,
  validateQuery,
  combineValidators,
};
