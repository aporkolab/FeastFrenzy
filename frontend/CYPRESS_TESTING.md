# FeastFrenzy E2E Testing Guide

## Overview

This project uses **Cypress** for end-to-end testing with full TypeScript support, accessibility testing via `axe-core`, and comprehensive test coverage for authentication, CRUD operations, and navigation.

## Prerequisites

- Node.js 18+
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:4200`

## Quick Start

```bash
# Install dependencies
cd frontend
npm install

# Open Cypress Test Runner (GUI)
npm run e2e

# Run tests headlessly
npm run e2e:headless

# Run with specific browser
npm run e2e:chrome
npm run e2e:firefox
```

## Test Structure

```
frontend/cypress/
├── e2e/                    # Test specs
│   ├── auth.cy.ts          # Authentication tests
│   ├── products.cy.ts      # Product CRUD tests
│   ├── employees.cy.ts     # Employee CRUD tests
│   ├── purchases.cy.ts     # Purchase CRUD tests
│   ├── navigation.cy.ts    # Navigation & routing tests
│   └── accessibility.cy.ts # WCAG 2.1 AA compliance
├── fixtures/               # Test data
│   ├── users.json
│   ├── products.json
│   └── employees.json
├── support/
│   ├── commands.ts         # Custom Cypress commands
│   ├── e2e.ts              # Support file & hooks
│   └── types.ts            # TypeScript definitions
└── tsconfig.json
```

## Available Commands

### Authentication
```typescript
cy.login(email?, password?)  // API login with session caching
cy.loginAsAdmin()            // Login as admin@feastfrenzy.com
cy.loginAsManager()          // Login as manager@feastfrenzy.com
cy.loginAsEmployee()         // Login as employee@feastfrenzy.com
cy.loginViaUI(email, pass)   // Login through UI (for testing login flow)
cy.logout()                  // Clear session and redirect to login
```

### Selectors
```typescript
cy.getByTestId('my-button')  // Get by data-testid attribute
cy.getByRole('dialog')       // Get by role attribute
```

### API Helpers
```typescript
cy.interceptApi('GET', '/products*', 'getProducts')
cy.waitForApiResponse('getProducts')
cy.createProduct({ name: 'Test', price: 10 })
cy.createEmployee({ name: 'John', employee_number: 'E001', monthlyConsumptionValue: 500 })
```

### Database Operations
```typescript
cy.resetDatabase()           // Reset DB to clean state (dev/test only)
cy.seedDatabase({ products: [...], employees: [...] })
```

### Accessibility
```typescript
cy.injectAxe()
cy.checkA11y()               // Check for WCAG violations
cy.checkA11yWithOptions(context, options)
cy.tab()                     // Simulate Tab key press
```

## Test Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@feastfrenzy.com | Admin123! |
| Manager | manager@feastfrenzy.com | Manager123! |
| Employee | employee@feastfrenzy.com | Employee123! |

## Environment Variables

Configured in `cypress.config.ts`:

```typescript
env: {
  apiUrl: 'http://localhost:3000/api/v1',
  adminEmail: 'admin@feastfrenzy.com',
  adminPassword: 'Admin123!',
  // ... etc
}
```

Override via CLI:
```bash
cypress run --env apiUrl=http://staging.example.com/api/v1
```

## CI/CD Integration

The GitHub Actions workflow includes an `e2e-tests` job that:

1. Spins up MySQL and Redis services
2. Runs database migrations and seeds
3. Starts backend server
4. Runs Cypress tests in Chrome headless
5. Uploads screenshots/videos on failure

## Writing New Tests

### Basic Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it('should do something', () => {
    cy.interceptApi('GET', '/resource*', 'getResource');
    cy.visit('/resource');
    cy.wait('@getResource');
    
    cy.get('table').should('exist');
  });
});
```

### Best Practices

1. **Use API login** (`cy.login()`) instead of UI login for speed
2. **Set up intercepts** before visiting pages
3. **Wait for API calls** before assertions
4. **Use fixtures** for test data
5. **Add `data-testid`** attributes to components for reliable selectors

## Debugging

```bash
# Open Cypress with debug logs
DEBUG=cypress:* npm run e2e

# Run specific test file
npx cypress run --spec "cypress/e2e/auth.cy.ts"

# Keep browser open after test
npx cypress open
```

## Backend Test Endpoints

Available only in `NODE_ENV !== 'production'`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/test/reset` | POST | Reset database to clean state |
| `/api/v1/test/seed` | POST | Seed custom test data |
| `/api/v1/test/cleanup` | DELETE | Clean up test data |
| `/api/v1/test/health` | GET | Check test endpoints availability |

## Troubleshooting

### Tests timeout waiting for element
- Check if the element has correct selector
- Increase `defaultCommandTimeout` in config
- Add explicit `cy.wait()` for slow operations

### Login session not persisting
- Session caching requires same `[email, password]` tuple
- Check localStorage is not being cleared unexpectedly

### Accessibility tests failing
- Run `cy.checkA11y()` after content is fully loaded
- Use `cy.injectAxe()` after each `cy.visit()`
