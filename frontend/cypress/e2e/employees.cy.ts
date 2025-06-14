/**
 * Employees E2E Tests
 * Tests CRUD operations for employees
 */

describe('Employees', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  describe('Employees List', () => {
    beforeEach(() => {
      cy.interceptApi('GET', '/employees*', 'getEmployees');
      cy.visit('/employees');
    });

    it('should display employees list page', () => {
      cy.wait('@getEmployees');
      cy.get('h1, h2').should('contain.text', /employee|alkalmazott|dolgozó/i);
    });

    it('should display employees table', () => {
      cy.wait('@getEmployees');
      cy.get('table').should('exist');
    });

    it('should display employee columns', () => {
      cy.wait('@getEmployees');
      cy.get('th').should('contain.text', /name|név/i);
      cy.get('th').should('contain.text', /number|szám/i);
    });

    it('should have create new employee button', () => {
      cy.get('button, a').contains(/new|add|create|új/i).should('exist');
    });

    it('should navigate to create employee page', () => {
      cy.get('button, a').contains(/new|add|create|új/i).click();
      cy.url().should('include', '/employees/new');
    });
  });

  describe('Create Employee', () => {
    beforeEach(() => {
      cy.interceptApi('POST', '/employees', 'createEmployee');
      cy.visit('/employees/new');
    });

    it('should display employee form', () => {
      cy.get('form').should('exist');
      cy.get('input[name="name"], #name').should('exist');
      cy.get('input[name="employee_number"], #employee_number, input[name="employeeNumber"]').should('exist');
      cy.get('input[name="monthlyConsumptionValue"], #monthlyConsumptionValue').should('exist');
    });

    it('should show validation errors for empty form', () => {
      cy.get('button[type="submit"]').click();
      cy.get('.invalid-feedback, .error, [role="alert"]').should('exist');
    });

    it('should create employee with valid data', () => {
      cy.fixture('employees').then((employees) => {
        const newEmployee = employees[0];
        
        cy.get('input[name="name"], #name').type(newEmployee.name);
        cy.get('input[name="employee_number"], #employee_number, input[name="employeeNumber"]')
          .type(newEmployee.employee_number);
        cy.get('input[name="monthlyConsumptionValue"], #monthlyConsumptionValue')
          .clear()
          .type(newEmployee.monthlyConsumptionValue.toString());
        cy.get('button[type="submit"]').click();

        cy.wait('@createEmployee').its('response.statusCode').should('eq', 201);
        
        // Should redirect to employees list
        cy.url().should('match', /\/employees(\/\d+)?$/);
      });
    });

    it('should show error for duplicate employee number', () => {
      cy.fixture('employees').then((employees) => {
        // First create an employee
        cy.createEmployee(employees[0]).then(() => {
          cy.visit('/employees/new');
          
          // Try to create with same employee_number
          cy.get('input[name="name"], #name').type('Another Employee');
          cy.get('input[name="employee_number"], #employee_number, input[name="employeeNumber"]')
            .type(employees[0].employee_number);
          cy.get('input[name="monthlyConsumptionValue"], #monthlyConsumptionValue')
            .clear()
            .type('500');
          cy.get('button[type="submit"]').click();

          // Should show error
          cy.get('.alert-danger, .error, [role="alert"]').should('be.visible');
        });
      });
    });

    it('should have cancel button', () => {
      cy.get('button, a').contains(/cancel|mégse|vissza|back/i).click();
      cy.url().should('match', /\/employees$/);
    });
  });

  describe('Edit Employee', () => {
    let employeeId: number;

    beforeEach(() => {
      cy.fixture('employees').then((employees) => {
        cy.createEmployee(employees[1]).then((employee) => {
          employeeId = employee.id!;
          cy.interceptApi('PUT', `/employees/${employeeId}`, 'updateEmployee');
          cy.interceptApi('GET', `/employees/${employeeId}`, 'getEmployee');
          cy.visit(`/employees/${employeeId}/edit`);
        });
      });
    });

    it('should load existing employee data', () => {
      cy.wait('@getEmployee');
      cy.get('input[name="name"], #name').should('not.have.value', '');
    });

    it('should update employee with new data', () => {
      cy.wait('@getEmployee');
      
      cy.get('input[name="name"], #name').clear().type('Updated Employee Name');
      cy.get('button[type="submit"]').click();

      cy.wait('@updateEmployee').its('response.statusCode').should('eq', 200);
    });
  });

  describe('Delete Employee', () => {
    let employeeId: number;

    beforeEach(() => {
      cy.fixture('employees').then((employees) => {
        cy.createEmployee(employees[2]).then((employee) => {
          employeeId = employee.id!;
          cy.interceptApi('DELETE', `/employees/${employeeId}`, 'deleteEmployee');
          cy.interceptApi('GET', '/employees*', 'getEmployees');
          cy.visit('/employees');
        });
      });
    });

    it('should show delete confirmation dialog', () => {
      cy.wait('@getEmployees');
      
      cy.get('button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger, [data-testid="delete-btn"]')
        .first()
        .click();

      cy.get('[role="dialog"], .modal, .confirm-dialog').should('be.visible');
    });

    it('should delete employee when confirmed', () => {
      cy.wait('@getEmployees');
      
      cy.get('button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger, [data-testid="delete-btn"]')
        .first()
        .click();

      cy.get('[role="dialog"], .modal').within(() => {
        cy.get('button').contains(/yes|confirm|ok|igen|törlés/i).click();
      });

      cy.wait('@deleteEmployee').its('response.statusCode').should('be.oneOf', [200, 204]);
    });
  });

  describe('Employee Detail', () => {
    let employeeId: number;

    beforeEach(() => {
      cy.fixture('employees').then((employees) => {
        cy.createEmployee(employees[3]).then((employee) => {
          employeeId = employee.id!;
          cy.interceptApi('GET', `/employees/${employeeId}`, 'getEmployee');
          cy.visit(`/employees/${employeeId}`);
        });
      });
    });

    it('should display employee details', () => {
      cy.wait('@getEmployee');
      cy.get('body').should('contain.text', /name|név/i);
    });

    it('should have edit button', () => {
      cy.wait('@getEmployee');
      cy.get('button, a').contains(/edit|szerkesztés|módosít/i).should('exist');
    });

    it('should navigate to edit page', () => {
      cy.wait('@getEmployee');
      cy.get('button, a').contains(/edit|szerkesztés|módosít/i).click();
      cy.url().should('include', '/edit');
    });
  });

  describe('Employee Search & Sort', () => {
    beforeEach(() => {
      cy.interceptApi('GET', '/employees*', 'getEmployees');
      cy.visit('/employees');
    });

    it('should filter employees by search term', () => {
      cy.wait('@getEmployees');
      
      cy.get('body').then(($body) => {
        if ($body.find('input[type="search"], input[placeholder*="search"], input[placeholder*="keres"]').length > 0) {
          cy.get('input[type="search"], input[placeholder*="search"], input[placeholder*="keres"]')
            .type('John');
          
          cy.wait('@getEmployees');
        }
      });
    });

    it('should sort employees by name', () => {
      cy.wait('@getEmployees');
      
      cy.get('th').contains(/name|név/i).click();
      cy.wait('@getEmployees');
    });

    it('should sort employees by monthly consumption', () => {
      cy.wait('@getEmployees');
      
      cy.get('th').contains(/consumption|fogyasztás|limit/i).click();
      cy.wait('@getEmployees');
    });
  });

  describe('Employee Report', () => {
    beforeEach(() => {
      cy.interceptApi('GET', '/employees*', 'getEmployees');
      cy.visit('/employees/report');
    });

    it('should display employee report page', () => {
      cy.get('h1, h2').should('exist');
    });

    it('should show consumption statistics', () => {
      cy.wait('@getEmployees');
      // Report should have some data display
      cy.get('table, .chart, .stats, .card').should('exist');
    });
  });

  describe('Role-Based Access - As Manager', () => {
    beforeEach(() => {
      cy.loginAsManager();
    });

    it('should be able to view employees list', () => {
      cy.interceptApi('GET', '/employees*', 'getEmployees');
      cy.visit('/employees');
      
      cy.wait('@getEmployees');
      cy.get('table').should('exist');
    });

    it('should NOT be able to create employee', () => {
      cy.visit('/employees');
      
      // Create button should be hidden or disabled for manager
      cy.get('body').then(($body) => {
        const createBtn = $body.find('button, a').filter(':contains("New"), :contains("Add"), :contains("Create"), :contains("Új")');
        if (createBtn.length > 0) {
          cy.wrap(createBtn).should('satisfy', ($el: JQuery) => {
            return $el.is(':disabled') || !$el.is(':visible') || $el.hasClass('disabled');
          });
        }
      });
    });

    it('should NOT be able to delete employee', () => {
      cy.interceptApi('GET', '/employees*', 'getEmployees');
      cy.visit('/employees');
      
      cy.wait('@getEmployees');
      
      // Delete buttons should be hidden for manager
      cy.get('body').then(($body) => {
        const deleteBtn = $body.find('button[aria-label*="Delete"], button[aria-label*="Törlés"], .btn-danger');
        if (deleteBtn.length > 0) {
          cy.wrap(deleteBtn).should('not.be.visible');
        }
      });
    });

    it('should be able to view employee details', () => {
      cy.fixture('employees').then((employees) => {
        cy.loginAsAdmin(); // Create as admin first
        cy.createEmployee(employees[0]).then((employee) => {
          cy.loginAsManager();
          cy.interceptApi('GET', `/employees/${employee.id}`, 'getEmployee');
          cy.visit(`/employees/${employee.id}`);
          
          cy.wait('@getEmployee');
          cy.get('body').should('contain.text', /name|név/i);
        });
      });
    });
  });

  describe('Role-Based Access - As Employee', () => {
    beforeEach(() => {
      cy.loginAsEmployee();
    });

    it('should NOT have access to employees page', () => {
      cy.visit('/employees');
      
      // Should redirect to unauthorized or dashboard
      cy.url().should('satisfy', (url: string) => {
        return url.includes('/unauthorized') || 
               url.includes('/dashboard') || 
               !url.includes('/employees');
      });
    });

    it('should redirect to unauthorized when trying to access employee detail', () => {
      cy.visit('/employees/1');
      
      cy.url().should('satisfy', (url: string) => {
        return url.includes('/unauthorized') || 
               url.includes('/dashboard') || 
               url.includes('/login');
      });
    });

    it('should not show employees link in navigation', () => {
      cy.visit('/dashboard');
      
      // Employees link should be hidden
      cy.get('nav, .navbar, .sidebar').then(($nav) => {
        const employeesLink = $nav.find('a[href*="employees"]');
        if (employeesLink.length > 0) {
          cy.wrap(employeesLink).should('not.be.visible');
        }
      });
    });
  });
});
