const Joi = require('joi');






const passwordPattern = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

const authSchemas = {
  register: Joi.object({
    name: Joi.string().trim().min(1).max(255).required().messages({
      'string.empty': 'Name is required',
      'string.max': 'Name cannot exceed 255 characters',
      'any.required': 'Name is required',
    }),
    email: Joi.string().trim().email().max(255).required().messages({
      'string.empty': 'Email is required',
      'string.email': 'Invalid email format',
      'string.max': 'Email cannot exceed 255 characters',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).max(128).pattern(passwordPattern).required().messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter and one number',
      'any.required': 'Password is required',
    }),
  }),

  login: Joi.object({
    email: Joi.string().trim().email().required().messages({
      'string.empty': 'Email is required',
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().trim().email().required().messages({
      'string.empty': 'Email is required',
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      'string.empty': 'Reset token is required',
      'any.required': 'Reset token is required',
    }),
    newPassword: Joi.string().min(8).max(128).pattern(passwordPattern).required().messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter and one number',
      'any.required': 'New password is required',
    }),
  }),
};





const patterns = {
  id: Joi.number().integer().positive(),
  price: Joi.number().precision(2).min(0).max(999999.99),
  name: Joi.string().trim().min(1).max(255),
};


const employeeSchemas = {
  create: Joi.object({
    name: patterns.name.required()
      .messages({
        'string.empty': 'Employee name is required',
        'string.max': 'Employee name cannot exceed 255 characters',
      }),
    employee_number: Joi.string().trim().min(1).max(50).required()
      .messages({
        'string.empty': 'Employee number is required',
        'string.max': 'Employee number cannot exceed 50 characters',
      }),
    monthlyConsumptionValue: Joi.number().integer().min(0).required()
      .messages({
        'number.base': 'Monthly consumption value must be a number',
        'number.min': 'Monthly consumption value cannot be negative',
      }),
  }),

  update: Joi.object({
    name: patterns.name,
    employee_number: Joi.string().trim().min(1).max(50),
    monthlyConsumptionValue: Joi.number().integer().min(0),
  }).min(1).messages({
    'object.min': 'At least one field is required for update',
  }),
};


const productSchemas = {
  create: Joi.object({
    name: patterns.name.required()
      .messages({
        'string.empty': 'Product name is required',
        'string.max': 'Product name cannot exceed 255 characters',
      }),
    price: patterns.price.required()
      .messages({
        'number.base': 'Price must be a number',
        'number.min': 'Price cannot be negative',
        'number.max': 'Price cannot exceed 999999.99',
      }),
  }),

  update: Joi.object({
    name: patterns.name,
    price: patterns.price,
  }).min(1).messages({
    'object.min': 'At least one field is required for update',
  }),
};


const purchaseSchemas = {
  create: Joi.object({
    date: Joi.date().iso().required()
      .messages({
        'date.base': 'Date must be a valid ISO date',
        'any.required': 'Purchase date is required',
      }),
    employeeId: patterns.id.required()
      .messages({
        'number.base': 'Employee ID must be a number',
        'any.required': 'Employee ID is required',
      }),
    total: patterns.price.default(0),
    closed: Joi.boolean().default(false),
  }),

  update: Joi.object({
    date: Joi.date().iso(),
    employeeId: patterns.id,
    total: patterns.price,
    closed: Joi.boolean(),
  }).min(1).messages({
    'object.min': 'At least one field is required for update',
  }),
};


const purchaseItemSchemas = {
  create: Joi.object({
    productId: patterns.id.required()
      .messages({
        'number.base': 'Product ID must be a number',
        'any.required': 'Product ID is required',
      }),
    purchaseId: patterns.id.required()
      .messages({
        'number.base': 'Purchase ID must be a number',
        'any.required': 'Purchase ID is required',
      }),
    quantity: Joi.number().integer().min(1).required()
      .messages({
        'number.base': 'Quantity must be a number',
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Quantity is required',
      }),
    price: patterns.price.required()
      .messages({
        'number.base': 'Price must be a number',
        'any.required': 'Price is required',
      }),
  }),

  update: Joi.object({
    quantity: Joi.number().integer().min(1),
    price: patterns.price,
  }).min(1).messages({
    'object.min': 'At least one field is required for update',
  }),
};


const idParamSchema = Joi.object({
  id: patterns.id.required()
    .messages({
      'number.base': 'ID must be a valid number',
      'number.positive': 'ID must be a positive number',
    }),
});

module.exports = {
  authSchemas,
  employeeSchemas,
  productSchemas,
  purchaseSchemas,
  purchaseItemSchemas,
  idParamSchema,
};
