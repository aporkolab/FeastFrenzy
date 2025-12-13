
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testMatch: ['**/+(*.)+(spec).+(ts)'],
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
    '@angular/core/testing': '<rootDir>/node_modules/@angular/core/fesm2022/testing.mjs',
    '@angular/common/http/testing': '<rootDir>/node_modules/@angular/common/fesm2022/http-testing.mjs',
    '@angular/common/http': '<rootDir>/node_modules/@angular/common/fesm2022/http.mjs',
    '@angular/router/testing': '<rootDir>/node_modules/@angular/router/fesm2022/testing.mjs'
  }
};
