# FeastFrenzy API Documentation

This document provides comprehensive API documentation for the FeastFrenzy backend service.

## Base URL

- **Development**: `http://localhost:3000`
- **Staging**: `https://staging-api.feastfrenzy.com`
- **Production**: `https://api.feastfrenzy.com`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## HTTP Status Codes

- `200` - OK: Request successful
- `201` - Created: Resource created successfully
- `204` - No Content: Request successful, no content returned
- `400` - Bad Request: Invalid request data
- `401` - Unauthorized: Authentication required
- `403` - Forbidden: Access denied
- `404` - Not Found: Resource not found
- `409` - Conflict: Resource already exists
- `422` - Unprocessable Entity: Validation failed
- `500` - Internal Server Error: Server error

## Endpoints

### System Endpoints

#### Health Check
Get system health status.

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "environment": "production",
    "uptime": 3600,
    "database": {
      "status": "connected",
      "responseTime": 12
    },
    "redis": {
      "status": "connected",
      "responseTime": 2
    }
  }
}
```

#### Metrics
Get Prometheus metrics (requires authentication).

```http
GET /metrics
```

### Authentication Endpoints

#### Login
Authenticate user and receive JWT tokens.

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800,
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "user@example.com",
      "role": "employee"
    }
  }
}
```

#### Refresh Token
Get new access token using refresh token.

```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800
  }
}
```

#### Logout
Invalidate current tokens.

```http
POST /api/auth/logout
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Employee Endpoints

#### Get All Employees
Retrieve list of employees with pagination.

```http
GET /api/employees?page=1&limit=20&search=john&department=IT
```

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `search` (string, optional): Search by name or email
- `department` (string, optional): Filter by department
- `sortBy` (string, optional): Sort field (name, email, department, balance)
- `sortOrder` (string, optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@company.com",
      "department": "IT",
      "balance": 2500.50,
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### Get Employee by ID
Retrieve specific employee details.

```http
GET /api/employees/{id}
```

**Path Parameters:**
- `id` (integer): Employee ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@company.com",
    "department": "IT",
    "balance": 2500.50,
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "recentPurchases": [
      {
        "id": 1,
        "totalAmount": 15.50,
        "purchaseDate": "2024-01-15T12:30:00Z",
        "status": "completed"
      }
    ]
  }
}
```

#### Create Employee
Create a new employee.

```http
POST /api/employees
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@company.com",
  "department": "HR",
  "initialBalance": 1000.00
}
```

**Validation Rules:**
- `name`: Required, 2-100 characters
- `email`: Required, valid email format, unique
- `department`: Required, 2-50 characters
- `initialBalance`: Optional, positive number (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Jane Smith",
    "email": "jane.smith@company.com",
    "department": "HR",
    "balance": 1000.00,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Employee created successfully"
}
```

#### Update Employee
Update existing employee.

```http
PUT /api/employees/{id}
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john.smith@company.com",
  "department": "IT",
  "balance": 2750.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Smith",
    "email": "john.smith@company.com",
    "department": "IT",
    "balance": 2750.00,
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  },
  "message": "Employee updated successfully"
}
```

#### Delete Employee
Delete an employee (soft delete).

```http
DELETE /api/employees/{id}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee deleted successfully"
}
```

### Product Endpoints

#### Get All Products
Retrieve list of products.

```http
GET /api/products?page=1&limit=20&category=beverage&available=true
```

**Query Parameters:**
- `page` (integer, optional): Page number
- `limit` (integer, optional): Items per page
- `category` (string, optional): Filter by category
- `available` (boolean, optional): Filter by availability
- `minPrice` (number, optional): Minimum price filter
- `maxPrice` (number, optional): Maximum price filter

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Coffee",
      "description": "Premium coffee blend",
      "price": 2.50,
      "category": "beverage",
      "availability": true,
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Get Product by ID
Retrieve specific product details.

```http
GET /api/products/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Coffee",
    "description": "Premium coffee blend",
    "price": 2.50,
    "category": "beverage",
    "availability": true,
    "nutritionalInfo": {
      "calories": 5,
      "fat": 0,
      "carbs": 1,
      "protein": 0
    },
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Create Product
Create a new product.

```http
POST /api/products
```

**Request Body:**
```json
{
  "name": "Green Tea",
  "description": "Organic green tea",
  "price": 1.75,
  "category": "beverage",
  "availability": true
}
```

**Validation Rules:**
- `name`: Required, 2-100 characters, unique
- `description`: Optional, max 500 characters
- `price`: Required, positive number
- `category`: Required, 2-50 characters
- `availability`: Optional, boolean (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Green Tea",
    "description": "Organic green tea",
    "price": 1.75,
    "category": "beverage",
    "availability": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Product created successfully"
}
```

#### Update Product
Update existing product.

```http
PUT /api/products/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Premium Coffee",
    "price": 2.75,
    "updatedAt": "2024-01-15T10:35:00Z"
  },
  "message": "Product updated successfully"
}
```

#### Delete Product
Delete a product (soft delete).

```http
DELETE /api/products/{id}
```

### Purchase Endpoints

#### Get All Purchases
Retrieve list of purchases.

```http
GET /api/purchases?page=1&limit=20&employeeId=1&status=completed&startDate=2024-01-01&endDate=2024-01-31
```

**Query Parameters:**
- `employeeId` (integer, optional): Filter by employee
- `status` (string, optional): Filter by status (pending, completed, cancelled)
- `startDate` (string, optional): Start date filter (YYYY-MM-DD)
- `endDate` (string, optional): End date filter (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "employeeId": 1,
      "employeeName": "John Doe",
      "totalAmount": 15.50,
      "status": "completed",
      "purchaseDate": "2024-01-15T12:30:00Z",
      "items": [
        {
          "id": 1,
          "productId": 1,
          "productName": "Coffee",
          "quantity": 2,
          "unitPrice": 2.50,
          "totalPrice": 5.00
        },
        {
          "id": 2,
          "productId": 3,
          "productName": "Sandwich",
          "quantity": 1,
          "unitPrice": 10.50,
          "totalPrice": 10.50
        }
      ],
      "createdAt": "2024-01-15T12:30:00Z",
      "updatedAt": "2024-01-15T12:35:00Z"
    }
  ]
}
```

#### Get Purchase by ID
Retrieve specific purchase details.

```http
GET /api/purchases/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "employee": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@company.com",
      "department": "IT"
    },
    "totalAmount": 15.50,
    "status": "completed",
    "purchaseDate": "2024-01-15T12:30:00Z",
    "items": [
      {
        "id": 1,
        "product": {
          "id": 1,
          "name": "Coffee",
          "price": 2.50,
          "category": "beverage"
        },
        "quantity": 2,
        "unitPrice": 2.50,
        "totalPrice": 5.00
      }
    ],
    "paymentMethod": "account_balance",
    "notes": "Quick lunch purchase",
    "createdAt": "2024-01-15T12:30:00Z",
    "updatedAt": "2024-01-15T12:35:00Z"
  }
}
```

#### Create Purchase
Create a new purchase transaction.

```http
POST /api/purchases
```

**Request Body:**
```json
{
  "employeeId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 2
    },
    {
      "productId": 3,
      "quantity": 1
    }
  ],
  "notes": "Lunch purchase"
}
```

**Validation Rules:**
- `employeeId`: Required, must exist
- `items`: Required, array of at least 1 item
- `items.productId`: Required, must exist and be available
- `items.quantity`: Required, positive integer
- `notes`: Optional, max 500 characters

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "employeeId": 1,
    "totalAmount": 15.50,
    "status": "pending",
    "purchaseDate": "2024-01-15T14:00:00Z",
    "items": [
      {
        "id": 3,
        "productId": 1,
        "quantity": 2,
        "unitPrice": 2.50,
        "totalPrice": 5.00
      }
    ],
    "createdAt": "2024-01-15T14:00:00Z",
    "updatedAt": "2024-01-15T14:00:00Z"
  },
  "message": "Purchase created successfully"
}
```

#### Update Purchase
Update purchase status or details.

```http
PUT /api/purchases/{id}
```

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Payment confirmed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "completed",
    "updatedAt": "2024-01-15T14:05:00Z"
  },
  "message": "Purchase updated successfully"
}
```

#### Cancel Purchase
Cancel a pending purchase.

```http
DELETE /api/purchases/{id}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase cancelled successfully"
}
```

### Report Endpoints

#### Employee Consumption Report
Get monthly consumption report for employees.

```http
GET /api/reports/employee-consumption?month=2024-01&employeeId=1
```

**Query Parameters:**
- `month` (string, required): Month in YYYY-MM format
- `employeeId` (integer, optional): Specific employee filter

**Response:**
```json
{
  "success": true,
  "data": {
    "month": "2024-01",
    "totalEmployees": 45,
    "employees": [
      {
        "employeeId": 1,
        "employeeName": "John Doe",
        "department": "IT",
        "totalAmount": 125.50,
        "totalPurchases": 8,
        "averagePerPurchase": 15.69,
        "topProducts": [
          {
            "productName": "Coffee",
            "quantity": 15,
            "totalAmount": 37.50
          }
        ]
      }
    ],
    "summary": {
      "totalAmount": 5678.90,
      "totalPurchases": 234,
      "averagePerEmployee": 126.20
    }
  }
}
```

#### Product Consumption Report
Get product consumption report.

```http
GET /api/reports/product-consumption?month=2024-01&category=beverage
```

**Query Parameters:**
- `month` (string, required): Month in YYYY-MM format
- `category` (string, optional): Product category filter

**Response:**
```json
{
  "success": true,
  "data": {
    "month": "2024-01",
    "products": [
      {
        "productId": 1,
        "productName": "Coffee",
        "category": "beverage",
        "totalQuantity": 145,
        "totalRevenue": 362.50,
        "averagePrice": 2.50,
        "topConsumers": [
          {
            "employeeName": "John Doe",
            "quantity": 15,
            "amount": 37.50
          }
        ]
      }
    ],
    "summary": {
      "totalProducts": 12,
      "totalQuantity": 456,
      "totalRevenue": 2345.67
    }
  }
}
```

#### Revenue Report
Get revenue report with analytics.

```http
GET /api/reports/revenue?startDate=2024-01-01&endDate=2024-01-31&groupBy=day
```

**Query Parameters:**
- `startDate` (string, required): Start date (YYYY-MM-DD)
- `endDate` (string, required): End date (YYYY-MM-DD)
- `groupBy` (string, optional): Grouping (day, week, month)
- `department` (string, optional): Filter by department

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "summary": {
      "totalRevenue": 12345.67,
      "totalPurchases": 567,
      "averagePerPurchase": 21.78,
      "uniqueEmployees": 43
    },
    "breakdown": [
      {
        "date": "2024-01-01",
        "revenue": 234.56,
        "purchases": 12,
        "averagePerPurchase": 19.55
      }
    ],
    "topProducts": [
      {
        "productName": "Coffee",
        "revenue": 1234.50,
        "quantity": 234
      }
    ],
    "departmentBreakdown": [
      {
        "department": "IT",
        "revenue": 3456.78,
        "purchases": 145,
        "employees": 12
      }
    ]
  }
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `AUTHENTICATION_ERROR` | Authentication required or failed | 401 |
| `AUTHORIZATION_ERROR` | Access denied | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource already exists | 409 |
| `BUSINESS_LOGIC_ERROR` | Business rule violation | 422 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503 |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default**: 100 requests per 15-minute window per IP
- **Authenticated users**: 1000 requests per 15-minute window
- **Admin users**: 5000 requests per 15-minute window

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## Webhook Support

FeastFrenzy supports webhooks for real-time notifications:

### Webhook Events

- `purchase.created` - New purchase created
- `purchase.completed` - Purchase completed
- `purchase.cancelled` - Purchase cancelled
- `employee.created` - New employee added
- `product.created` - New product added
- `balance.low` - Employee balance below threshold

### Webhook Payload

```json
{
  "event": "purchase.completed",
  "timestamp": "2024-01-15T14:30:00Z",
  "data": {
    "purchaseId": 123,
    "employeeId": 45,
    "totalAmount": 15.50
  },
  "signature": "sha256=abc123..."
}
```

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:
- **Development**: `http://localhost:3000/api-docs`
- **Staging**: `https://staging-api.feastfrenzy.com/api-docs`
- **Production**: `https://api.feastfrenzy.com/api-docs`

## SDKs and Libraries

Official SDKs are available for:
- JavaScript/TypeScript: `@feastfrenzy/js-sdk`
- Python: `feastfrenzy-python`
- Java: `feastfrenzy-java`

## Support

For API support, please:
1. Check this documentation
2. Review the OpenAPI specification
3. Search existing GitHub issues
4. Create a new issue with detailed information

## Changelog

### v1.0.0 (2024-01-15)
- Initial API release
- All core endpoints implemented
- Authentication and authorization
- Comprehensive error handling
- Rate limiting and security features