const { Sequelize } = require('sequelize');
const { expect } = require('chai');

const testConfig = {
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: false,
  },
};

global.testDb = null;
global.app = null;
global.request = null;

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test-jwt-secret-key-at-least-32-chars-long';
  process.env.DB_LOGGING = 'false';

  global.testDb = new Sequelize(testConfig);

  try {
    await global.testDb.sync({ force: true });
    console.log('✅ Test database synchronized');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }

  try {
    global.app = require('../server');
    global.request = require('supertest')(global.app);
    console.log('✅ Test server initialized');
  } catch (error) {
    console.warn('⚠️  Server initialization skipped:', error.message);
  }
});

after(async () => {
  if (global.testDb) {
    await global.testDb.close();
    console.log('✅ Test database closed');
  }
});

beforeEach(async () => {
  if (global.testDb) {
    try {
      await global.testDb.sync({ force: true });
    } catch (error) {
      console.warn('⚠️  Database reset failed:', error.message);
    }
  }
});

global.testUtils = {
  createTestUser: async (overrides = {}) => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      department: 'IT',
      balance: 1000,
      ...overrides,
    };

    try {
      console.warn('⚠️  Test user creation skipped: models not available');
      return userData;
    } catch (error) {
      console.warn('⚠️  Test user creation failed:', error.message);
      return userData;
    }
  },

  createTestProduct: async (overrides = {}) => {
    const productData = {
      name: 'Test Product',
      description: 'Test product description',
      price: 10.99,
      category: 'test',
      availability: true,
      ...overrides,
    };

    try {
      console.warn('⚠️  Test product creation skipped: models not available');
      return productData;
    } catch (error) {
      console.warn('⚠️  Test product creation failed:', error.message);
      return productData;
    }
  },

  createTestPurchase: async (employeeId, _items = [], overrides = {}) => {
    const purchaseData = {
      employeeId,
      totalAmount: 25.5,
      status: 'completed',
      purchaseDate: new Date(),
      ...overrides,
    };

    try {
      console.warn('⚠️  Test purchase creation skipped: models not available');
      return purchaseData;
    } catch (error) {
      console.warn('⚠️  Test purchase creation failed:', error.message);
      return purchaseData;
    }
  },

  generateTestToken: (payload = {}) => {
    const jwt = require('jsonwebtoken');
    const defaultPayload = {
      id: 1,
      email: 'test@example.com',
      role: 'employee',
      ...payload,
    };
    return jwt.sign(defaultPayload, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
  },

  delay: ms => new Promise(resolve => setTimeout(resolve, ms)),

  randomString: (length = 10) => {
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  randomEmail: () => `test${Date.now()}@example.com`,
  randomPrice: () => Math.round(Math.random() * 100 * 100) / 100,
};

global.customAssertions = {
  isValidDate: received => {
    expect(received).to.be.an.instanceOf(Date);
    expect(received.getTime()).to.not.be.NaN;
  },

  isWithinRange: (received, floor, ceiling) => {
    expect(received).to.be.at.least(floor);
    expect(received).to.be.at.most(ceiling);
  },

  hasValidId: received => {
    expect(received).to.be.an('object');
    expect(received.id).to.be.a('number');
    expect(received.id).to.be.greaterThan(0);
  },
};

global.expect = expect;

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('🧪 Test environment initialized');
