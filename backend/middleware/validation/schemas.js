const Joi = require('joi');




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
  employeeSchemas,
  productSchemas,
  purchaseSchemas,
  purchaseItemSchemas,
  idParamSchema,
};
