/**
 * FeastFrenzy Accessibility Tests
 *
 * Uses axe-core to check for WCAG 2.1 AA compliance.
 * Run: npx cypress run --spec "cypress/e2e/accessibility.cy.ts"
 */

describe('Accessibility Tests', () => {
  describe('Public Pages', () => {
    beforeEach(() => {
      cy.injectAxe();
    });

    it('should have no accessibility violations on login page', () => {
      cy.visit('/login');
      cy.injectAxe();
      cy.checkA11y(undefined, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
      });
    });

    it('should have no accessibility violations on register page', () => {
      cy.visit('/register');
      cy.injectAxe();
      cy.checkA11y(undefined, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
      });
    });
  });

  describe('Authenticated Pages', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should have no accessibility violations on dashboard', () => {
      cy.visit('/dashboard');
      cy.injectAxe();
      // Wait for content to load
      cy.get('main, .main-content, [role="main"]', { timeout: 10000 }).should('exist');
      cy.checkA11y();
    });

    it('should have no accessibility violations on products list', () => {
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      cy.injectAxe();
      cy.wait('@getProducts');
      // Wait for table to load
      cy.get('table', { timeout: 10000 }).should('be.visible');
      cy.checkA11y();
    });

    it('should have no accessibility violations on product form', () => {
      cy.visit('/products/new');
      cy.injectAxe();
      cy.get('form').should('be.visible');
      cy.checkA11y();
    });

    it('should have no accessibility violations on employees list', () => {
      cy.interceptApi('GET', '/employees*', 'getEmployees');
      cy.visit('/employees');
      cy.injectAxe();
      cy.wait('@getEmployees');
      cy.get('table', { timeout: 10000 }).should('be.visible');
      cy.checkA11y();
    });

    it('should have no accessibility violations on purchases list', () => {
      cy.interceptApi('GET', '/purchases*', 'getPurchases');
      cy.visit('/purchases');
      cy.injectAxe();
      cy.wait('@getPurchases');
      cy.get('table', { timeout: 10000 }).should('be.visible');
      cy.checkA11y();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should allow skip link navigation', () => {
      cy.visit('/login');

      // Tab to skip link
      cy.get('body').tab();

      // If skip link exists
      cy.get('body').then(($body) => {
        if ($body.find('.skip-link, [href="#main-content"]').length > 0) {
          cy.focused().should('have.class', 'skip-link');
          cy.focused().type('{enter}');
          cy.focused().should('have.id', 'main-content');
        }
      });
    });

    it('should trap focus in modal dialogs', () => {
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      cy.wait('@getProducts');

      // Click delete to open confirm dialog
      cy.get(
        'button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger, [data-testid="delete-btn"]'
      )
        .first()
        .click();

      // Focus should be trapped in modal
      cy.get('[role="dialog"], .modal').should('be.visible');

      // Tab through modal elements
      cy.focused().should('be.visible');

      // Tab should cycle within modal
      cy.get('body').tab().tab().tab().tab();
      cy.focused().closest('[role="dialog"], .modal').should('exist');

      // Close modal
      cy.get('[role="dialog"], .modal')
        .find('button')
        .contains(/cancel|mégse|close/i)
        .click();
    });

    it('should allow sorting tables via keyboard', () => {
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      cy.wait('@getProducts');

      // Tab to sortable header
      cy.get('th[aria-sort], th button, th.sortable').first().focus();

      // Activate sort with Enter
      cy.focused().type('{enter}');

      // Wait for new API call
      cy.wait('@getProducts');
    });

    it('should allow form submission via keyboard', () => {
      cy.visit('/login');
      
      cy.fixture('users').then((users) => {
        // Tab through form
        cy.get('input[type="email"], #email').focus().type(users.admin.email);
        cy.focused().tab();
        cy.focused().type(users.admin.password);
        cy.focused().tab();
        
        // Submit with Enter
        cy.focused().type('{enter}');
        
        // Should submit successfully
        cy.url().should('not.include', '/login');
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should announce form errors to screen readers', () => {
      cy.visit('/login');

      // Submit empty form
      cy.get('form').submit();

      // Error messages should have role="alert" or aria-live
      cy.get('[role="alert"], [aria-live="polite"], [aria-live="assertive"], .invalid-feedback')
        .should('exist');
    });

    it('should associate labels with inputs', () => {
      cy.visit('/login');

      // Each input should have associated label
      cy.get('input[id]').each(($input) => {
        const id = $input.attr('id');
        if (id) {
          cy.get(`label[for="${id}"]`).should('exist');
        }
      });
    });

    it('should mark required fields appropriately', () => {
      cy.visit('/login');

      // Required fields should have aria-required or required attribute
      cy.get('input[required], input[aria-required="true"]').should(
        'have.length.at.least',
        2
      );
    });

    it('should have descriptive button text', () => {
      cy.visit('/login');

      // Submit button should have descriptive text
      cy.get('button[type="submit"]')
        .should('exist')
        .invoke('text')
        .should('not.be.empty');
    });
  });

  describe('Color and Contrast', () => {
    it('should meet color contrast requirements on login', () => {
      cy.visit('/login');
      cy.injectAxe();

      // Check specifically for color contrast violations
      cy.checkA11y(undefined, {
        runOnly: {
          type: 'rule',
          values: ['color-contrast'],
        },
      });
    });

    it('should meet color contrast requirements on forms', () => {
      cy.loginAsAdmin();
      cy.visit('/products/new');
      cy.injectAxe();

      cy.checkA11y(undefined, {
        runOnly: {
          type: 'rule',
          values: ['color-contrast'],
        },
      });
    });
  });

  describe('Screen Reader Content', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should have proper page structure', () => {
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      cy.wait('@getProducts');
      cy.injectAxe();

      // Should have main landmark
      cy.get('main, [role="main"]').should('exist');

      // Should have navigation landmark
      cy.get('nav, [role="navigation"]').should('exist');

      // Should have h1
      cy.get('h1').should('exist');
    });

    it('should have accessible table structure', () => {
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      cy.wait('@getProducts');

      // Wait for table to load
      cy.get('table').should('be.visible');

      // Table should have headers
      cy.get('th').should('have.length.at.least', 2);
    });

    it('should have accessible images', () => {
      cy.visit('/dashboard');
      cy.injectAxe();

      // All images should have alt text
      cy.get('img').each(($img) => {
        cy.wrap($img).should('have.attr', 'alt');
      });
    });

    it('should have descriptive link text', () => {
      cy.visit('/dashboard');

      // Links should not just say "click here" or "read more"
      cy.get('a').each(($link) => {
        const text = $link.text().toLowerCase().trim();
        expect(text).not.to.match(/^(click here|read more|more|here)$/);
      });
    });
  });

  describe('Focus Management', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should show visible focus indicators', () => {
      cy.visit('/login');

      // Tab through elements and check focus is visible
      cy.get('input').first().focus();
      cy.focused().should('have.css', 'outline').and('not.eq', 'none');
    });

    it('should return focus after modal closes', () => {
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      cy.wait('@getProducts');

      // Open delete dialog
      const deleteBtn =
        'button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger, [data-testid="delete-btn"]';
      cy.get(deleteBtn).first().as('deleteButton').click();

      // Close modal
      cy.get('[role="dialog"], .modal')
        .find('button')
        .contains(/cancel|mégse|close/i)
        .click();

      // Focus should return to delete button
      cy.focused().closest('tr').should('exist');
    });
  });

  describe('ARIA Implementation', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('should use appropriate ARIA roles', () => {
      cy.visit('/dashboard');

      // Navigation should have role
      cy.get('nav, [role="navigation"]').should('exist');

      // Main content should have role
      cy.get('main, [role="main"]').should('exist');
    });

    it('should have aria-label on icon-only buttons', () => {
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      cy.wait('@getProducts');

      // Icon buttons should have aria-label
      cy.get('button').each(($btn) => {
        const text = $btn.text().trim();
        if (!text || text.length === 0) {
          cy.wrap($btn).should('have.attr', 'aria-label');
        }
      });
    });

    it('should have proper aria-expanded on collapsible elements', () => {
      cy.visit('/dashboard');

      // Check for collapsible elements
      cy.get('[aria-expanded]').each(($el) => {
        const expanded = $el.attr('aria-expanded');
        expect(expanded).to.be.oneOf(['true', 'false']);
      });
    });
  });

  describe('Reduced Motion', () => {
    it('should respect prefers-reduced-motion', () => {
      // Emulate reduced motion preference
      cy.wrap(
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: {
            features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
          },
        })
      );

      cy.visit('/login');

      // Animations should be reduced or disabled
      cy.get('.spinner, .loading').then(($spinner) => {
        if ($spinner.length > 0) {
          cy.wrap($spinner).should('satisfy', ($el: JQuery<HTMLElement>) => {
            const animationDuration = $el.css('animation-duration');
            return animationDuration === '0s' || animationDuration === '0.01ms';
          });
        }
      });
    });
  });
});
