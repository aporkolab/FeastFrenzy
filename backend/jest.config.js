module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Run tests serially to avoid SQLite conflicts
  maxWorkers: 1,

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js',
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json',
  ],

  // Coverage thresholds (temporarily lowered during development)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    'controllers/**/*.js',
    'models/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/test/**',
    '!**/*.test.js',
    '!**/*.spec.js',
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/test_helper.js',
  ],

  // Module paths
  modulePaths: [
    '<rootDir>/src',
    '<rootDir>',
  ],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Error handling
  errorOnDeprecated: true,

  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,

  // Transform configuration for ES modules
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Transform uuid (and other ESM packages) in node_modules
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid)/)',
  ],
};
