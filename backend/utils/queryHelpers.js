

const { Op } = require('sequelize');
const createError = require('http-errors');


const parseSort = (sortParam, allowedFields, defaultOrder = [['id', 'ASC']]) => {
  if (!sortParam || typeof sortParam !== 'string') {
    return defaultOrder;
  }

  const sortFields = sortParam.split(',').filter(Boolean);
  
  if (sortFields.length === 0) {
    return defaultOrder;
  }

  const order = [];
  
  for (const field of sortFields) {
    const isDescending = field.startsWith('-');
    const fieldName = field.replace(/^-/, '').trim();
    
    if (!fieldName) continue;
    
    if (!allowedFields.includes(fieldName)) {
      throw createError(400, `Invalid sort field: '${fieldName}'. Allowed fields: ${allowedFields.join(', ')}`);
    }
    
    order.push([fieldName, isDescending ? 'DESC' : 'ASC']);
  }
  
  return order.length > 0 ? order : defaultOrder;
};


const OPERATORS = {
  '=': Op.eq,
  '!=': Op.ne,
  '>': Op.gt,
  '>=': Op.gte,
  '<': Op.lt,
  '<=': Op.lte,
  'LIKE': Op.like,
  'IN': Op.in,
  'NOT_IN': Op.notIn,
};


const transformValue = (value, type) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  switch (type) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    
    case 'integer':
      const int = parseInt(value, 10);
      return isNaN(int) ? null : int;
    
    case 'boolean':
      if (value === 'true' || value === '1') return true;
      if (value === 'false' || value === '0') return false;
      return null;
    
    case 'date':
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    
    case 'string':
    default:
      return String(value);
  }
};


const parseFilters = (query, filterConfig) => {
  const where = {};
  
  if (!filterConfig || typeof filterConfig !== 'object') {
    return where;
  }
  
  for (const [paramName, config] of Object.entries(filterConfig)) {
    const rawValue = query[paramName];
    
    
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }
    
    
    const fieldName = config.field || paramName;
    
    
    let value;
    if (typeof config.transform === 'function') {
      value = config.transform(rawValue);
    } else {
      value = transformValue(rawValue, config.type || 'string');
    }
    
    
    if (value === null) {
      continue;
    }
    
    
    const operator = OPERATORS[config.operator || '='];
    if (!operator) {
      throw createError(400, `Invalid operator in filter config: ${config.operator}`);
    }
    
    
    if (!where[fieldName]) {
      where[fieldName] = {};
    }
    
    
    if (typeof where[fieldName] === 'object' && !where[fieldName][operator]) {
      where[fieldName][operator] = value;
    } else if (typeof where[fieldName] === 'object') {
      
      where[fieldName] = { ...where[fieldName], [operator]: value };
    } else {
      where[fieldName] = { [operator]: value };
    }
  }
  
  return where;
};


const paginatedResponse = (data, total, pagination) => {
  const totalPages = Math.ceil(total / pagination.limit);
  
  return {
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
    },
  };
};


const buildQueryOptions = ({ pagination, where = {}, order = [], include = [], attributes }) => {
  const options = {
    where,
    order,
    limit: pagination.limit,
    offset: pagination.skip,
  };
  
  if (include.length > 0) {
    options.include = include;
  }
  
  if (attributes) {
    options.attributes = attributes;
  }
  
  return options;
};

module.exports = {
  parseSort,
  parseFilters,
  paginatedResponse,
  buildQueryOptions,
  OPERATORS,
};
