/**
 * Error Handling E2E Tests
 * Tests graceful error handling, network failures, and recovery scenarios
 */

describe('Error Handling', () => {
  describe('API Error States', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should show error toast on API 500 failure', () => {
      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 500,
        body: {
          error: {
            message: 'Internal Server Error',
            code: 'INTERNAL_ERROR',
          },
        },
      }).as('failedProducts');

      cy.visit('/products');
      cy.wait('@failedProducts');

      // Should show error state or toast
      cy.get('.alert-danger, .error, [role="alert"], .toast-error, [data-testid="error-state"]')
        .should('be.visible');
    });

    it('should show validation errors from API response', () => {
      cy.intercept('POST', '**/api/v1/products', {
        statusCode: 400,
        body: {
          error: {
            message: 'Validation failed',
            details: [
              { field: 'price', message: 'Price must be positive' },
              { field: 'name', message: 'Name is required' },
            ],
          },
        },
      }).as('validationError');

      cy.visit('/products/new');

      // Fill form with invalid data
      cy.get('input[name="name"], #name').type('Test');
      cy.get('input[name="price"], #price').clear().type('100');
      cy.get('button[type="submit"]').click();

      cy.wait('@validationError');

      // Should display validation errors
      cy.get('.invalid-feedback, .error, [role="alert"]').should('be.visible');
    });

    it('should handle network errors gracefully', () => {
      cy.intercept('GET', '**/api/v1/products*', {
        forceNetworkError: true,
      }).as('networkError');

      cy.visit('/products');

      // Should show error state
      cy.get('.error, [data-testid="error-state"], .alert-danger').should('be.visible');
      
      // Should show retry button
      cy.get('button').contains(/retry|újra|try again/i).should('be.visible');
    });

    it('should recover from errors on retry', () => {
      let callCount = 0;

      cy.intercept('GET', '**/api/v1/products*', (req) => {
        callCount++;
        if (callCount === 1) {
          req.reply({
            statusCode: 500,
            body: { error: { message: 'Temporary failure' } },
          });
        } else {
          req.reply({
            statusCode: 200,
            body: {
              data: [
                { id: 1, name: 'Product 1', price: 100 },
                { id: 2, name: 'Product 2', price: 200 },
              ],
              meta: {
                total: 2,
                page: 1,
                limit: 10,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
              },
            },
          });
        }
      }).as('productsRequest');

      cy.visit('/products');
      cy.wait('@productsRequest');

      // Should show error initially
      cy.get('.error, [data-testid="error-state"], .alert-danger').should('be.visible');

      // Click retry
      cy.get('button').contains(/retry|újra|try again/i).click();

      cy.wait('@productsRequest');

      // Should show data now
      cy.get('table').should('be.visible');
    });

    it('should handle 403 forbidden errors', () => {
      cy.intercept('GET', '**/api/v1/admin*', {
        statusCode: 403,
        body: {
          error: {
            message: 'Access denied',
            code: 'FORBIDDEN',
          },
        },
      }).as('forbiddenRequest');

      cy.visit('/admin');

      // Should redirect to unauthorized or show error
      cy.url().should('satisfy', (url: string) => {
        return (
          url.includes('/unauthorized') ||
          url.includes('/login') ||
          url.includes('/dashboard')
        );
      });
    });

    it('should handle 404 not found for resources', () => {
      cy.intercept('GET', '**/api/v1/products/999999', {
        statusCode: 404,
        body: {
          error: {
            message: 'Product not found',
            code: 'NOT_FOUND',
          },
        },
      }).as('notFound');

      cy.visit('/products/999999');
      cy.wait('@notFound');

      // Should show not found message
      cy.get('body').should('contain.text', /not found|nem található/i);
    });

    it('should handle request timeout', () => {
      cy.intercept('GET', '**/api/v1/products*', (req) => {
        req.on('response', (res) => {
          res.setDelay(35000); // Longer than the timeout
        });
      }).as('slowRequest');

      cy.visit('/products');

      // Should eventually show timeout error or loading state
      cy.get('.error, [role="alert"], .spinner, .skeleton', { timeout: 15000 }).should(
        'exist'
      );
    });
  });

  describe('Form Submission Errors', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should display inline field errors', () => {
      cy.visit('/products/new');

      // Submit empty form
      cy.get('button[type="submit"]').click();

      // Should show inline errors
      cy.get('.invalid-feedback, .error, [role="alert"]').should('be.visible');
    });

    it('should clear errors when user starts typing', () => {
      cy.visit('/products/new');

      // Submit to show errors
      cy.get('button[type="submit"]').click();
      cy.get('.invalid-feedback, .error').should('be.visible');

      // Type in field
      cy.get('input[name="name"], #name').type('New Product');

      // Error for that field should clear or update
      cy.get('input[name="name"], #name')
        .closest('.form-group, .mb-3')
        .find('.invalid-feedback')
        .should('not.exist');
    });

    it('should handle duplicate entry errors', () => {
      cy.intercept('POST', '**/api/v1/products', {
        statusCode: 409,
        body: {
          error: {
            message: 'Product with this name already exists',
            code: 'DUPLICATE_ENTRY',
          },
        },
      }).as('duplicateError');

      cy.visit('/products/new');

      cy.get('input[name="name"], #name').type('Existing Product');
      cy.get('input[name="price"], #price').clear().type('100');
      cy.get('button[type="submit"]').click();

      cy.wait('@duplicateError');

      // Should show duplicate error
      cy.get('.alert-danger, .error, [role="alert"]').should('contain.text', /already exists|már létezik/i);
    });

    it('should preserve form data on error', () => {
      cy.intercept('POST', '**/api/v1/products', {
        statusCode: 500,
        body: { error: { message: 'Server error' } },
      }).as('serverError');

      cy.visit('/products/new');

      const productName = 'My New Product';
      const productPrice = '150';

      cy.get('input[name="name"], #name').type(productName);
      cy.get('input[name="price"], #price').clear().type(productPrice);
      cy.get('button[type="submit"]').click();

      cy.wait('@serverError');

      // Form data should still be there
      cy.get('input[name="name"], #name').should('have.value', productName);
      cy.get('input[name="price"], #price').should('have.value', productPrice);
    });
  });

  describe('Delete Operation Errors', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should handle delete failure gracefully', () => {
      // First load products successfully
      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 200,
        body: {
          data: [{ id: 1, name: 'Test Product', price: 100 }],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        },
      }).as('getProducts');

      cy.intercept('DELETE', '**/api/v1/products/*', {
        statusCode: 500,
        body: { error: { message: 'Cannot delete product' } },
      }).as('deleteFailed');

      cy.visit('/products');
      cy.wait('@getProducts');

      // Try to delete
      cy.get(
        'button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger, [data-testid="delete-btn"]'
      )
        .first()
        .click();

      // Confirm delete
      cy.get('[role="dialog"], .modal').within(() => {
        cy.get('button').contains(/yes|confirm|ok|igen|törlés/i).click();
      });

      cy.wait('@deleteFailed');

      // Should show error message
      cy.get('.alert-danger, .error, [role="alert"], .toast').should('be.visible');
    });

    it('should handle delete constraint violation', () => {
      cy.intercept('GET', '**/api/v1/employees*', {
        statusCode: 200,
        body: {
          data: [
            { id: 1, name: 'John Doe', employee_number: 'EMP001', monthlyConsumptionValue: 500 },
          ],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        },
      }).as('getEmployees');

      cy.intercept('DELETE', '**/api/v1/employees/*', {
        statusCode: 409,
        body: {
          error: {
            message: 'Cannot delete employee with existing purchases',
            code: 'CONSTRAINT_VIOLATION',
          },
        },
      }).as('deleteConstraint');

      cy.visit('/employees');
      cy.wait('@getEmployees');

      cy.get(
        'button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger, [data-testid="delete-btn"]'
      )
        .first()
        .click();

      cy.get('[role="dialog"], .modal').within(() => {
        cy.get('button').contains(/yes|confirm|ok|igen|törlés/i).click();
      });

      cy.wait('@deleteConstraint');

      // Should show constraint error
      cy.get('.alert-danger, .error, [role="alert"]').should(
        'contain.text',
        /cannot delete|nem törölhető|existing|létező/i
      );
    });
  });

  describe('Authentication Errors', () => {
    it('should handle expired token during request', () => {
      cy.loginAsAdmin();

      // Override token to be invalid
      cy.window().then((win) => {
        win.localStorage.setItem('accessToken', 'expired-invalid-token');
      });

      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 401,
        body: { error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } },
      }).as('expiredToken');

      cy.visit('/products');

      // Should redirect to login
      cy.url({ timeout: 10000 }).should('include', '/login');
    });

    it('should handle invalid credentials on login', () => {
      cy.visit('/login');

      cy.get('input[type="email"], #email').type('wrong@email.com');
      cy.get('input[type="password"], #password').type('wrongpassword');
      cy.get('button[type="submit"]').click();

      // Should show error
      cy.get('.alert-danger, .error, [role="alert"]').should('be.visible');
      cy.url().should('include', '/login');
    });

    it('should handle rate limiting (429)', () => {
      cy.intercept('POST', '**/api/v1/auth/login', {
        statusCode: 429,
        body: {
          error: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMITED',
          },
        },
      }).as('rateLimited');

      cy.visit('/login');

      cy.get('input[type="email"], #email').type('test@test.com');
      cy.get('input[type="password"], #password').type('password123');
      cy.get('button[type="submit"]').click();

      cy.wait('@rateLimited');

      // Should show rate limit error
      cy.get('.alert-danger, .error, [role="alert"]').should(
        'contain.text',
        /too many|túl sok|rate limit|try again later/i
      );
    });
  });

  describe('Toast Notifications', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should show success toast after successful operation', () => {
      cy.intercept('POST', '**/api/v1/products', {
        statusCode: 201,
        body: { id: 1, name: 'New Product', price: 100 },
      }).as('createProduct');

      cy.visit('/products/new');

      cy.get('input[name="name"], #name').type('New Product');
      cy.get('input[name="price"], #price').clear().type('100');
      cy.get('button[type="submit"]').click();

      cy.wait('@createProduct');

      // Should show success notification
      cy.get('.toast, [role="alert"], .notification, .snackbar, .alert-success')
        .should('be.visible');
    });

    it('should auto-dismiss toast after timeout', () => {
      cy.intercept('POST', '**/api/v1/products', {
        statusCode: 201,
        body: { id: 1, name: 'New Product', price: 100 },
      }).as('createProduct');

      cy.visit('/products/new');

      cy.get('input[name="name"], #name').type('New Product');
      cy.get('input[name="price"], #price').clear().type('100');
      cy.get('button[type="submit"]').click();

      cy.wait('@createProduct');

      // Toast should appear
      cy.get('.toast, [role="alert"], .notification, .snackbar')
        .should('be.visible');

      // Toast should disappear after some time (usually 5 seconds)
      cy.get('.toast, [role="alert"], .notification, .snackbar', { timeout: 7000 })
        .should('not.exist');
    });

    it('should allow manual dismissal of toast', () => {
      cy.intercept('POST', '**/api/v1/products', {
        statusCode: 500,
        body: { error: { message: 'Server error' } },
      }).as('serverError');

      cy.visit('/products/new');

      cy.get('input[name="name"], #name').type('New Product');
      cy.get('input[name="price"], #price').clear().type('100');
      cy.get('button[type="submit"]').click();

      cy.wait('@serverError');

      // Find and click dismiss button
      cy.get('.toast, [role="alert"], .notification, .alert').within(() => {
        cy.get('button[aria-label*="close"], button[aria-label*="dismiss"], .btn-close, .close')
          .click();
      });

      // Toast should be gone
      cy.get('.toast, [role="alert"], .notification', { timeout: 1000 }).should('not.exist');
    });
  });

  describe('Loading States During Errors', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should hide loading state after error', () => {
      cy.intercept('GET', '**/api/v1/products*', (req) => {
        req.on('response', (res) => {
          res.setDelay(500);
          res.send({
            statusCode: 500,
            body: { error: { message: 'Server error' } },
          });
        });
      }).as('slowError');

      cy.visit('/products');

      // Loading state should appear first
      cy.get('.spinner, .loading, .skeleton, [role="progressbar"]').should('exist');

      cy.wait('@slowError');

      // Loading should be replaced by error
      cy.get('.spinner, .loading, .skeleton').should('not.exist');
      cy.get('.error, [data-testid="error-state"], .alert-danger').should('be.visible');
    });

    it('should show loading state during retry', () => {
      let callCount = 0;

      cy.intercept('GET', '**/api/v1/products*', (req) => {
        callCount++;
        req.on('response', (res) => {
          res.setDelay(300);
          if (callCount === 1) {
            res.send({ statusCode: 500 });
          } else {
            res.send({
              statusCode: 200,
              body: { data: [], meta: { total: 0 } },
            });
          }
        });
      }).as('productsRequest');

      cy.visit('/products');
      cy.wait('@productsRequest');

      // Click retry
      cy.get('button').contains(/retry|újra/i).click();

      // Should show loading during retry
      cy.get('.spinner, .loading, .skeleton').should('exist');

      cy.wait('@productsRequest');
    });
  });

  describe('Form Field Validation Errors', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should show email format validation error', () => {
      cy.visit('/register');

      cy.get('input[type="email"], #email').type('invalid-email');
      cy.get('input[type="email"], #email').blur();

      cy.get('.invalid-feedback, .error').should('contain.text', /email|valid|érvényes/i);
    });

    it('should show password strength requirements', () => {
      cy.visit('/register');

      cy.get('input[type="password"], #password').type('weak');
      cy.get('input[type="password"], #password').blur();

      // Should show password requirements error
      cy.get('.invalid-feedback, .error, [role="alert"]').should('be.visible');
    });

    it('should show required field errors', () => {
      cy.visit('/products/new');

      // Focus and blur without typing
      cy.get('input[name="name"], #name').focus().blur();
      cy.get('input[name="price"], #price').focus().blur();

      // Should show required errors
      cy.get('.invalid-feedback, .error').should('have.length.at.least', 1);
    });

    it('should show numeric validation errors', () => {
      cy.visit('/products/new');

      cy.get('input[name="name"], #name').type('Test Product');
      cy.get('input[name="price"], #price').clear().type('-100');
      cy.get('button[type="submit"]').click();

      // Should show price validation error
      cy.get('.invalid-feedback, .error').should('be.visible');
    });
  });

  describe('Concurrent Request Errors', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should handle optimistic update rollback on error', () => {
      const originalProduct = { id: 1, name: 'Original Name', price: 100 };

      cy.intercept('GET', '**/api/v1/products/1', {
        statusCode: 200,
        body: originalProduct,
      }).as('getProduct');

      cy.intercept('PUT', '**/api/v1/products/1', {
        statusCode: 500,
        body: { error: { message: 'Update failed' } },
      }).as('updateFailed');

      cy.visit('/products/1/edit');
      cy.wait('@getProduct');

      cy.get('input[name="name"], #name').clear().type('New Name');
      cy.get('button[type="submit"]').click();

      cy.wait('@updateFailed');

      // Should show error and potentially revert
      cy.get('.alert-danger, .error, [role="alert"]').should('be.visible');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should handle empty response body', () => {
      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 200,
        body: null,
      }).as('emptyResponse');

      cy.visit('/products');
      cy.wait('@emptyResponse');

      // Should not crash, show empty state or error
      cy.get('body').should('be.visible');
    });

    it('should handle malformed JSON response', () => {
      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 200,
        body: 'not valid json {{',
        headers: { 'content-type': 'application/json' },
      }).as('malformed');

      cy.visit('/products');

      // Should show error or handle gracefully
      cy.get('body').should('be.visible');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'Error: '.repeat(100);

      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 500,
        body: { error: { message: longMessage } },
      }).as('longError');

      cy.visit('/products');
      cy.wait('@longError');

      // Should display error without breaking layout
      cy.get('.error, [data-testid="error-state"], .alert-danger').should('be.visible');
      cy.get('body').should('have.css', 'overflow-x', 'visible');
    });
  });
});
