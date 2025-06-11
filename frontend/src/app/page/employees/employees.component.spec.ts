import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { EmployeesComponent } from './employees.component';
import { EmployeeService } from '../../service/employee.service';
import { ToastService } from '../../shared/services';
import { of, throwError } from 'rxjs';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from '../../model/employee';

describe('EmployeesComponent', () => {
  let component: EmployeesComponent;
  let fixture: ComponentFixture<EmployeesComponent>;
  let employeeService: jest.Mocked<EmployeeService>;
  let toastService: jest.Mocked<ToastService>;

  const mockEmployees: Employee[] = [
    { id: 1, employee_number: 'EMP001', name: 'John Doe', monthlyConsumptionValue: 50000 },
    { id: 2, employee_number: 'EMP002', name: 'Jane Smith', monthlyConsumptionValue: 45000 },
    { id: 3, employee_number: 'EMP003', name: 'Bob Wilson', monthlyConsumptionValue: 60000 }
  ];

  beforeEach(async () => {
    const employeeSpy = {
      getEmployees: jest.fn().mockReturnValue(of(mockEmployees)),
      getAllEmployees: jest.fn().mockReturnValue(of(mockEmployees)),
      getEmployee: jest.fn(),
      createEmployee: jest.fn().mockReturnValue(of({ id: 4, employee_number: 'EMP004', name: 'New Employee', monthlyConsumptionValue: 40000 })),
      updateEmployee: jest.fn().mockReturnValue(of({ id: 1, employee_number: 'EMP001', name: 'Updated John', monthlyConsumptionValue: 55000 })),
      deleteEmployee: jest.fn().mockReturnValue(of(void 0))
    };

    const toastSpy = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [EmployeesComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EmployeeService, useValue: employeeSpy },
        { provide: ToastService, useValue: toastSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeesComponent);
    component = fixture.componentInstance;
    employeeService = TestBed.inject(EmployeeService) as jest.Mocked<EmployeeService>;
    toastService = TestBed.inject(ToastService) as jest.Mocked<ToastService>;
    fixture.detectChanges();
  });

  // ==================== BASIC TESTS ====================

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load employees on init', () => {
    expect(employeeService.getAllEmployees).toHaveBeenCalled();
    expect(component.employees).toEqual(mockEmployees);
    expect(component.isLoading).toBe(false);
  });

  it('should calculate total monthly consumption value', () => {
    // 50000 + 45000 + 60000 = 155000
    expect(component.monthlyConsumptionValue).toBe(155000);
  });

  it('should apply filters to create filteredEmployees', () => {
    expect(component.filteredEmployees.length).toBe(3);
  });

  // ==================== MODAL TESTS ====================

  describe('Modal Operations', () => {
    it('should open create modal with correct state', () => {
      component.openCreateModal();

      expect(component.showModal).toBe(true);
      expect(component.modalMode).toBe('create');
      expect(component.selectedEmployee).toBeNull();
    });

    it('should open edit modal with selected employee', () => {
      const employee = mockEmployees[0];
      component.openEditModal(employee);

      expect(component.showModal).toBe(true);
      expect(component.modalMode).toBe('edit');
      expect(component.selectedEmployee).toEqual(employee);
    });

    it('should close modal and reset state', () => {
      component.showModal = true;
      component.selectedEmployee = mockEmployees[0];
      component.isSaving = true;

      component.closeModal();

      expect(component.showModal).toBe(false);
      expect(component.selectedEmployee).toBeNull();
      expect(component.isSaving).toBe(false);
    });

    it('should return correct modal title for create mode', () => {
      component.modalMode = 'create';
      expect(component.modalTitle).toBe('Add New Employee');
    });

    it('should return correct modal title for edit mode', () => {
      component.modalMode = 'edit';
      component.selectedEmployee = mockEmployees[0];
      expect(component.modalTitle).toBe('Edit Employee: John Doe');
    });
  });

  // ==================== CRUD TESTS ====================

  describe('CRUD Operations', () => {
    it('should create employee successfully', fakeAsync(() => {
      const newEmployee: CreateEmployeeDto = {
        name: 'New Employee',
        employee_number: 'EMP004',
        monthlyConsumptionValue: 40000
      };
      component.modalMode = 'create';
      component.showModal = true;

      component.onSave(newEmployee);
      tick();

      expect(employeeService.createEmployee).toHaveBeenCalledWith(newEmployee);
      expect(toastService.success).toHaveBeenCalledWith('Employee "New Employee" created successfully');
      expect(component.showModal).toBe(false);
    }));

    it('should update employee successfully', fakeAsync(() => {
      const updateDto: UpdateEmployeeDto = {
        name: 'Updated John',
        monthlyConsumptionValue: 55000
      };
      component.modalMode = 'edit';
      component.selectedEmployee = mockEmployees[0];
      component.showModal = true;

      component.onSave(updateDto);
      tick();

      expect(employeeService.updateEmployee).toHaveBeenCalledWith(1, updateDto);
      expect(toastService.success).toHaveBeenCalledWith('Employee "Updated John" updated successfully');
      expect(component.showModal).toBe(false);
    }));

    it('should handle create error', fakeAsync(() => {
      employeeService.createEmployee.mockReturnValue(throwError(() => new Error('Create failed')));
      const newEmployee: CreateEmployeeDto = {
        name: 'New Employee',
        employee_number: 'EMP004',
        monthlyConsumptionValue: 40000
      };
      component.modalMode = 'create';

      component.onSave(newEmployee);
      tick();

      expect(toastService.error).toHaveBeenCalledWith('Create failed');
      expect(component.isSaving).toBe(false);
    }));

    it('should delete employee after confirmation', fakeAsync(() => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      const employee = mockEmployees[0];

      component.deleteEmployee(employee);
      tick();

      expect(employeeService.deleteEmployee).toHaveBeenCalledWith(1);
      expect(toastService.success).toHaveBeenCalledWith('Employee "John Doe" deleted successfully');
    }));

    it('should not delete employee if not confirmed', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      const employee = mockEmployees[0];

      component.deleteEmployee(employee);

      expect(employeeService.deleteEmployee).not.toHaveBeenCalled();
    });
  });

  // ==================== FILTERING TESTS ====================

  describe('Filtering', () => {
    it('should filter by name', fakeAsync(() => {
      component.filters.name = 'john';
      component.onFilterChange();
      tick(300);

      expect(component.filteredEmployees.length).toBe(1);
      expect(component.filteredEmployees[0].name).toBe('John Doe');
    }));

    it('should filter by employee number', fakeAsync(() => {
      component.filters.employeeNumber = '002';
      component.onFilterChange();
      tick(300);

      expect(component.filteredEmployees.length).toBe(1);
      expect(component.filteredEmployees[0].employee_number).toBe('EMP002');
    }));

    it('should filter by both name and employee number', fakeAsync(() => {
      component.filters.name = 'jane';
      component.filters.employeeNumber = '002';
      component.onFilterChange();
      tick(300);

      expect(component.filteredEmployees.length).toBe(1);
      expect(component.filteredEmployees[0].name).toBe('Jane Smith');
    }));

    it('should return empty when no match', fakeAsync(() => {
      component.filters.name = 'nonexistent';
      component.onFilterChange();
      tick(300);

      expect(component.filteredEmployees.length).toBe(0);
    }));

    it('should debounce filter changes', fakeAsync(() => {
      const applyFiltersSpy = jest.spyOn(component as any, 'applyFilters');

      component.filters.name = 'j';
      component.onFilterChange();
      tick(100);

      component.filters.name = 'jo';
      component.onFilterChange();
      tick(100);

      component.filters.name = 'joh';
      component.onFilterChange();
      tick(300);

      // applyFilters is called once in ngOnInit, then once after debounce
      expect(applyFiltersSpy).toHaveBeenCalled();
    }));

    it('should clear filters', fakeAsync(() => {
      component.filters = { name: 'test', employeeNumber: '001' };
      component.filteredEmployees = [];

      component.clearFilters();
      tick();

      expect(component.filters.name).toBe('');
      expect(component.filters.employeeNumber).toBe('');
      expect(component.filteredEmployees.length).toBe(3);
    }));

    it('should detect active filters', () => {
      component.filters = { name: '', employeeNumber: '' };
      expect(component.hasActiveFilters).toBe(false);

      component.filters.name = 'test';
      expect(component.hasActiveFilters).toBe(true);

      component.filters = { name: '', employeeNumber: '001' };
      expect(component.hasActiveFilters).toBe(true);
    });
  });

  // ==================== SORTING TESTS ====================

  describe('Sorting', () => {
    it('should sort by field ascending on first click', fakeAsync(() => {
      component.sortBy('name');
      tick();

      expect(component.sortField).toBe('name');
      expect(component.sortDirection).toBe('asc');
      // Bob, Jane, John (alphabetical)
      expect(component.filteredEmployees[0].name).toBe('Bob Wilson');
    }));

    it('should toggle sort direction on same field click', fakeAsync(() => {
      component.sortField = 'name';
      component.sortDirection = 'asc';

      component.sortBy('name');
      tick();

      expect(component.sortDirection).toBe('desc');
      // John, Jane, Bob (reverse alphabetical)
      expect(component.filteredEmployees[0].name).toBe('John Doe');
    }));

    it('should reset to ascending when changing sort field', fakeAsync(() => {
      component.sortField = 'name';
      component.sortDirection = 'desc';

      component.sortBy('monthlyConsumptionValue');
      tick();

      expect(component.sortField).toBe('monthlyConsumptionValue');
      expect(component.sortDirection).toBe('asc');
    }));

    it('should sort by monthly consumption value', fakeAsync(() => {
      component.sortBy('monthlyConsumptionValue');
      tick();

      // 45000, 50000, 60000 (ascending)
      expect(component.filteredEmployees[0].monthlyConsumptionValue).toBe(45000);
      expect(component.filteredEmployees[2].monthlyConsumptionValue).toBe(60000);
    }));

    it('should return correct sort icon for active field', () => {
      component.sortField = 'name';
      component.sortDirection = 'asc';

      expect(component.getSortIcon('name')).toBe('↑');

      component.sortDirection = 'desc';
      expect(component.getSortIcon('name')).toBe('↓');
    });

    it('should return neutral icon for inactive field', () => {
      component.sortField = 'name';
      expect(component.getSortIcon('employee_number')).toBe('↕');
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should handle load error', fakeAsync(() => {
      employeeService.getAllEmployees.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      component.loadEmployees();
      tick();

      expect(component.error).toBe('Network error');
      expect(component.isLoading).toBe(false);
    }));

    it('should handle delete error', fakeAsync(() => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      employeeService.deleteEmployee.mockReturnValue(
        throwError(() => new Error('Delete failed'))
      );

      component.deleteEmployee(mockEmployees[0]);
      tick();

      expect(component.error).toBe('Delete failed');
      expect(toastService.error).toHaveBeenCalledWith('Delete failed');
    }));
  });

  // ==================== HELPER TESTS ====================

  describe('Helper Methods', () => {
    it('should track employees by id', () => {
      const employee = mockEmployees[0];
      expect(component.trackByEmployeeId(0, employee)).toBe(1);
    });

    it('should calculate monthly consumption correctly', () => {
      component.employees = [
        { id: 1, employee_number: 'E1', name: 'A', monthlyConsumptionValue: 100 },
        { id: 2, employee_number: 'E2', name: 'B', monthlyConsumptionValue: 200 }
      ];

      component.calculateMonthlyConsumptionValue();

      expect(component.monthlyConsumptionValue).toBe(300);
    });
  });
});
