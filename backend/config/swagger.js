const openapiJSDoc = require('openapi-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

/**
 * Swagger/OpenAPI 3.0 Documentation Configuration
 * FeastFrenzy - Employee Cafeteria Management System
 */

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FeastFrenzy API',
      version: '1.0.0',
      description: 'Employee cafeteria management system API',
      contact: {
        name: 'Ádám Dr. Porkoláb',
        email: 'adam@feastfrenzy.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development',
      },
      {
        url: 'https://api.feastfrenzy.com/v1',
        description: 'Production',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ==================== AUTH SCHEMAS ====================
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              maxLength: 255,
              example: 'john@example.com',
            },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 128,
              description: 'Min 8 chars, must contain uppercase and number',
              example: 'SecurePass123!',
            },
          },
        },

        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
            password: {
              type: 'string',
              example: 'SecurePass123!',
            },
          },
        },

        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },

        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
          },
        },

        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: {
              type: 'string',
              example: 'a1b2c3d4e5f6...',
            },
            newPassword: {
              type: 'string',
              minLength: 8,
              maxLength: 128,
              example: 'NewSecurePass456!',
            },
          },
        },

        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', example: 'john@example.com' },
                role: {
                  type: 'string',
                  enum: ['employee', 'manager', 'admin'],
                  example: 'employee',
                },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
          },
        },

        TokensResponse: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },

        UserProfile: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', example: 'john@example.com' },
                role: { type: 'string', example: 'employee' },
                lastLogin: { type: 'string', format: 'date-time' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },

        // ==================== PRODUCT SCHEMAS ====================
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'Coffee',
            },
            price: {
              type: 'number',
              minimum: 0,
              maximum: 999999.99,
              example: 2.5,
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },

        ProductCreate: {
          type: 'object',
          required: ['name', 'price'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'Coffee',
            },
            price: {
              type: 'number',
              minimum: 0,
              maximum: 999999.99,
              example: 2.5,
            },
          },
        },

        ProductUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'Premium Coffee',
            },
            price: {
              type: 'number',
              minimum: 0,
              maximum: 999999.99,
              example: 3.0,
            },
          },
        },

        PaginatedProducts: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Product' },
            },
            meta: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },

        // ==================== EMPLOYEE SCHEMAS ====================
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'John Doe',
            },
            employee_number: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              example: 'EMP001',
            },
            monthlyConsumptionValue: {
              type: 'integer',
              minimum: 0,
              example: 50000,
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },

        EmployeeCreate: {
          type: 'object',
          required: ['name', 'employee_number', 'monthlyConsumptionValue'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'John Doe',
            },
            employee_number: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              example: 'EMP001',
            },
            monthlyConsumptionValue: {
              type: 'integer',
              minimum: 0,
              example: 50000,
            },
          },
        },

        EmployeeUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'John Doe Updated',
            },
            employee_number: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              example: 'EMP002',
            },
            monthlyConsumptionValue: {
              type: 'integer',
              minimum: 0,
              example: 75000,
            },
          },
        },

        PaginatedEmployees: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Employee' },
            },
            meta: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },

        // ==================== PURCHASE SCHEMAS ====================
        Purchase: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            date: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:30:00.000Z',
            },
            employeeId: { type: 'integer', example: 1 },
            total: {
              type: 'number',
              minimum: 0,
              maximum: 999999.99,
              example: 15.5,
            },
            closed: { type: 'boolean', example: false },
            userId: { type: 'integer', example: 1 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },

        PurchaseCreate: {
          type: 'object',
          required: ['date', 'employeeId'],
          properties: {
            date: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:30:00.000Z',
            },
            employeeId: { type: 'integer', example: 1 },
            total: {
              type: 'number',
              minimum: 0,
              maximum: 999999.99,
              example: 0,
            },
            closed: { type: 'boolean', example: false },
          },
        },

        PurchaseUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            date: { type: 'string', format: 'date-time' },
            employeeId: { type: 'integer' },
            total: { type: 'number', minimum: 0, maximum: 999999.99 },
            closed: { type: 'boolean' },
          },
        },

        PaginatedPurchases: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Purchase' },
            },
            meta: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },

        // ==================== PURCHASE ITEM SCHEMAS ====================
        PurchaseItem: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            productId: { type: 'integer', example: 1 },
            purchaseId: { type: 'integer', example: 1 },
            quantity: { type: 'integer', minimum: 1, example: 2 },
            price: { type: 'number', example: 2.5 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },

        PurchaseItemCreate: {
          type: 'object',
          required: ['productId', 'purchaseId', 'quantity', 'price'],
          properties: {
            productId: { type: 'integer', example: 1 },
            purchaseId: { type: 'integer', example: 1 },
            quantity: { type: 'integer', minimum: 1, example: 2 },
            price: {
              type: 'number',
              minimum: 0,
              maximum: 999999.99,
              example: 2.5,
            },
          },
        },

        PurchaseItemUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            quantity: { type: 'integer', minimum: 1, example: 3 },
            price: {
              type: 'number',
              minimum: 0,
              maximum: 999999.99,
              example: 3.0,
            },
          },
        },

        PaginatedPurchaseItems: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/PurchaseItem' },
            },
            meta: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },

        // ==================== COMMON SCHEMAS ====================
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 150 },
            totalPages: { type: 'integer', example: 8 },
            hasNextPage: { type: 'boolean', example: true },
            hasPrevPage: { type: 'boolean', example: false },
          },
        },

        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Validation failed' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string', example: 'email' },
                      message: {
                        type: 'string',
                        example: 'Invalid email format',
                      },
                    },
                  },
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },

        UnauthorizedError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'UNAUTHORIZED' },
                message: { type: 'string', example: 'Authentication required' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },

        ForbiddenError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'FORBIDDEN' },
                message: {
                  type: 'string',
                  example: 'Insufficient permissions',
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },

        NotFoundError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'NOT_FOUND' },
                message: { type: 'string', example: 'Resource not found' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },

        ConflictError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'CONFLICT' },
                message: {
                  type: 'string',
                  example: 'Email already registered',
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },

        LockedError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'LOCKED' },
                message: {
                  type: 'string',
                  example: 'Account locked. Try again in X minute(s)',
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },

        MessageResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Operation successful' },
          },
        },

        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              example: 'healthy',
            },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', example: 86400 },
            requestId: { type: 'string', example: 'req-123-456-789' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      { name: 'Products', description: 'Product management' },
      { name: 'Employees', description: 'Employee management' },
      { name: 'Purchases', description: 'Purchase management' },
      { name: 'Purchase Items', description: 'Purchase item management' },
      { name: 'Admin', description: 'Administrative endpoints' },
    ],
  },
  apis: [path.join(__dirname, '../controller/**/*.js')],
};

// Generate OpenAPI specification
const specs = openapiJSDoc(options);

// Swagger UI options
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'FeastFrenzy API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
  },
};

module.exports = { specs, swaggerUi, swaggerOptions };
