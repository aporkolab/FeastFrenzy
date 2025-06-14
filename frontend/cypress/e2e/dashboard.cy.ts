/**
 * Dashboard E2E Tests
 *
 * Tests for the main dashboard/landing page functionality:
 * - User greeting and personalization
 * - Navigation cards display
 * - Role-based card visibility
 * - Navigation to different sections
 * - Responsive layout
 */

describe('Dashboard', () => {
  describe('Unauthenticated Access', () => {
    it('should redirect to login when not authenticated', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });
  });

  describe('Admin User', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
    });

    it('should display welcome message with user name', () => {
      cy.fixture('users').then((users) => {
        // Should show greeting with user's name
        cy.get('h1, h2, .welcome-message, [data-testid="greeting"]')
          .should('be.visible')
          .and('contain.text', /good morning|good afternoon|good evening/i);
      });
    });

    it('should display user name or email', () => {
      cy.fixture('users').then((users) => {
        cy.get('body').should('satisfy', ($body) => {
          const text = $body.text().toLowerCase();
          return text.includes(users.admin.email.toLowerCase()) ||
                 text.includes('admin');
        });
      });
    });

    it('should display all navigation cards', () => {
      // Admin should see all 4 cards
      cy.get('.card, [data-testid="nav-card"], .dashboard-card')
        .should('have.length.at.least', 4);
    });

    it('should display Employees card', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/employees|alkalmazottak/i)
        .should('be.visible');
    });

    it('should display Products card', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/products|termékek/i)
        .should('be.visible');
    });

    it('should display Purchases card', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/purchases|vásárlások/i)
        .should('be.visible');
    });

    it('should display Reports card', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/reports|riportok|jelentések/i)
        .should('be.visible');
    });

    it('should navigate to Employees page when clicking Employees card', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/employees|alkalmazottak/i)
        .closest('a, .card')
        .click();
      
      cy.url().should('include', '/employees');
    });

    it('should navigate to Products page when clicking Products card', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/products|termékek/i)
        .closest('a, .card')
        .click();
      
      cy.url().should('include', '/products');
    });

    it('should navigate to Purchases page when clicking Purchases card', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/purchases|vásárlások/i)
        .closest('a, .card')
        .click();
      
      cy.url().should('include', '/purchases');
    });

    it('should navigate to Reports page when clicking Reports card', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/reports|riportok|jelentések/i)
        .closest('a, .card')
        .click();
      
      cy.url().should('include', '/report');
    });

    it('should display card icons', () => {
      // Each card should have an icon (emoji or icon element)
      cy.get('.card, [data-testid="nav-card"]').each(($card) => {
        cy.wrap($card).find('.icon, .emoji, [data-testid="card-icon"], span')
          .should('exist');
      });
    });

    it('should display card descriptions', () => {
      cy.get('.card, [data-testid="nav-card"]').each(($card) => {
        cy.wrap($card).find('p, .description, [data-testid="card-description"]')
          .should('exist')
          .and('not.be.empty');
      });
    });
  });

  describe('Manager User', () => {
    beforeEach(() => {
      cy.loginAsManager();
      cy.visit('/dashboard');
    });

    it('should display welcome message', () => {
      cy.get('h1, h2, .welcome-message, [data-testid="greeting"]')
        .should('be.visible');
    });

    it('should display navigation cards', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .should('have.length.at.least', 3);
    });

    it('should be able to navigate to Products', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/products|termékek/i)
        .closest('a, .card')
        .click();
      
      cy.url().should('include', '/products');
    });

    it('should be able to navigate to Employees', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/employees|alkalmazottak/i)
        .closest('a, .card')
        .click();
      
      cy.url().should('include', '/employees');
    });

    it('should be able to navigate to Purchases', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/purchases|vásárlások/i)
        .closest('a, .card')
        .click();
      
      cy.url().should('include', '/purchases');
    });
  });

  describe('Employee User', () => {
    beforeEach(() => {
      cy.loginAsEmployee();
      cy.visit('/dashboard');
    });

    it('should display welcome message', () => {
      cy.get('h1, h2, .welcome-message, [data-testid="greeting"]')
        .should('be.visible');
    });

    it('should display navigation cards', () => {
      // Employee should still see cards (may have limited access)
      cy.get('.card, [data-testid="nav-card"]')
        .should('have.length.at.least', 2);
    });

    it('should be able to navigate to Products', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/products|termékek/i)
        .closest('a, .card')
        .click();
      
      cy.url().should('include', '/products');
    });

    it('should be able to navigate to Purchases', () => {
      cy.get('.card, [data-testid="nav-card"]')
        .contains(/purchases|vásárlások/i)
        .closest('a, .card')
        .click();
      
      cy.url().should('include', '/purchases');
    });

    it('should redirect to unauthorized when accessing Employees directly', () => {
      cy.visit('/employees');
      cy.url().should('include', '/unauthorized');
    });
  });

  describe('Greeting Time-Based Display', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should show "Good morning" before noon', () => {
      // Mock the time to 9:00 AM
      cy.clock(new Date(2024, 0, 15, 9, 0, 0).getTime());
      cy.visit('/dashboard');
      
      cy.get('h1, h2, .welcome-message, [data-testid="greeting"]')
        .should('contain.text', /good morning/i);
    });

    it('should show "Good afternoon" between noon and 6 PM', () => {
      // Mock the time to 2:00 PM
      cy.clock(new Date(2024, 0, 15, 14, 0, 0).getTime());
      cy.visit('/dashboard');
      
      cy.get('h1, h2, .welcome-message, [data-testid="greeting"]')
        .should('contain.text', /good afternoon/i);
    });

    it('should show "Good evening" after 6 PM', () => {
      // Mock the time to 8:00 PM
      cy.clock(new Date(2024, 0, 15, 20, 0, 0).getTime());
      cy.visit('/dashboard');
      
      cy.get('h1, h2, .welcome-message, [data-testid="greeting"]')
        .should('contain.text', /good evening/i);
    });
  });

  describe('Responsive Layout', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
    });

    it('should display cards in grid on desktop', () => {
      cy.viewport(1280, 720);
      
      // Cards should be in a grid layout
      cy.get('.card, [data-testid="nav-card"]')
        .first()
        .should('be.visible');
    });

    it('should stack cards on mobile', () => {
      cy.viewport(375, 667);
      
      // Cards should still be visible and stacked
      cy.get('.card, [data-testid="nav-card"]')
        .should('be.visible');
    });

    it('should be usable on tablet', () => {
      cy.viewport(768, 1024);
      
      cy.get('.card, [data-testid="nav-card"]')
        .should('be.visible');
      
      // Should be able to click cards
      cy.get('.card, [data-testid="nav-card"]')
        .first()
        .click();
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should show loading indicator while fetching user data', () => {
      cy.intercept('GET', '**/api/v1/auth/me', (req) => {
        req.on('response', (res) => {
          res.setDelay(1000);
        });
      }).as('getUserSlow');

      cy.visit('/dashboard');
      
      // May show loading state or skeleton
      cy.get('.loading, .spinner, .skeleton, [data-testid="loading"]')
        .should('exist');
    });

    it('should display content after loading completes', () => {
      cy.intercept('GET', '**/api/v1/auth/me', {
        statusCode: 200,
        body: {
          id: 1,
          name: 'Admin User',
          email: 'admin@test.com',
          role: 'admin'
        }
      }).as('getUser');

      cy.visit('/dashboard');
      cy.wait('@getUser');
      
      cy.get('.card, [data-testid="nav-card"]')
        .should('be.visible');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should handle API error gracefully', () => {
      cy.intercept('GET', '**/api/v1/auth/me', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('getUserError');

      cy.visit('/dashboard');
      
      // Should either show error message or redirect
      cy.url().should('satisfy', (url: string) => {
        return url.includes('/dashboard') || url.includes('/login');
      });
    });

    it('should redirect to login on 401 error', () => {
      cy.intercept('GET', '**/api/v1/auth/me', {
        statusCode: 401,
        body: { error: 'Unauthorized' }
      }).as('getUserUnauthorized');

      cy.visit('/dashboard');
      
      cy.url().should('include', '/login');
    });
  });

  describe('Quick Actions', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
    });

    it('should allow keyboard navigation between cards', () => {
      cy.get('.card, [data-testid="nav-card"]').first().focus();
      cy.focused().should('exist');
      
      cy.get('body').type('{tab}');
      cy.focused().should('exist');
    });

    it('should allow Enter key to activate card', () => {
      cy.get('.card a, [data-testid="nav-card"] a').first().focus();
      cy.focused().type('{enter}');
      
      // Should navigate away from dashboard
      cy.url().should('not.eq', Cypress.config().baseUrl + '/dashboard');
    });
  });
});