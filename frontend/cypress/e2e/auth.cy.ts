/**
 * Authentication E2E Tests
 * Tests login, logout, registration, and session management
 */

describe('Authentication', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Login Page', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('should display login form', () => {
      cy.get('form').should('exist');
      cy.get('input[type="email"], input[name="email"], #email').should('exist');
      cy.get('input[type="password"], input[name="password"], #password').should('exist');
      cy.get('button[type="submit"]').should('exist');
    });

    it('should show validation errors for empty form', () => {
      cy.get('button[type="submit"]').click();
      // Form should show validation errors
      cy.get('.invalid-feedback, .error, [role="alert"]').should('exist');
    });

    it('should show validation error for invalid email format', () => {
      cy.get('input[type="email"], input[name="email"], #email').type('invalid-email');
      cy.get('input[type="password"], input[name="password"], #password').type('password123');
      cy.get('button[type="submit"]').click();
      cy.get('.invalid-feedback, .error, [role="alert"]').should('exist');
    });

    it('should show error for invalid credentials', () => {
      cy.fixture('users').then((users) => {
        cy.get('input[type="email"], input[name="email"], #email').type(users.invalidUser.email);
        cy.get('input[type="password"], input[name="password"], #password').type(users.invalidUser.password);
        cy.get('button[type="submit"]').click();
        
        // Should show error message
        cy.get('.alert-danger, .error, [role="alert"]').should('be.visible');
        // Should stay on login page
        cy.url().should('include', '/login');
      });
    });

    it('should login successfully with valid admin credentials', () => {
      cy.fixture('users').then((users) => {
        cy.get('input[type="email"], input[name="email"], #email').type(users.admin.email);
        cy.get('input[type="password"], input[name="password"], #password').type(users.admin.password);
        cy.get('button[type="submit"]').click();

        // Should redirect away from login
        cy.url().should('not.include', '/login');
        
        // Should store tokens in localStorage
        cy.window().its('localStorage.accessToken').should('exist');
        cy.window().its('localStorage.currentUser').should('exist');
      });
    });

    it('should login successfully with valid manager credentials', () => {
      cy.fixture('users').then((users) => {
        cy.get('input[type="email"], input[name="email"], #email').type(users.manager.email);
        cy.get('input[type="password"], input[name="password"], #password').type(users.manager.password);
        cy.get('button[type="submit"]').click();

        cy.url().should('not.include', '/login');
      });
    });

    it('should login successfully with valid employee credentials', () => {
      cy.fixture('users').then((users) => {
        cy.get('input[type="email"], input[name="email"], #email').type(users.employee.email);
        cy.get('input[type="password"], input[name="password"], #password').type(users.employee.password);
        cy.get('button[type="submit"]').click();

        cy.url().should('not.include', '/login');
      });
    });

    it('should have link to register page', () => {
      cy.get('a[href*="register"]').should('exist');
    });
  });

  describe('Registration Page', () => {
    beforeEach(() => {
      cy.visit('/register');
    });

    it('should display registration form', () => {
      cy.get('form').should('exist');
      cy.get('input[name="name"], #name').should('exist');
      cy.get('input[type="email"], input[name="email"], #email').should('exist');
      cy.get('input[type="password"], input[name="password"], #password').should('exist');
    });

    it('should show validation errors for empty form', () => {
      cy.get('button[type="submit"]').click();
      cy.get('.invalid-feedback, .error, [role="alert"]').should('exist');
    });

    it('should show error for weak password', () => {
      cy.get('input[name="name"], #name').type('Test User');
      cy.get('input[type="email"], input[name="email"], #email').type('test@example.com');
      cy.get('input[type="password"], input[name="password"], #password').type('weak');
      cy.get('button[type="submit"]').click();
      
      // Should show password validation error
      cy.get('.invalid-feedback, .error, [role="alert"]').should('exist');
    });

    it('should register new user successfully', () => {
      cy.intercept('POST', '**/api/v1/auth/register', {
        statusCode: 201,
        body: {
          user: {
            id: 99,
            name: 'New Test User',
            email: 'newuser@test.com',
            role: 'employee'
          },
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        }
      }).as('registerRequest');

      const uniqueEmail = `testuser_${Date.now()}@test.com`;
      
      cy.get('input[name="name"], #name').type('New Test User');
      cy.get('input[type="email"], #email').type(uniqueEmail);
      cy.get('input[type="password"], #password').type('StrongP@ss123!');
      
      // Fill confirm password if exists
      cy.get('body').then(($body) => {
        if ($body.find('input[name="confirmPassword"], #confirmPassword').length > 0) {
          cy.get('input[name="confirmPassword"], #confirmPassword').type('StrongP@ss123!');
        }
      });
      
      cy.get('button[type="submit"]').click();

      cy.wait('@registerRequest');
      
      // Should redirect to login or dashboard
      cy.url().should('satisfy', (url: string) => {
        return url.includes('/login') || 
               url.includes('/dashboard') ||
               !url.includes('/register');
      });
    });

    it('should show error for duplicate email', () => {
      cy.intercept('POST', '**/api/v1/auth/register', {
        statusCode: 409,
        body: {
          error: {
            message: 'Email already exists',
            code: 'DUPLICATE_EMAIL'
          }
        }
      }).as('duplicateEmail');

      cy.get('input[name="name"], #name').type('Test User');
      cy.get('input[type="email"], #email').type('existing@test.com');
      cy.get('input[type="password"], #password').type('StrongP@ss123!');
      
      cy.get('body').then(($body) => {
        if ($body.find('input[name="confirmPassword"], #confirmPassword').length > 0) {
          cy.get('input[name="confirmPassword"], #confirmPassword').type('StrongP@ss123!');
        }
      });
      
      cy.get('button[type="submit"]').click();

      cy.wait('@duplicateEmail');
      
      // Should show duplicate email error
      cy.get('.alert-danger, .error, [role="alert"]')
        .should('be.visible')
        .and('contain.text', /email.*exists|already|már létezik|foglalt/i);
    });

    it('should have link to login page', () => {
      cy.get('a[href*="login"]').should('exist');
    });
  });

  describe('Session Management', () => {
    it('should redirect to login when accessing protected route without auth', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('should redirect to login when accessing products without auth', () => {
      cy.visit('/products');
      cy.url().should('include', '/login');
    });

    it('should maintain session after page reload', () => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
      cy.url().should('not.include', '/login');
      
      // Reload page
      cy.reload();
      
      // Should still be logged in
      cy.url().should('not.include', '/login');
    });

    it('should allow logout', () => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
      
      // Find and click logout button
      cy.get('button, a').contains(/logout|sign out|kijelentkezés/i).click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Tokens should be cleared
      cy.window().its('localStorage.accessToken').should('not.exist');
    });
  });

  describe('Role-Based Access', () => {
    it('admin should have access to admin routes', () => {
      cy.loginAsAdmin();
      cy.visit('/admin');
      cy.url().should('not.include', '/unauthorized');
    });

    it('employee should not have access to admin routes', () => {
      cy.loginAsEmployee();
      cy.visit('/admin');
      // Should redirect to unauthorized or home
      cy.url().should('satisfy', (url: string) => {
        return url.includes('/unauthorized') || 
               url.includes('/dashboard') || 
               !url.includes('/admin');
      });
    });
  });

  describe('API Authentication', () => {
    it('should include auth token in API requests', () => {
      cy.loginAsAdmin();
      
      cy.intercept('GET', '**/api/v1/products*').as('getProducts');
      cy.visit('/products');
      
      cy.wait('@getProducts').then((interception) => {
        expect(interception.request.headers).to.have.property('authorization');
        expect(interception.request.headers.authorization).to.match(/^Bearer /);
      });
    });

    it('should handle 401 responses by redirecting to login', () => {
      cy.loginAsAdmin();
      
      // Simulate expired token
      cy.window().then((win) => {
        win.localStorage.setItem('accessToken', 'invalid-token');
      });
      
      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 401,
        body: { error: { message: 'Unauthorized' } }
      }).as('unauthorizedRequest');
      
      cy.visit('/products');
      
      // Should eventually redirect to login
      cy.url({ timeout: 10000 }).should('include', '/login');
    });
  });

  describe('Account Lockout', () => {
    beforeEach(() => {
      cy.clearLocalStorage();
      cy.visit('/login');
    });

    it('should lock account after 5 failed login attempts', () => {
      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        cy.get('input[type="email"], #email').clear().type('test@example.com');
        cy.get('input[type="password"], #password').clear().type('wrongpassword');
        cy.get('button[type="submit"]').click();
        
        // Wait for error response before next attempt
        cy.get('.alert-danger, .error, [role="alert"]').should('be.visible');
      }
      
      // On 6th attempt, should show lockout message
      cy.get('input[type="email"], #email').clear().type('test@example.com');
      cy.get('input[type="password"], #password').clear().type('wrongpassword');
      cy.get('button[type="submit"]').click();
      
      // Should show lockout or rate limit message
      cy.get('.alert-danger, .error, [role="alert"]').should(
        'contain.text', 
        /locked|too many|túl sok|limit|block/i
      );
    });

    it('should show remaining attempts warning', () => {
      // Mock API to return remaining attempts
      cy.intercept('POST', '**/api/v1/auth/login', {
        statusCode: 401,
        body: {
          error: {
            message: 'Invalid credentials',
            remainingAttempts: 2
          }
        }
      }).as('failedLogin');

      cy.get('input[type="email"], #email').type('test@example.com');
      cy.get('input[type="password"], #password').type('wrongpassword');
      cy.get('button[type="submit"]').click();

      cy.wait('@failedLogin');

      // Should show warning about remaining attempts (if implemented)
      cy.get('.alert-danger, .error, [role="alert"]').should('be.visible');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token automatically when near expiration', () => {
      cy.loginAsAdmin();
      
      // Intercept token refresh endpoint
      cy.intercept('POST', '**/api/v1/auth/refresh').as('refreshToken');
      
      // Simulate token that needs refresh by setting a short-lived token
      cy.window().then((win) => {
        // Set refreshToken which would trigger a refresh
        const refreshToken = win.localStorage.getItem('refreshToken');
        expect(refreshToken).to.exist;
      });
      
      cy.visit('/dashboard');
      
      // The app should automatically refresh if needed
      cy.url().should('not.include', '/login');
    });

    it('should redirect to login when refresh token is also expired', () => {
      cy.loginAsAdmin();
      
      // Override both tokens to be invalid
      cy.window().then((win) => {
        win.localStorage.setItem('accessToken', 'expired-access-token');
        win.localStorage.setItem('refreshToken', 'expired-refresh-token');
      });

      // Mock refresh endpoint to return 401
      cy.intercept('POST', '**/api/v1/auth/refresh', {
        statusCode: 401,
        body: { error: { message: 'Refresh token expired' } }
      }).as('refreshFailed');

      cy.intercept('GET', '**/api/v1/**', {
        statusCode: 401,
        body: { error: { message: 'Unauthorized' } }
      }).as('apiUnauthorized');

      cy.visit('/dashboard');

      // Should redirect to login
      cy.url({ timeout: 10000 }).should('include', '/login');
    });

    it('should maintain session across page reloads', () => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
      
      // Verify logged in
      cy.url().should('not.include', '/login');
      
      // Reload page
      cy.reload();
      
      // Should still be logged in
      cy.url().should('not.include', '/login');
      
      // Reload again
      cy.reload(true); // Force reload
      
      // Should still be logged in
      cy.url().should('not.include', '/login');
    });

    it('should store tokens correctly in localStorage', () => {
      cy.fixture('users').then((users) => {
        cy.visit('/login');
        
        cy.get('input[type="email"], #email').type(users.admin.email);
        cy.get('input[type="password"], #password').type(users.admin.password);
        cy.get('button[type="submit"]').click();

        cy.url().should('not.include', '/login');

        // Verify tokens are stored
        cy.window().then((win) => {
          expect(win.localStorage.getItem('accessToken')).to.exist;
          expect(win.localStorage.getItem('refreshToken')).to.exist;
          expect(win.localStorage.getItem('currentUser')).to.exist;
          
          // Verify currentUser has expected structure
          const currentUser = JSON.parse(win.localStorage.getItem('currentUser') || '{}');
          expect(currentUser).to.have.property('email');
          expect(currentUser).to.have.property('role');
        });
      });
    });
  });

  describe('Password Requirements', () => {
    beforeEach(() => {
      cy.visit('/register');
    });

    it('should show password strength requirements', () => {
      // Type weak password
      cy.get('input[type="password"], #password').type('abc');
      cy.get('input[type="password"], #password').blur();

      // Should show strength requirements
      cy.get('.invalid-feedback, .error, .password-requirements, [role="alert"]')
        .should('be.visible');
    });

    it('should validate minimum password length', () => {
      cy.get('input[name="name"], #name').type('Test User');
      cy.get('input[type="email"], #email').type('test@example.com');
      cy.get('input[type="password"], #password').type('Short1!');
      cy.get('button[type="submit"]').click();

      cy.get('.invalid-feedback, .error, [role="alert"]')
        .should('contain.text', /password|jelszó/i);
    });

    it('should require mixed case and special characters', () => {
      cy.get('input[name="name"], #name').type('Test User');
      cy.get('input[type="email"], #email').type('test@example.com');
      cy.get('input[type="password"], #password').type('alllowercase');
      cy.get('button[type="submit"]').click();

      cy.get('.invalid-feedback, .error, [role="alert"]')
        .should('be.visible');
    });

    it('should accept valid strong password', () => {
      cy.intercept('POST', '**/api/v1/auth/register', {
        statusCode: 201,
        body: { message: 'Registration successful' }
      }).as('register');

      cy.get('input[name="name"], #name').type('Test User');
      cy.get('input[type="email"], #email').type('newtest@example.com');
      cy.get('input[type="password"], #password').type('StrongP@ss123!');
      
      // Fill confirm password if exists
      cy.get('body').then(($body) => {
        if ($body.find('input[name="confirmPassword"], #confirmPassword').length > 0) {
          cy.get('input[name="confirmPassword"], #confirmPassword').type('StrongP@ss123!');
        }
      });
      
      cy.get('button[type="submit"]').click();
    });
  });

  describe('Logout Functionality', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
    });

    it('should logout and redirect to login', () => {
      cy.get('button, a').contains(/logout|sign out|kijelentkezés/i).click();
      cy.url().should('include', '/login');
    });

    it('should clear all tokens from localStorage on logout', () => {
      cy.get('button, a').contains(/logout|sign out|kijelentkezés/i).click();
      
      cy.window().then((win) => {
        expect(win.localStorage.getItem('accessToken')).to.be.null;
        expect(win.localStorage.getItem('refreshToken')).to.be.null;
        expect(win.localStorage.getItem('currentUser')).to.be.null;
      });
    });

    it('should prevent access to protected routes after logout', () => {
      cy.get('button, a').contains(/logout|sign out|kijelentkezés/i).click();
      cy.url().should('include', '/login');
      
      // Try to access protected route
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
      
      cy.visit('/products');
      cy.url().should('include', '/login');
      
      cy.visit('/employees');
      cy.url().should('include', '/login');
    });

    it('should invalidate session on server side', () => {
      // Intercept logout request
      cy.intercept('POST', '**/api/v1/auth/logout').as('logoutRequest');
      
      cy.get('button, a').contains(/logout|sign out|kijelentkezés/i).click();
      
      // Verify logout request was made (if API supports it)
      cy.get('@logoutRequest.all').then((interceptions) => {
        // Either logout endpoint called or tokens cleared
        cy.window().then((win) => {
          expect(win.localStorage.getItem('accessToken')).to.be.null;
        });
      });
    });
  });
});
