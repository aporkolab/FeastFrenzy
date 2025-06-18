import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';

/**
 * K6 Load Testing Configuration for FeastFrenzy API
 *
 * This script provides comprehensive load testing scenarios including:
 * - Authentication flow testing
 * - CRUD operations performance
 * - Concurrent user simulation
 * - Performance threshold validation
 * - Stress testing capabilities
 */

// Custom metrics
const authSuccessRate = new Rate('auth_success_rate');
const employeeCrudRate = new Rate('employee_crud_success_rate');
const productCrudRate = new Rate('product_crud_success_rate');
const purchaseFlowRate = new Rate('purchase_flow_success_rate');
const apiResponseTime = new Trend('api_response_time');
const concurrentUsers = new Gauge('concurrent_users');

// Test data
const testUsers = new SharedArray('users', (() => {
  return [
    { email: 'admin@feastfrenzy.com', password: 'AdminPassword123', role: 'admin' },
    { email: 'manager@feastfrenzy.com', password: 'ManagerPassword123', role: 'manager' },
    { email: 'employee1@feastfrenzy.com', password: 'Password123', role: 'employee' },
    { email: 'employee2@feastfrenzy.com', password: 'Password123', role: 'employee' },
    { email: 'employee3@feastfrenzy.com', password: 'Password123', role: 'employee' },
  ];
}));

const testProducts = new SharedArray('products', (() => {
  return [
    { name: 'Coffee', price: 2.50, category: 'Beverages' },
    { name: 'Sandwich', price: 5.99, category: 'Food' },
    { name: 'Apple', price: 1.25, category: 'Snacks' },
    { name: 'Water', price: 1.00, category: 'Beverages' },
    { name: 'Chips', price: 2.00, category: 'Snacks' },
  ];
}));

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const THINK_TIME = __ENV.THINK_TIME || 2; // seconds between requests

// Test scenarios configuration
export const options = {
  scenarios: {
    // Smoke test - minimal load to verify basic functionality
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
      env: { SCENARIO: 'smoke' },
    },

    // Load test - normal expected load
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 }, // Ramp up
        { duration: '5m', target: 10 }, // Stay at 10 users
        { duration: '2m', target: 20 }, // Ramp to 20 users
        { duration: '5m', target: 20 }, // Stay at 20 users
        { duration: '2m', target: 0 }, // Ramp down
      ],
      tags: { test_type: 'load' },
      env: { SCENARIO: 'load' },
    },

    // Stress test - high load to find breaking point
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 }, // Ramp up to normal load
        { duration: '5m', target: 20 },
        { duration: '2m', target: 50 }, // Ramp up to high load
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 }, // Stress level
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 }, // Ramp down
      ],
      tags: { test_type: 'stress' },
      env: { SCENARIO: 'stress' },
    },

    // Spike test - sudden load increase
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 }, // Normal load
        { duration: '30s', target: 100 }, // Spike!
        { duration: '3m', target: 100 }, // Stay at spike
        { duration: '1m', target: 10 }, // Scale down
        { duration: '2m', target: 0 }, // Recovery
      ],
      tags: { test_type: 'spike' },
      env: { SCENARIO: 'spike' },
    },

    // Volume test - large amounts of data
    volume_test: {
      executor: 'constant-vus',
      vus: 5,
      duration: '10m',
      tags: { test_type: 'volume' },
      env: { SCENARIO: 'volume' },
    },

    // Soak test - extended duration
    soak_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1h',
      tags: { test_type: 'soak' },
      env: { SCENARIO: 'soak' },
    },
  },

  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'], // Error rate must be below 10%
    auth_success_rate: ['rate>0.95'], // Auth success rate above 95%
    employee_crud_success_rate: ['rate>0.9'], // CRUD operations success rate
    product_crud_success_rate: ['rate>0.9'],
    purchase_flow_success_rate: ['rate>0.9'],

    // Scenario-specific thresholds
    'http_req_duration{test_type:smoke}': ['p(95)<200'],
    'http_req_duration{test_type:load}': ['p(95)<500'],
    'http_req_duration{test_type:stress}': ['p(95)<1000'],
    'http_req_failed{test_type:smoke}': ['rate<0.01'],
    'http_req_failed{test_type:load}': ['rate<0.05'],
    'http_req_failed{test_type:stress}': ['rate<0.2'],
  },

  // Global settings
  userAgent: 'K6LoadTest/1.0',
  insecureSkipTLSVerify: true, // For local testing with self-signed certificates

  // Teardown timeout
  teardownTimeout: '30s',
};

// Test setup
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);

  // Verify API is accessible
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    fail(`API health check failed: ${response.status}`);
  }

  console.log('API health check passed');

  // Pre-create some test data for consistent testing
  const adminToken = authenticateUser(testUsers[0]);
  if (adminToken) {
    setupTestData(adminToken);
  }

  return { baseUrl: BASE_URL };
}

// Main test function
export default function (data) {
  concurrentUsers.add(1);

  const scenario = __ENV.SCENARIO || 'load';
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  // Execute test scenario
  switch (scenario) {
    case 'smoke':
      smokeTest(user);
      break;
    case 'volume':
      volumeTest(user);
      break;
    case 'soak':
      soakTest(user);
      break;
    default:
      standardLoadTest(user);
  }

  sleep(Math.random() * THINK_TIME + 1); // Random think time
}

/**
 * Smoke test - basic functionality verification
 */
function smokeTest(user) {
  group('Smoke Test', () => {
    // Basic health check
    const healthResponse = http.get(`${BASE_URL}/health`);
    check(healthResponse, {
      'health check status is 200': (r) => r.status === 200,
      'health check has correct structure': (r) => {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('status') && body.hasOwnProperty('timestamp');
      },
    });

    // Basic authentication
    const token = authenticateUser(user);
    if (token) {
      authSuccessRate.add(1);

      // Simple API call
      const profileResponse = http.get(`${BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      check(profileResponse, {
        'profile fetch successful': (r) => r.status === 200,
      });
    } else {
      authSuccessRate.add(0);
    }
  });
}

/**
 * Standard load test with mixed operations
 */
function standardLoadTest(user) {
  group('Authentication Flow', () => {
    const token = authenticateUser(user);
    if (!token) {
      authSuccessRate.add(0);
      return;
    }
    authSuccessRate.add(1);

    // Simulate user session
    group('User Session', () => {
      performUserActions(token, user.role);
    });
  });
}

/**
 * Volume test - creates large amounts of data
 */
function volumeTest(user) {
  const token = authenticateUser(user);
  if (!token) {return;}

  group('Volume Test - Bulk Operations', () => {
    // Create multiple employees (if admin/manager)
    if (user.role === 'admin' || user.role === 'manager') {
      for (let i = 0; i < 10; i++) {
        createEmployee(token, {
          name: `Volume Test Employee ${i}`,
          email: `volume.test.${i}.${Date.now()}@feastfrenzy.com`,
          employeeId: `VOL${i}${Date.now()}`,
          role: 'employee',
          department: 'Test Department',
        });

        if (i % 3 === 0) {sleep(0.1);} // Brief pause every 3 requests
      }
    }

    // Fetch large datasets
    fetchWithPagination(`${BASE_URL}/api/employees`, token, 50);
    fetchWithPagination(`${BASE_URL}/api/products`, token, 100);
  });
}

/**
 * Soak test - sustained load over time
 */
function soakTest(user) {
  // Lighter operations for sustained testing
  const token = authenticateUser(user);
  if (!token) {return;}

  group('Soak Test - Sustained Operations', () => {
    // Lighter read operations
    const endpoints = [
      '/api/employees',
      '/api/products',
      '/api/purchases',
      '/api/auth/profile',
    ];

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const response = http.get(`${BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    check(response, {
      'soak test endpoint responsive': (r) => r.status === 200,
    });
  });
}

/**
 * Authenticate user and return JWT token
 */
function authenticateUser(user) {
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  apiResponseTime.add(loginResponse.timings.duration);

  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.token;
      } catch (e) {
        return false;
      }
    },
  });

  if (loginSuccess) {
    const body = JSON.parse(loginResponse.body);
    return body.data.token;
  }

  return null;
}

/**
 * Perform role-specific user actions
 */
function performUserActions(token, role) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Common actions for all users
  group('Common Actions', () => {
    // Fetch profile
    const profileResponse = http.get(`${BASE_URL}/api/auth/profile`, { headers });
    check(profileResponse, {
      'profile fetch successful': (r) => r.status === 200,
    });

    // Browse products
    const productsResponse = http.get(`${BASE_URL}/api/products?limit=10`, { headers });
    check(productsResponse, {
      'products list successful': (r) => r.status === 200,
    });
  });

  // Role-specific actions
  if (role === 'admin') {
    performAdminActions(token, headers);
  } else if (role === 'manager') {
    performManagerActions(token, headers);
  } else {
    performEmployeeActions(token, headers);
  }
}

/**
 * Admin-specific actions
 */
function performAdminActions(token, headers) {
  group('Admin Actions', () => {
    // Employee management
    const employeeData = {
      name: `Test Employee ${Date.now()}`,
      email: `test.${Date.now()}@feastfrenzy.com`,
      employeeId: `EMP${Date.now()}`,
      role: 'employee',
      department: 'Testing',
      balance: 100.00,
    };

    const createdEmployee = createEmployee(token, employeeData);
    if (createdEmployee) {
      // Update employee
      const updateData = { ...employeeData, balance: 150.00 };
      const updateResponse = http.put(
        `${BASE_URL}/api/employees/${createdEmployee.id}`,
        JSON.stringify(updateData),
        { headers },
      );

      const updateSuccess = check(updateResponse, {
        'employee update successful': (r) => r.status === 200,
      });

      employeeCrudRate.add(updateSuccess ? 1 : 0);

      // Delete employee (cleanup)
      const deleteResponse = http.del(`${BASE_URL}/api/employees/${createdEmployee.id}`, { headers });
      check(deleteResponse, {
        'employee delete successful': (r) => r.status === 200 || r.status === 204,
      });
    }

    // Product management
    const productData = testProducts[Math.floor(Math.random() * testProducts.length)];
    const testProduct = {
      ...productData,
      name: `${productData.name} ${Date.now()}`,
    };

    const createdProduct = createProduct(token, testProduct);
    if (createdProduct) {
      productCrudRate.add(1);
    } else {
      productCrudRate.add(0);
    }
  });
}

/**
 * Manager-specific actions
 */
function performManagerActions(token, headers) {
  group('Manager Actions', () => {
    // Employee management (limited)
    const employeesResponse = http.get(`${BASE_URL}/api/employees`, { headers });
    check(employeesResponse, {
      'employees list for manager': (r) => r.status === 200,
    });

    // Reports access
    const reportsResponse = http.get(`${BASE_URL}/api/purchases/reports`, { headers });
    check(reportsResponse, {
      'reports access for manager': (r) => r.status === 200 || r.status === 403,
    });

    // Product browsing
    const productsResponse = http.get(`${BASE_URL}/api/products`, { headers });
    check(productsResponse, {
      'products access for manager': (r) => r.status === 200,
    });
  });
}

/**
 * Employee-specific actions
 */
function performEmployeeActions(token, headers) {
  group('Employee Actions', () => {
    // Make purchase
    const purchaseData = {
      items: [
        {
          productId: 1, // Assuming product exists
          quantity: Math.floor(Math.random() * 3) + 1,
          unitPrice: 2.50,
        },
      ],
    };

    const purchaseResponse = http.post(
      `${BASE_URL}/api/purchases`,
      JSON.stringify(purchaseData),
      { headers },
    );

    const purchaseSuccess = check(purchaseResponse, {
      'purchase creation successful': (r) => r.status === 201 || r.status === 200,
    });

    purchaseFlowRate.add(purchaseSuccess ? 1 : 0);

    // Check purchase history
    const historyResponse = http.get(`${BASE_URL}/api/purchases/my-purchases`, { headers });
    check(historyResponse, {
      'purchase history accessible': (r) => r.status === 200,
    });

    // Check balance
    const balanceResponse = http.get(`${BASE_URL}/api/employees/my-balance`, { headers });
    check(balanceResponse, {
      'balance check successful': (r) => r.status === 200,
    });
  });
}

/**
 * Helper: Create employee
 */
function createEmployee(token, employeeData) {
  const response = http.post(
    `${BASE_URL}/api/employees`,
    JSON.stringify(employeeData),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const success = check(response, {
    'employee creation successful': (r) => r.status === 201,
  });

  employeeCrudRate.add(success ? 1 : 0);

  if (success) {
    try {
      const body = JSON.parse(response.body);
      return body.data;
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Helper: Create product
 */
function createProduct(token, productData) {
  const response = http.post(
    `${BASE_URL}/api/products`,
    JSON.stringify(productData),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const success = check(response, {
    'product creation successful': (r) => r.status === 201,
  });

  if (success) {
    try {
      const body = JSON.parse(response.body);
      return body.data;
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Helper: Fetch data with pagination
 */
function fetchWithPagination(baseUrl, token, limit = 10) {
  let page = 1;
  let totalFetched = 0;
  const maxPages = 5; // Prevent infinite loops

  while (page <= maxPages && totalFetched < 100) { // Max 100 items
    const response = http.get(`${baseUrl}?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const success = check(response, {
      [`pagination page ${page} successful`]: (r) => r.status === 200,
    });

    if (!success) {break;}

    try {
      const body = JSON.parse(response.body);
      if (body.data && body.data.length > 0) {
        totalFetched += body.data.length;
        page++;
      } else {
        break; // No more data
      }
    } catch (e) {
      break; // Invalid response
    }

    sleep(0.1); // Small delay between requests
  }
}

/**
 * Helper: Setup test data
 */
function setupTestData(adminToken) {
  const headers = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };

  // Create test products if they don't exist
  testProducts.forEach(product => {
    http.post(`${BASE_URL}/api/products`, JSON.stringify(product), { headers });
  });

  // Create test employees
  const testEmployees = [
    {
      name: 'Load Test Employee 1',
      email: 'loadtest1@feastfrenzy.com',
      employeeId: 'LOAD001',
      role: 'employee',
      department: 'Testing',
      balance: 50.00,
    },
    {
      name: 'Load Test Employee 2',
      email: 'loadtest2@feastfrenzy.com',
      employeeId: 'LOAD002',
      role: 'employee',
      department: 'Testing',
      balance: 75.00,
    },
  ];

  testEmployees.forEach(employee => {
    http.post(`${BASE_URL}/api/employees`, JSON.stringify(employee), { headers });
  });
}

/**
 * Test teardown
 */
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Base URL: ${data.baseUrl}`);

  // Cleanup test data if needed
  // This would require admin authentication and cleanup logic
}
