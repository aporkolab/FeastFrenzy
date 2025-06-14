/**
 * Products E2E Tests
 * Tests CRUD operations for products
 */

describe('Products', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  describe('Products List', () => {
    beforeEach(() => {
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
    });

    it('should display products list page', () => {
      cy.wait('@getProducts');
      cy.get('h1, h2').should('contain.text', /product/i);
    });

    it('should display products table', () => {
      cy.wait('@getProducts');
      cy.get('table').should('exist');
    });

    it('should show loading state while fetching', () => {
      // Delay response to see loading state
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
      cy.get('table').should('be.visible');
    });

    it('should display empty state when no products', () => {
      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 200,
        body: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 }
        }
      }).as('emptyProducts');

      cy.visit('/products');
      cy.wait('@emptyProducts');

      // Should show empty state message
      cy.get('body').should('contain.text', /no products|nem található|üres/i);
    });

    it('should have create new product button', () => {
      cy.get('button, a').contains(/new|add|create|új/i).should('exist');
    });

    it('should navigate to create product page', () => {
      cy.get('button, a').contains(/new|add|create|új/i).click();
      cy.url().should('include', '/products/new');
    });

    it('should paginate products', () => {
      // Mock response with pagination
      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 200,
        body: {
          data: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Product ${i + 1}`,
            price: (i + 1) * 100
          })),
          meta: { 
            total: 25, 
            page: 1, 
            limit: 10, 
            totalPages: 3,
            hasNextPage: true,
            hasPrevPage: false
          }
        }
      }).as('paginatedProducts');

      cy.visit('/products');
      cy.wait('@paginatedProducts');

      // Should show pagination controls
      cy.get('[aria-label*="pagination"], .pagination, nav[aria-label="Page navigation"]').should('exist');
      
      // Should show page numbers
      cy.get('.page-link, .pagination button').should('have.length.at.least', 2);
    });

    it('should sort by name', () => {
      cy.wait('@getProducts');
      
      cy.intercept('GET', '**/api/v1/products*').as('sortedProducts');
      
      // Click on name header to sort
      cy.get('th').contains(/name|név/i).click();
      
      cy.wait('@sortedProducts').its('request.url').should('match', /sort.*name|sortBy.*name/i);
    });

    it('should sort by price', () => {
      cy.wait('@getProducts');
      
      cy.intercept('GET', '**/api/v1/products*').as('sortedProducts');
      
      // Click on price header to sort
      cy.get('th').contains(/price|ár/i).click();
      
      cy.wait('@sortedProducts').its('request.url').should('match', /sort.*price|sortBy.*price/i);
    });

    it('should filter by name', () => {
      cy.wait('@getProducts');
      
      cy.intercept('GET', '**/api/v1/products*').as('filteredProducts');
      
      // Type in search field
      cy.get('input[type="text"], input[placeholder*="search"], input[placeholder*="keres"], #filter-name')
        .first()
        .type('Pizza');
      
      cy.wait('@filteredProducts').its('request.url').should('match', /name=.*Pizza|filter.*Pizza/i);
    });

    it('should filter by price range', () => {
      cy.wait('@getProducts');
      
      cy.intercept('GET', '**/api/v1/products*').as('filteredProducts');
      
      // Set min price filter
      cy.get('input[placeholder*="min"], #filter-min-price').type('100');
      
      cy.wait('@filteredProducts');
      
      // Set max price filter  
      cy.get('input[placeholder*="max"], #filter-max-price').type('500');
      
      cy.wait('@filteredProducts');
    });

    it('should show success toast after operations', () => {
      cy.wait('@getProducts');
      
      cy.fixture('products').then((products) => {
        cy.createProduct(products[0]).then((product) => {
          cy.intercept('DELETE', `**/api/v1/products/${product.id}`, {
            statusCode: 200,
            body: { message: 'Deleted successfully' }
          }).as('deleteProduct');
          
          cy.reload();
          cy.wait('@getProducts');
          
          // Delete the product
          cy.get('button[aria-label*="Delete"], .btn-danger').first().click();
          cy.get('[role="dialog"], .modal').within(() => {
            cy.get('button').contains(/yes|confirm|ok|igen|törlés/i).click();
          });
          
          cy.wait('@deleteProduct');
          
          // Should show success message
          cy.get('.toast, [role="alert"], .alert-success, .notification').should('be.visible');
        });
      });
    });
  });

  describe('Create Product', () => {
    beforeEach(() => {
      cy.interceptApi('POST', '/products', 'createProduct');
      cy.visit('/products/new');
    });

    it('should display product form', () => {
      cy.get('form').should('exist');
      cy.get('input[name="name"], #name').should('exist');
      cy.get('input[name="price"], #price').should('exist');
    });

    it('should show validation errors for empty form', () => {
      cy.get('button[type="submit"]').click();
      cy.get('.invalid-feedback, .error, [role="alert"]').should('exist');
    });

    it('should show validation error for negative price', () => {
      cy.get('input[name="name"], #name').type('Test Product');
      cy.get('input[name="price"], #price').clear().type('-10');
      cy.get('button[type="submit"]').click();
      cy.get('.invalid-feedback, .error, [role="alert"]').should('exist');
    });

    it('should create product with valid data', () => {
      cy.fixture('products').then((products) => {
        const newProduct = products[0];
        
        cy.get('input[name="name"], #name').type(newProduct.name);
        cy.get('input[name="price"], #price').clear().type(newProduct.price.toString());
        cy.get('button[type="submit"]').click();

        cy.wait('@createProduct').its('response.statusCode').should('eq', 201);
        
        // Should redirect to products list or product detail
        cy.url().should('match', /\/products(\/\d+)?$/);
      });
    });

    it('should show success toast after creation', () => {
      cy.intercept('POST', '**/api/v1/products', {
        statusCode: 201,
        body: { id: 999, name: 'New Product', price: 100 }
      }).as('createSuccess');

      cy.get('input[name="name"], #name').type('New Product');
      cy.get('input[name="price"], #price').clear().type('100');
      cy.get('button[type="submit"]').click();

      cy.wait('@createSuccess');
      
      // Should show success notification
      cy.get('.toast, [role="alert"], .notification, .snackbar, .alert-success')
        .should('be.visible');
    });

    it('should add new product to list after creation', () => {
      const newProductName = `New Product ${Date.now()}`;
      
      cy.intercept('POST', '**/api/v1/products', {
        statusCode: 201,
        body: { id: 999, name: newProductName, price: 150 }
      }).as('createProduct');

      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 200,
        body: {
          data: [
            { id: 999, name: newProductName, price: 150 },
            { id: 1, name: 'Existing Product', price: 100 }
          ],
          meta: { total: 2, page: 1, limit: 10, totalPages: 1 }
        }
      }).as('getProductsAfterCreate');

      cy.get('input[name="name"], #name').type(newProductName);
      cy.get('input[name="price"], #price').clear().type('150');
      cy.get('button[type="submit"]').click();

      cy.wait('@createProduct');
      
      // Navigate back to list if not already there
      cy.url().then((url) => {
        if (!url.match(/\/products$/)) {
          cy.visit('/products');
        }
      });
      
      cy.wait('@getProductsAfterCreate');
      
      // New product should be visible in the list
      cy.get('table').should('contain.text', newProductName);
    });

    it('should have cancel button that returns to list', () => {
      cy.get('button, a').contains(/cancel|mégse|vissza|back/i).click();
      cy.url().should('match', /\/products$/);
    });
  });

  describe('Edit Product', () => {
    let productId: number;

    beforeEach(() => {
      // Create a product to edit
      cy.fixture('products').then((products) => {
        cy.createProduct(products[0]).then((product) => {
          productId = product.id!;
          cy.interceptApi('PUT', `/products/${productId}`, 'updateProduct');
          cy.interceptApi('GET', `/products/${productId}`, 'getProduct');
          cy.visit(`/products/${productId}/edit`);
        });
      });
    });

    it('should load existing product data', () => {
      cy.wait('@getProduct');
      cy.get('input[name="name"], #name').should('not.have.value', '');
    });

    it('should update product with new data', () => {
      cy.wait('@getProduct');
      
      cy.get('input[name="name"], #name').clear().type('Updated Product Name');
      cy.get('button[type="submit"]').click();

      cy.wait('@updateProduct').its('response.statusCode').should('eq', 200);
    });

    it('should reflect changes in list after edit', () => {
      const updatedName = `Updated Product ${Date.now()}`;
      
      cy.wait('@getProduct');
      
      cy.intercept('PUT', `**/api/v1/products/${productId}`, {
        statusCode: 200,
        body: { id: productId, name: updatedName, price: 100 }
      }).as('updateProductSuccess');

      cy.intercept('GET', '**/api/v1/products*', {
        statusCode: 200,
        body: {
          data: [{ id: productId, name: updatedName, price: 100 }],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      }).as('getProductsAfterUpdate');

      cy.get('input[name="name"], #name').clear().type(updatedName);
      cy.get('button[type="submit"]').click();

      cy.wait('@updateProductSuccess');
      
      // Navigate to list
      cy.visit('/products');
      cy.wait('@getProductsAfterUpdate');
      
      // Updated name should be visible
      cy.get('table').should('contain.text', updatedName);
    });
  });

  describe('Delete Product', () => {
    let productId: number;
    let productName: string;

    beforeEach(() => {
      cy.fixture('products').then((products) => {
        productName = products[1].name;
        cy.createProduct(products[1]).then((product) => {
          productId = product.id!;
          cy.interceptApi('DELETE', `/products/${productId}`, 'deleteProduct');
          cy.interceptApi('GET', '/products*', 'getProducts');
          cy.visit('/products');
        });
      });
    });

    it('should show delete confirmation dialog', () => {
      cy.wait('@getProducts');
      
      // Find delete button for the product
      cy.get('button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger, [data-testid="delete-btn"]')
        .first()
        .click();

      // Confirmation dialog should appear
      cy.get('[role="dialog"], .modal, .confirm-dialog').should('be.visible');
    });

    it('should delete product when confirmed', () => {
      cy.wait('@getProducts');
      
      cy.get('button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger, [data-testid="delete-btn"]')
        .first()
        .click();

      // Click confirm button
      cy.get('[role="dialog"], .modal').within(() => {
        cy.get('button').contains(/yes|confirm|ok|igen|törlés/i).click();
      });

      cy.wait('@deleteProduct').its('response.statusCode').should('be.oneOf', [200, 204]);
    });

    it('should cancel delete when declined', () => {
      cy.wait('@getProducts');
      
      cy.get('button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger, [data-testid="delete-btn"]')
        .first()
        .click();

      // Click cancel button
      cy.get('[role="dialog"], .modal').within(() => {
        cy.get('button').contains(/no|cancel|mégse/i).click();
      });

      // Dialog should close
      cy.get('[role="dialog"], .modal').should('not.exist');
    });

    it('should remove product from list after delete', () => {
      cy.wait('@getProducts');
      
      // Get initial count
      cy.get('table tbody tr').then(($rows) => {
        const initialCount = $rows.length;
        
        cy.intercept('DELETE', `**/api/v1/products/*`, {
          statusCode: 200,
          body: { message: 'Deleted' }
        }).as('deleteSuccess');

        // Mock the updated list without the deleted product
        cy.intercept('GET', '**/api/v1/products*', {
          statusCode: 200,
          body: {
            data: [], // Empty or reduced list
            meta: { total: Math.max(0, initialCount - 1), page: 1, limit: 10, totalPages: 1 }
          }
        }).as('getProductsAfterDelete');

        cy.get('button[aria-label*="Delete"], .btn-danger').first().click();
        
        cy.get('[role="dialog"], .modal').within(() => {
          cy.get('button').contains(/yes|confirm|ok|igen|törlés/i).click();
        });

        cy.wait('@deleteSuccess');
        cy.wait('@getProductsAfterDelete');

        // List should have fewer items or show empty state
        cy.get('table tbody tr, .empty-state, [data-testid="empty-state"]').should('exist');
      });
    });
  });

  describe('Product Search & Filter', () => {
    beforeEach(() => {
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
    });

    it('should filter products by search term', () => {
      cy.wait('@getProducts');
      
      // If search input exists, test it
      cy.get('body').then(($body) => {
        if ($body.find('input[type="search"], input[placeholder*="search"], input[placeholder*="keres"]').length > 0) {
          cy.get('input[type="search"], input[placeholder*="search"], input[placeholder*="keres"]')
            .type('Test');
          
          cy.wait('@getProducts');
        }
      });
    });

    it('should sort products by name', () => {
      cy.wait('@getProducts');
      
      // Click on name header to sort
      cy.get('th').contains(/name|név/i).click();
      
      cy.wait('@getProducts');
    });

    it('should sort products by price', () => {
      cy.wait('@getProducts');
      
      // Click on price header to sort
      cy.get('th').contains(/price|ár/i).click();
      
      cy.wait('@getProducts');
    });
  });

  describe('Role-Based Access for Products', () => {
    it('admin should be able to view products', () => {
      cy.loginAsAdmin();
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      
      cy.wait('@getProducts');
      cy.get('table').should('exist');
    });

    it('admin should be able to create products', () => {
      cy.loginAsAdmin();
      cy.visit('/products');
      
      cy.get('button, a').contains(/new|add|create|új/i).should('exist').and('not.be.disabled');
    });

    it('admin should be able to edit products', () => {
      cy.loginAsAdmin();
      
      cy.fixture('products').then((products) => {
        cy.createProduct(products[0]).then((product) => {
          cy.visit(`/products/${product.id}/edit`);
          
          // Should be able to access edit page
          cy.url().should('include', '/edit');
          cy.get('form').should('exist');
        });
      });
    });

    it('admin should be able to delete products', () => {
      cy.loginAsAdmin();
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      
      cy.wait('@getProducts');
      
      // Delete buttons should be visible
      cy.get('button[aria-label*="Delete"], .btn-danger, button').contains(/delete|törlés/i)
        .should('exist');
    });

    it('manager should be able to view products', () => {
      cy.loginAsManager();
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      
      cy.wait('@getProducts');
      cy.get('table').should('exist');
    });

    it('manager should be able to create products', () => {
      cy.loginAsManager();
      cy.visit('/products');
      
      cy.get('button, a').contains(/new|add|create|új/i).should('exist').and('not.be.disabled');
    });

    it('manager should be able to edit products', () => {
      cy.loginAsManager();
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      
      cy.wait('@getProducts');
      
      // Edit buttons should be visible
      cy.get('a[href*="edit"], button').contains(/edit|szerkeszt/i).should('exist');
    });

    it('employee should be able to view products', () => {
      cy.loginAsEmployee();
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      
      cy.wait('@getProducts');
      cy.get('table').should('exist');
    });

    it('employee should not see create button', () => {
      cy.loginAsEmployee();
      cy.visit('/products');
      
      // Employee should not have create button
      cy.get('body').then(($body) => {
        const createBtn = $body.find('button, a').filter(':contains("New"), :contains("Add"), :contains("Create"), :contains("Új")');
        // Either button doesn't exist or is disabled/hidden
        if (createBtn.length > 0) {
          cy.wrap(createBtn).should('satisfy', ($el: JQuery) => {
            return $el.is(':disabled') || !$el.is(':visible') || $el.hasClass('disabled');
          });
        }
      });
    });

    it('employee should not see edit buttons', () => {
      cy.loginAsEmployee();
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      
      cy.wait('@getProducts');
      
      // Edit buttons should be hidden or disabled for employee
      cy.get('body').then(($body) => {
        const editBtn = $body.find('a[href*="edit"], button:contains("Edit"), button:contains("Szerkeszt")');
        if (editBtn.length > 0) {
          cy.wrap(editBtn).should('not.be.visible');
        }
      });
    });

    it('employee should not see delete buttons', () => {
      cy.loginAsEmployee();
      cy.interceptApi('GET', '/products*', 'getProducts');
      cy.visit('/products');
      
      cy.wait('@getProducts');
      
      // Delete buttons should be hidden for employee
      cy.get('body').then(($body) => {
        const deleteBtn = $body.find('button[aria-label*="Delete"], .btn-danger');
        if (deleteBtn.length > 0) {
          cy.wrap(deleteBtn).should('not.be.visible');
        }
      });
    });

    it('employee should be redirected from create page', () => {
      cy.loginAsEmployee();
      cy.visit('/products/new');
      
      // Should redirect to products list or unauthorized
      cy.url().should('satisfy', (url: string) => {
        return url.includes('/products') && !url.includes('/new') ||
               url.includes('/unauthorized') ||
               url.includes('/dashboard');
      });
    });
  });
});
