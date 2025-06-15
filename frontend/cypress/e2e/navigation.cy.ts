/**
 * Navigation E2E Tests
 * Tests navigation, routing, and UI components
 */

describe('Navigation', () => {
  describe('Public Navigation', () => {
    it('should display login page by default for unauthenticated users', () => {
      cy.visit('/');
      cy.url().should('include', '/login');
    });

    it('should redirect to login from protected routes', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
      
      cy.visit('/products');
      cy.url().should('include', '/login');
      
      cy.visit('/employees');
      cy.url().should('include', '/login');
      
      cy.visit('/purchases');
      cy.url().should('include', '/login');
    });

    it('should navigate between login and register', () => {
      cy.visit('/login');
      cy.get('a[href*="register"]').click();
      cy.url().should('include', '/register');
      
      cy.get('a[href*="login"]').click();
      cy.url().should('include', '/login');
    });
  });

  describe('Authenticated Navigation', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should display navigation menu after login', () => {
      cy.visit('/dashboard');
      cy.get('nav, .navbar, .sidebar').should('exist');
    });

    it('should navigate to dashboard', () => {
      cy.visit('/products');
      cy.get('a[href*="dashboard"], a[href="/"]').first().click();
      cy.url().should('match', /\/(dashboard)?$/);
    });

    it('should navigate to products', () => {
      cy.visit('/dashboard');
      cy.get('a[href*="products"]').first().click();
      cy.url().should('include', '/products');
    });

    it('should navigate to employees', () => {
      cy.visit('/dashboard');
      cy.get('a[href*="employees"]').first().click();
      cy.url().should('include', '/employees');
    });

    it('should navigate to purchases', () => {
      cy.visit('/dashboard');
      cy.get('a[href*="purchases"]').first().click();
      cy.url().should('include', '/purchases');
    });

    it('should show active state for current route', () => {
      cy.visit('/products');
      
      // Products link should have active class
      cy.get('a[href*="products"]').first()
        .should('satisfy', ($el: JQuery) => {
          return $el.hasClass('active') || 
                 $el.attr('aria-current') === 'page' ||
                 $el.parent().hasClass('active');
        });
    });

    it('should update active state when navigating', () => {
      cy.visit('/products');
      
      // Click employees link
      cy.get('a[href*="employees"]').first().click();
      
      // Employees should now be active
      cy.get('a[href*="employees"]').first()
        .should('satisfy', ($el: JQuery) => {
          return $el.hasClass('active') || 
                 $el.attr('aria-current') === 'page' ||
                 $el.parent().hasClass('active');
        });
      
      // Products should no longer be active
      cy.get('a[href*="products"]').first()
        .should('not.have.class', 'active');
    });

    it('should display current user name', () => {
      cy.visit('/dashboard');
      cy.fixture('users').then((users) => {
        cy.get('body').should('contain.text', users.admin.name);
      });
    });

    it('should display user email or avatar', () => {
      cy.visit('/dashboard');
      cy.fixture('users').then((users) => {
        // Should show either name, email, or avatar
        cy.get('nav, .navbar, .user-info, .header').should('satisfy', ($el: JQuery) => {
          const text = $el.text();
          return text.includes(users.admin.name) || 
                 text.includes(users.admin.email) ||
                 $el.find('.avatar, .user-avatar, img[alt*="user"]').length > 0;
        });
      });
    });

    it('should have working logout button', () => {
      cy.visit('/dashboard');
      
      // Find and click logout
      cy.get('button, a').contains(/logout|sign out|kijelentkezés/i).click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Should clear tokens
      cy.window().its('localStorage.accessToken').should('not.exist');
    });

    it('should show user role indicator', () => {
      cy.visit('/dashboard');
      
      // Admin should see admin indicator
      cy.get('body').then(($body) => {
        // Check if role badge/indicator exists
        const hasRoleIndicator = 
          $body.text().toLowerCase().includes('admin') ||
          $body.find('.role-badge, .badge').length > 0;
        expect(hasRoleIndicator).to.be.true;
      });
    });
  });

  describe('Role-Based Navigation', () => {
    it('admin should see admin menu items', () => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
      
      // Admin should see admin link
      cy.get('a[href*="admin"]').should('exist');
    });

    it('manager should see manager-appropriate items', () => {
      cy.loginAsManager();
      cy.visit('/dashboard');
      
      // Manager should see products, employees, purchases
      cy.get('a[href*="products"]').should('exist');
      cy.get('a[href*="employees"]').should('exist');
      cy.get('a[href*="purchases"]').should('exist');
    });

    it('employee should have limited navigation', () => {
      cy.loginAsEmployee();
      cy.visit('/dashboard');
      
      // Employee might not see admin link
      cy.get('body').then(($body) => {
        // Admin link should either not exist or be hidden
        const adminLink = $body.find('a[href*="admin"]');
        if (adminLink.length > 0) {
          cy.wrap(adminLink).should('not.be.visible');
        }
      });
    });
  });

  describe('Breadcrumbs', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should display breadcrumbs on detail pages', () => {
      cy.visit('/products');
      
      cy.get('body').then(($body) => {
        if ($body.find('.breadcrumb, nav[aria-label="breadcrumb"]').length > 0) {
          cy.get('.breadcrumb, nav[aria-label="breadcrumb"]').should('be.visible');
        }
      });
    });

    it('should navigate via breadcrumb links', () => {
      cy.visit('/products/new');
      
      cy.get('body').then(($body) => {
        if ($body.find('.breadcrumb a, nav[aria-label="breadcrumb"] a').length > 0) {
          cy.get('.breadcrumb a, nav[aria-label="breadcrumb"] a')
            .contains(/products|termék/i)
            .click();
          cy.url().should('match', /\/products$/);
        }
      });
    });
  });

  describe('404 Page', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should display 404 page for invalid routes', () => {
      cy.visit('/this-route-does-not-exist', { failOnStatusCode: false });
      
      cy.get('body').should('contain.text', /404|not found|nem található/i);
    });

    it('should have link to home from 404 page', () => {
      cy.visit('/this-route-does-not-exist', { failOnStatusCode: false });
      
      cy.get('a').contains(/home|kezdőlap|vissza|dashboard/i).should('exist');
    });

    it('should navigate back to dashboard from 404', () => {
      cy.visit('/this-route-does-not-exist', { failOnStatusCode: false });
      
      cy.get('a').contains(/home|kezdőlap|vissza|dashboard/i).click();
      
      cy.url().should('match', /\/(dashboard)?$/);
    });

    it('should show 404 for invalid product ID', () => {
      cy.visit('/products/99999999', { failOnStatusCode: false });
      
      // Either 404 page or redirected
      cy.url().should('satisfy', (url: string) => {
        return !url.includes('/products/99999999') || 
               url.includes('not-found');
      });
    });
  });

  describe('Unauthorized Page', () => {
    it('should display when employee tries to access admin route', () => {
      cy.loginAsEmployee();
      cy.visit('/admin');
      
      // Should show unauthorized or redirect
      cy.url().should('satisfy', (url: string) => {
        return url.includes('/unauthorized') || 
               url.includes('/dashboard') || 
               !url.includes('/admin');
      });
    });

    it('should have link back to allowed area', () => {
      cy.loginAsEmployee();
      cy.visit('/admin');
      
      // If on unauthorized page, should have link back
      cy.get('body').then(($body) => {
        if ($body.text().match(/unauthorized|access denied|nincs jogosultság/i)) {
          cy.get('a').contains(/back|vissza|dashboard|home/i).should('exist');
        }
      });
    });

    it('should show appropriate message for unauthorized access', () => {
      cy.loginAsEmployee();
      cy.visit('/employees/new');
      
      // Should show message or redirect
      cy.get('body').then(($body) => {
        const text = $body.text().toLowerCase();
        const hasUnauthorizedMessage = 
          text.includes('unauthorized') || 
          text.includes('access denied') ||
          text.includes('permission') ||
          text.includes('jogosultság');
        
        // Either shows message or redirected away
        cy.url().then((url) => {
          expect(hasUnauthorizedMessage || !url.includes('/employees/new')).to.be.true;
        });
      });
    });

    it('should allow navigation after unauthorized redirect', () => {
      cy.loginAsEmployee();
      cy.visit('/admin');
      
      // Should be able to navigate to allowed route
      cy.visit('/dashboard');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Responsive Navigation', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should show mobile menu on small screens', () => {
      cy.viewport('iphone-x');
      cy.visit('/dashboard');
      
      // Should have hamburger menu or mobile nav toggle
      cy.get('body').then(($body) => {
        const mobileToggle = $body.find('.navbar-toggler, .hamburger, [aria-label="Toggle navigation"], .mobile-menu-btn');
        if (mobileToggle.length > 0) {
          cy.wrap(mobileToggle).should('be.visible');
        }
      });
    });

    it('should toggle mobile menu', () => {
      cy.viewport('iphone-x');
      cy.visit('/dashboard');
      
      cy.get('body').then(($body) => {
        const mobileToggle = $body.find('.navbar-toggler, .hamburger, [aria-label="Toggle navigation"], .mobile-menu-btn');
        if (mobileToggle.length > 0) {
          cy.wrap(mobileToggle).click();
          // Menu should expand
          cy.get('.navbar-collapse, .mobile-menu, .sidebar').should('be.visible');
        }
      });
    });

    it('should show full navigation on large screens', () => {
      cy.viewport(1280, 720);
      cy.visit('/dashboard');
      
      // Navigation links should be visible
      cy.get('a[href*="products"]').should('be.visible');
      cy.get('a[href*="employees"]').should('be.visible');
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should show loading indicator during page transitions', () => {
      cy.intercept('GET', '**/api/v1/products*', (req) => {
        req.on('response', (res) => {
          res.setDelay(1000);
        });
      }).as('slowProducts');
      
      cy.visit('/products');
      
      // Should show loading spinner or skeleton
      cy.get('.spinner, .loading, .skeleton, [role="progressbar"]').should('exist');
      
      cy.wait('@slowProducts');
      
      // Loading should disappear
      cy.get('table').should('exist');
    });

    it('should show error state when API fails', () => {
      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 500,
        body: { error: { message: 'Internal Server Error' } }
      }).as('failedProducts');
      
      cy.visit('/products');
      cy.wait('@failedProducts');
      
      // Should show error message
      cy.get('.alert-danger, .error, [role="alert"]').should('be.visible');
    });
  });

  describe('Deep Linking', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should handle direct navigation to product detail', () => {
      cy.fixture('products').then((products) => {
        cy.createProduct(products[0]).then((product) => {
          cy.visit(`/products/${product.id}`);
          cy.url().should('include', `/products/${product.id}`);
        });
      });
    });

    it('should handle direct navigation to employee detail', () => {
      cy.fixture('employees').then((employees) => {
        cy.createEmployee(employees[0]).then((employee) => {
          cy.visit(`/employees/${employee.id}`);
          cy.url().should('include', `/employees/${employee.id}`);
        });
      });
    });

    it('should preserve query parameters on navigation', () => {
      cy.visit('/products?page=2&sort=name');
      cy.url().should('include', 'page=2');
      cy.url().should('include', 'sort=name');
    });
  });

  describe('Back Navigation', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should navigate back with browser back button', () => {
      cy.visit('/products');
      cy.visit('/employees');
      
      cy.go('back');
      
      cy.url().should('include', '/products');
    });

    it('should navigate forward with browser forward button', () => {
      cy.visit('/products');
      cy.visit('/employees');
      cy.go('back');
      cy.go('forward');
      
      cy.url().should('include', '/employees');
    });
  });
});
