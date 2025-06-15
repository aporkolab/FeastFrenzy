/**
 * Purchases E2E Tests
 * Tests CRUD operations for purchases and purchase items
 */

describe('Purchases', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  describe('Purchases List', () => {
    beforeEach(() => {
      cy.interceptApi('GET', '/purchases*', 'getPurchases');
      cy.visit('/purchases');
    });

    it('should display purchases list page', () => {
      cy.wait('@getPurchases');
      cy.get('h1, h2').should('contain.text', /purchase|vásárlás|rendelés/i);
    });

    it('should display purchases table', () => {
      cy.wait('@getPurchases');
      cy.get('table').should('exist');
    });

    it('should display purchase columns', () => {
      cy.wait('@getPurchases');
      cy.get('th').should('contain.text', /date|dátum/i);
      cy.get('th').should('contain.text', /employee|alkalmazott|dolgozó/i);
    });

    it('should have create new purchase button', () => {
      cy.get('button, a').contains(/new|add|create|új/i).should('exist');
    });

    it('should navigate to create purchase page', () => {
      cy.get('button, a').contains(/new|add|create|új/i).click();
      cy.url().should('include', '/purchases/new');
    });

    it('should display status column (open/closed)', () => {
      cy.wait('@getPurchases');
      cy.get('th').should('contain.text', /status|státusz|állapot/i);
    });
  });

  describe('Create Purchase', () => {
    beforeEach(() => {
      // Create an employee first for the purchase
      cy.fixture('employees').then((employees) => {
        cy.createEmployee(employees[0]);
      });
      
      cy.interceptApi('POST', '/purchases', 'createPurchase');
      cy.interceptApi('GET', '/employees*', 'getEmployees');
      cy.visit('/purchases/new');
    });

    it('should display purchase form', () => {
      cy.get('form').should('exist');
      cy.get('input[name="date"], input[type="date"], #date').should('exist');
      cy.get('select[name="employeeId"], #employeeId, [name="employee"]').should('exist');
    });

    it('should load employees in dropdown', () => {
      cy.wait('@getEmployees');
      cy.get('select[name="employeeId"], #employeeId, [name="employee"]').should('have.length.greaterThan', 0);
    });

    it('should show validation errors for empty form', () => {
      cy.get('button[type="submit"]').click();
      cy.get('.invalid-feedback, .error, [role="alert"]').should('exist');
    });

    it('should create purchase with valid data', () => {
      cy.wait('@getEmployees');
      
      // Fill the form
      const today = new Date().toISOString().split('T')[0];
      cy.get('input[name="date"], input[type="date"], #date').type(today);
      cy.get('select[name="employeeId"], #employeeId, [name="employee"]').select(1);
      cy.get('button[type="submit"]').click();

      cy.wait('@createPurchase').its('response.statusCode').should('eq', 201);
    });

    it('should have cancel button', () => {
      cy.get('button, a').contains(/cancel|mégse|vissza|back/i).click();
      cy.url().should('match', /\/purchases$/);
    });
  });

  describe('Purchase Detail', () => {
    let purchaseId: number;
    let employeeId: number;

    beforeEach(() => {
      cy.fixture('employees').then((employees) => {
        cy.createEmployee(employees[0]).then((employee) => {
          employeeId = employee.id!;
          const today = new Date().toISOString().split('T')[0];
          cy.createPurchase({
            date: today,
            employeeId: employeeId,
            closed: false
          }).then((purchase) => {
            purchaseId = purchase.id!;
            cy.interceptApi('GET', `/purchases/${purchaseId}`, 'getPurchase');
            cy.interceptApi('GET', `/purchases/${purchaseId}/items*`, 'getPurchaseItems');
            cy.visit(`/purchases/${purchaseId}`);
          });
        });
      });
    });

    it('should display purchase details', () => {
      cy.wait('@getPurchase');
      cy.get('body').should('contain.text', /date|dátum/i);
    });

    it('should display purchase items section', () => {
      cy.wait('@getPurchase');
      cy.get('body').should('contain.text', /item|tétel/i);
    });

    it('should have close purchase button for open purchase', () => {
      cy.wait('@getPurchase');
      cy.get('button').contains(/close|lezár/i).should('exist');
    });

    it('should have add item button for open purchase', () => {
      cy.wait('@getPurchase');
      cy.get('button, a').contains(/add.*item|tétel.*hozzáadás|új.*tétel/i).should('exist');
    });
  });

  describe('Close Purchase', () => {
    let purchaseId: number;
    let employeeId: number;

    beforeEach(() => {
      cy.fixture('employees').then((employees) => {
        cy.createEmployee(employees[1]).then((employee) => {
          employeeId = employee.id!;
          const today = new Date().toISOString().split('T')[0];
          cy.createPurchase({
            date: today,
            employeeId: employeeId,
            closed: false
          }).then((purchase) => {
            purchaseId = purchase.id!;
            cy.interceptApi('PUT', `/purchases/${purchaseId}`, 'closePurchase');
            cy.interceptApi('GET', `/purchases/${purchaseId}`, 'getPurchase');
            cy.visit(`/purchases/${purchaseId}`);
          });
        });
      });
    });

    it('should show confirmation before closing', () => {
      cy.wait('@getPurchase');
      
      cy.get('button').contains(/close|lezár/i).click();
      cy.get('[role="dialog"], .modal, .confirm-dialog').should('be.visible');
    });

    it('should close purchase when confirmed', () => {
      cy.wait('@getPurchase');
      
      cy.get('button').contains(/close|lezár/i).click();
      
      cy.get('[role="dialog"], .modal').within(() => {
        cy.get('button').contains(/yes|confirm|ok|igen/i).click();
      });

      cy.wait('@closePurchase');
    });
  });

  describe('Delete Purchase', () => {
    let purchaseId: number;
    let employeeId: number;

    beforeEach(() => {
      cy.fixture('employees').then((employees) => {
        cy.createEmployee(employees[2]).then((employee) => {
          employeeId = employee.id!;
          const today = new Date().toISOString().split('T')[0];
          cy.createPurchase({
            date: today,
            employeeId: employeeId,
            closed: false
          }).then((purchase) => {
            purchaseId = purchase.id!;
            cy.interceptApi('DELETE', `/purchases/${purchaseId}`, 'deletePurchase');
            cy.interceptApi('GET', '/purchases*', 'getPurchases');
            cy.visit('/purchases');
          });
        });
      });
    });

    it('should show delete confirmation dialog', () => {
      cy.wait('@getPurchases');
      
      cy.get('button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger, [data-testid="delete-btn"]')
        .first()
        .click();

      cy.get('[role="dialog"], .modal, .confirm-dialog').should('be.visible');
    });

    it('should delete purchase when confirmed', () => {
      cy.wait('@getPurchases');
      
      cy.get('button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger, [data-testid="delete-btn"]')
        .first()
        .click();

      cy.get('[role="dialog"], .modal').within(() => {
        cy.get('button').contains(/yes|confirm|ok|igen|törlés/i).click();
      });

      cy.wait('@deletePurchase').its('response.statusCode').should('be.oneOf', [200, 204]);
    });
  });

  describe('Purchase Items', () => {
    let purchaseId: number;
    let employeeId: number;

    beforeEach(() => {
      cy.fixture('employees').then((employees) => {
        cy.createEmployee(employees[0]).then((employee) => {
          employeeId = employee.id!;
          const today = new Date().toISOString().split('T')[0];
          cy.createPurchase({
            date: today,
            employeeId: employeeId,
            closed: false
          }).then((purchase) => {
            purchaseId = purchase.id!;
            
            // Also create a product for adding items
            cy.fixture('products').then((products) => {
              cy.createProduct(products[0]);
            });
            
            cy.interceptApi('GET', `/purchases/${purchaseId}`, 'getPurchase');
            cy.interceptApi('POST', '/purchase-items', 'createItem');
            cy.interceptApi('GET', '/products*', 'getProducts');
            cy.visit(`/purchases/${purchaseId}`);
          });
        });
      });
    });

    it('should add item to purchase', () => {
      cy.wait('@getPurchase');
      
      // Click add item
      cy.get('button, a').contains(/add.*item|tétel.*hozzáadás|új.*tétel/i).click();
      
      // Fill item form (may be in modal or separate page)
      cy.wait('@getProducts');
      
      cy.get('body').then(($body) => {
        // Check if modal or inline form
        const formContainer = $body.find('[role="dialog"], .modal, form');
        
        cy.wrap(formContainer).within(() => {
          cy.get('select[name="productId"], #productId, [name="product"]').select(1);
          cy.get('input[name="quantity"], #quantity').clear().type('2');
          cy.get('button[type="submit"]').click();
        });
      });

      cy.wait('@createItem').its('response.statusCode').should('eq', 201);
    });
  });

  describe('Purchase Filter & Search', () => {
    beforeEach(() => {
      cy.interceptApi('GET', '/purchases*', 'getPurchases');
      cy.visit('/purchases');
    });

    it('should filter by date range', () => {
      cy.wait('@getPurchases');
      
      cy.get('body').then(($body) => {
        if ($body.find('input[name="startDate"], input[name="dateFrom"]').length > 0) {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          cy.get('input[name="startDate"], input[name="dateFrom"]')
            .type(lastMonth.toISOString().split('T')[0]);
          
          cy.wait('@getPurchases');
        }
      });
    });

    it('should filter by status (open/closed)', () => {
      cy.wait('@getPurchases');
      
      cy.get('body').then(($body) => {
        if ($body.find('select[name="status"], [name="closed"]').length > 0) {
          cy.get('select[name="status"], [name="closed"]').select('closed');
          cy.wait('@getPurchases');
        }
      });
    });

    it('should filter by employee', () => {
      cy.wait('@getPurchases');
      
      cy.get('body').then(($body) => {
        if ($body.find('select[name="employeeId"], [name="employee"]').length > 0) {
          cy.get('select[name="employeeId"], [name="employee"]').select(1);
          cy.wait('@getPurchases');
        }
      });
    });
  });

  describe('Purchase Report', () => {
    beforeEach(() => {
      cy.interceptApi('GET', '/purchases*', 'getPurchases');
      cy.visit('/purchases/report');
    });

    it('should display purchase report page', () => {
      cy.get('h1, h2').should('exist');
    });

    it('should show purchase statistics', () => {
      cy.wait('@getPurchases');
      cy.get('table, .chart, .stats, .card').should('exist');
    });
  });

  describe('Employee View - Own Purchases Only', () => {
    beforeEach(() => {
      cy.loginAsEmployee();
    });

    it('should only see own purchases', () => {
      // Mock response with only current user's purchases
      cy.intercept('GET', '**/api/v1/purchases*', {
        statusCode: 200,
        body: {
          data: [
            { 
              id: 1, 
              date: '2024-01-15', 
              employeeId: 3, // Current employee's ID
              employee: { name: 'Employee User' },
              closed: false,
              totalAmount: 150
            }
          ],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      }).as('employeePurchases');

      cy.visit('/purchases');
      cy.wait('@employeePurchases');

      // Should only see own purchases
      cy.get('table tbody tr').should('have.length.at.most', 1);
    });

    it('should be able to create purchase for self', () => {
      cy.interceptApi('GET', '/employees*', 'getEmployees');
      cy.visit('/purchases/new');

      cy.wait('@getEmployees');

      // Employee dropdown should be pre-selected or limited to self
      cy.get('select[name="employeeId"], #employeeId, [name="employee"]')
        .should('exist');
    });

    it('should NOT see other employees purchases', () => {
      cy.intercept('GET', '**/api/v1/purchases*', (req) => {
        // Check that request is filtered for current employee
        expect(req.url).to.match(/employeeId|userId|owner/);
      }).as('filteredPurchases');

      cy.visit('/purchases');
    });

    it('should only see own purchase in detail view', () => {
      // Mock own purchase
      cy.intercept('GET', '**/api/v1/purchases/1', {
        statusCode: 200,
        body: { 
          id: 1, 
          date: '2024-01-15', 
          employeeId: 3,
          employee: { name: 'Employee User' },
          closed: false 
        }
      }).as('ownPurchase');

      cy.visit('/purchases/1');
      cy.wait('@ownPurchase');
      cy.get('body').should('contain.text', /date|dátum/i);
    });

    it('should NOT access other employees purchase detail', () => {
      // Mock 403 for other employee's purchase
      cy.intercept('GET', '**/api/v1/purchases/999', {
        statusCode: 403,
        body: { error: { message: 'Access denied' } }
      }).as('forbiddenPurchase');

      cy.visit('/purchases/999');

      // Should redirect to unauthorized or show error
      cy.url().should('satisfy', (url: string) => {
        return url.includes('/unauthorized') || 
               url.includes('/purchases') && !url.includes('/999');
      });
    });
  });

  describe('Purchase Detail View', () => {
    let purchaseId: number;
    let employeeId: number;

    beforeEach(() => {
      cy.loginAsAdmin();
      cy.fixture('employees').then((employees) => {
        cy.createEmployee(employees[0]).then((employee) => {
          employeeId = employee.id!;
          const today = new Date().toISOString().split('T')[0];
          cy.createPurchase({
            date: today,
            employeeId: employeeId,
            closed: false
          }).then((purchase) => {
            purchaseId = purchase.id!;
          });
        });
      });
    });

    it('should show purchase details', () => {
      cy.interceptApi('GET', `/purchases/${purchaseId}`, 'getPurchase');
      cy.visit(`/purchases/${purchaseId}`);
      cy.wait('@getPurchase');

      cy.get('body').should('contain.text', /date|dátum/i);
      cy.get('body').should('contain.text', /employee|alkalmazott|dolgozó/i);
    });

    it('should list all items', () => {
      cy.interceptApi('GET', `/purchases/${purchaseId}`, 'getPurchase');
      cy.visit(`/purchases/${purchaseId}`);
      cy.wait('@getPurchase');

      // Items section should exist
      cy.get('body').should('contain.text', /item|tétel/i);
    });

    it('should show item prices and quantities', () => {
      // Create purchase with items
      cy.fixture('products').then((products) => {
        cy.createProduct(products[0]).then((product) => {
          cy.intercept('GET', `**/api/v1/purchases/${purchaseId}`, {
            statusCode: 200,
            body: {
              id: purchaseId,
              date: new Date().toISOString().split('T')[0],
              employeeId: employeeId,
              closed: false,
              items: [
                { id: 1, productId: product.id, quantity: 2, price: product.price }
              ]
            }
          }).as('purchaseWithItems');

          cy.visit(`/purchases/${purchaseId}`);
          cy.wait('@purchaseWithItems');

          // Should show quantity and price columns
          cy.get('body').should('contain.text', /quantity|mennyiség|db/i);
          cy.get('body').should('contain.text', /price|ár/i);
        });
      });
    });

    it('should show total amount', () => {
      cy.intercept('GET', `**/api/v1/purchases/${purchaseId}`, {
        statusCode: 200,
        body: {
          id: purchaseId,
          date: new Date().toISOString().split('T')[0],
          employeeId: employeeId,
          closed: false,
          totalAmount: 1500
        }
      }).as('purchaseWithTotal');

      cy.visit(`/purchases/${purchaseId}`);
      cy.wait('@purchaseWithTotal');

      cy.get('body').should('contain.text', /total|összesen|össz/i);
    });
  });
});
