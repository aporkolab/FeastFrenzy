
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testMatch: ['**/+(*.)+(spec).+(ts)'],
  coverageProvider: 'v8',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!@angular|rxjs|tslib)'
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@core/(.*)$': '<rootDir>/src/app/core/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
    '^@features/(.*)$': '<rootDir>/src/app/features/$1',
    '^@models/(.*)$': '<rootDir>/src/app/model/$1',
    '^@services/(.*)$': '<rootDir>/src/app/service/$1',
    '^@guards/(.*)$': '<rootDir>/src/app/guards/$1',
    '^@env/(.*)$': '<rootDir>/src/environments/$1',
    '@angular/core/testing': '<rootDir>/node_modules/@angular/core/fesm2022/testing.mjs',
    '@angular/common/http/testing': '<rootDir>/node_modules/@angular/common/fesm2022/http-testing.mjs',
    '@angular/common/http': '<rootDir>/node_modules/@angular/common/fesm2022/http.mjs',
    '@angular/router/testing': '<rootDir>/node_modules/@angular/router/fesm2022/testing.mjs'
  }
};
