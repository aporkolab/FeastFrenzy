/// <reference types="cypress" />
import 'cypress-axe';
import { Product, Employee, Purchase } from './types';

// =============================================================================
// TYPE DECLARATIONS
// =============================================================================

declare global {
  namespace Cypress {
    interface Chainable {
      // Authentication commands
      login(email?: string, password?: string): Chainable<void>;
      loginAsAdmin(): Chainable<void>;
      loginAsManager(): Chainable<void>;
      loginAsEmployee(): Chainable<void>;
      loginViaUI(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;

      // Selectors
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
      getByRole(role: string, options?: object): Chainable<JQuery<HTMLElement>>;

      // CRUD helpers
      createProduct(product: Partial<Product>): Chainable<Product>;
      createEmployee(employee: Partial<Employee>): Chainable<Employee>;
      createPurchase(purchase: Partial<Purchase>): Chainable<Purchase>;

      // Database operations
      resetDatabase(): Chainable<boolean>;
      seedDatabase(data: Record<string, unknown>): Chainable<boolean>;

      // API intercepts
      interceptApi(
        method: string,
        url: string,
        alias: string
      ): Chainable<null>;

      // Accessibility
      tab(): Chainable<JQuery<HTMLElement>>;
      checkA11yWithOptions(context?: string, options?: object): Chainable<void>;

      // Utilities
      waitForApiResponse(alias: string): Chainable<void>;
      assertToastMessage(message: string): Chainable<void>;
    }
  }
}

// =============================================================================
// AUTHENTICATION COMMANDS
// =============================================================================

/**
 * Login via API request and store tokens in localStorage
 * Uses Cypress session caching for performance
 */
Cypress.Commands.add('login', (email?: string, password?: string) => {
  const userEmail = email || Cypress.env('adminEmail');
  const userPassword = password || Cypress.env('adminPassword');

  cy.session(
    [userEmail, userPassword],
    () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/auth/login`,
        body: { email: userEmail, password: userPassword },
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status !== 200) {
          throw new Error(`Login failed: ${response.body?.error?.message || 'Unknown error'}`);
        }
        window.localStorage.setItem(
          'accessToken',
          response.body.tokens.accessToken
        );
        window.localStorage.setItem(
          'refreshToken',
          response.body.tokens.refreshToken
        );
        window.localStorage.setItem(
          'currentUser',
          JSON.stringify(response.body.user)
        );
      });
    },
    {
      validate() {
        // Validate session is still valid
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/auth/me`,
          headers: {
            Authorization: `Bearer ${window.localStorage.getItem('accessToken')}`,
          },
          failOnStatusCode: false,
        }).its('status').should('eq', 200);
      },
    }
  );
});

/**
 * Login as admin user
 */
Cypress.Commands.add('loginAsAdmin', () => {
  cy.login(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
});

/**
 * Login as manager user
 */
Cypress.Commands.add('loginAsManager', () => {
  cy.login(Cypress.env('managerEmail'), Cypress.env('managerPassword'));
});

/**
 * Login as employee user
 */
Cypress.Commands.add('loginAsEmployee', () => {
  cy.login(Cypress.env('employeeEmail'), Cypress.env('employeePassword'));
});

/**
 * Login via UI (for testing the login flow itself)
 */
Cypress.Commands.add('loginViaUI', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[type="email"], input[name="email"], #email').type(email);
  cy.get('input[type="password"], input[name="password"], #password').type(password);
  cy.get('form').submit();
  cy.url().should('not.include', '/login');
});

/**
 * Logout user
 */
Cypress.Commands.add('logout', () => {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.visit('/login');
});

// =============================================================================
// SELECTOR COMMANDS
// =============================================================================

/**
 * Get element by data-testid attribute
 */
Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

/**
 * Get element by role attribute
 */
Cypress.Commands.add('getByRole', (role: string, options?: object) => {
  return cy.get(`[role="${role}"]`, options);
});

// =============================================================================
// API INTERCEPT COMMANDS
// =============================================================================

/**
 * Set up API intercept with alias
 */
Cypress.Commands.add(
  'interceptApi',
  (method: string, url: string, alias: string) => {
    cy.intercept(method, `${Cypress.env('apiUrl')}${url}`).as(alias);
  }
);

/**
 * Wait for API response and assert success
 */
Cypress.Commands.add('waitForApiResponse', (alias: string) => {
  cy.wait(`@${alias}`).its('response.statusCode').should('be.oneOf', [200, 201]);
});

// =============================================================================
// CRUD HELPER COMMANDS
// =============================================================================

/**
 * Create a product via API
 */
Cypress.Commands.add('createProduct', (product: Partial<Product>) => {
  return cy
    .request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/products`,
      body: product,
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('accessToken')}`,
      },
    })
    .then((response) => response.body);
});

/**
 * Create an employee via API
 */
Cypress.Commands.add('createEmployee', (employee: Partial<Employee>) => {
  return cy
    .request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/employees`,
      body: employee,
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('accessToken')}`,
      },
    })
    .then((response) => response.body);
});

/**
 * Create a purchase via API
 */
Cypress.Commands.add('createPurchase', (purchase: Partial<Purchase>) => {
  return cy
    .request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/purchases`,
      body: purchase,
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('accessToken')}`,
      },
    })
    .then((response) => response.body);
});

// =============================================================================
// DATABASE COMMANDS
// =============================================================================

/**
 * Reset database to clean state
 */
Cypress.Commands.add('resetDatabase', () => {
  cy.task('resetDatabase');
});

/**
 * Seed database with specific data
 */
Cypress.Commands.add('seedDatabase', (data: Record<string, unknown>) => {
  cy.task('seedDatabase', data);
});

// =============================================================================
// ACCESSIBILITY COMMANDS
// =============================================================================

/**
 * Tab key command - simulates pressing Tab key
 */
Cypress.Commands.add('tab', { prevSubject: 'optional' }, (subject) => {
  const tabKey = { keyCode: 9, which: 9, key: 'Tab' };

  if (subject) {
    cy.wrap(subject).trigger('keydown', tabKey);
  } else {
    cy.focused().trigger('keydown', tabKey);
  }

  return cy.focused();
});

/**
 * Custom a11y assertion with WCAG options
 */
Cypress.Commands.add(
  'checkA11yWithOptions',
  (context?: string, options?: object) => {
    cy.checkA11y(context || undefined, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      },
      ...options,
    });
  }
);

// =============================================================================
// UTILITY COMMANDS
// =============================================================================

/**
 * Assert toast/notification message appears
 */
Cypress.Commands.add('assertToastMessage', (message: string) => {
  cy.get('.toast, [role="alert"], .notification, .snackbar')
    .should('be.visible')
    .and('contain', message);
});

export {};
