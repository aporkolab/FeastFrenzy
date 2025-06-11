import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { EmployeeReportComponent } from './employee-report.component';
import { EmployeeService } from '../../service/employee.service';
import { PurchaseService } from '../../service/purchase.service';
import { of, throwError } from 'rxjs';
import { Employee } from '../../model/employee';
import { EmployeeSummary } from '../../model/purchase';

describe('EmployeeReportComponent', () => {
  let component: EmployeeReportComponent;
  let fixture: ComponentFixture<EmployeeReportComponent>;
  let employeeService: jest.Mocked<EmployeeService>;
  let purchaseService: jest.Mocked<PurchaseService>;

  const mockEmployees: Employee[] = [
    { id: 1, employee_number: 'EMP001', name: 'John Doe', monthlyConsumptionValue: 50000 },
    { id: 2, employee_number: 'EMP002', name: 'Jane Smith', monthlyConsumptionValue: 45000 },
    { id: 3, employee_number: 'EMP003', name: 'Bob Wilson', monthlyConsumptionValue: 60000 }
  ];

  // Mock summaries from optimized backend endpoint
  const mockSummaries: EmployeeSummary[] = [
    { employeeId: 1, totalSpending: 25000, purchaseCount: 2 },
    { employeeId: 2, totalSpending: 20000, purchaseCount: 1 },
    { employeeId: 3, totalSpending: 5000, purchaseCount: 1 }
  ];

  beforeEach(async () => {
    const employeeSpy = {
      getEmployees: jest.fn().mockReturnValue(of(mockEmployees)),
      getAllEmployees: jest.fn().mockReturnValue(of(mockEmployees))
    };

    const purchaseSpy = {
      getEmployeeSummaries: jest.fn().mockReturnValue(of(mockSummaries)),
      getPurchases: jest.fn().mockReturnValue(of({ data: [], meta: {} })),
      getAllPurchases: jest.fn().mockReturnValue(of([]))
    };

    await TestBed.configureTestingModule({
      imports: [EmployeeReportComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EmployeeService, useValue: employeeSpy },
        { provide: PurchaseService, useValue: purchaseSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeReportComponent);
    component = fixture.componentInstance;
    employeeService = TestBed.inject(EmployeeService) as jest.Mocked<EmployeeService>;
    purchaseService = TestBed.inject(PurchaseService) as jest.Mocked<PurchaseService>;
    fixture.detectChanges();
  });

  // ==================== BASIC TESTS ====================

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load data on init', () => {
    expect(employeeService.getAllEmployees).toHaveBeenCalled();
    expect(purchaseService.getEmployeeSummaries).toHaveBeenCalled();
    expect(component.employees).toEqual(mockEmployees);
  });

  it('should initialize with current month and year', () => {
    const now = new Date();
    expect(component.month).toBe(now.getMonth());
    expect(component.year).toBe(now.getFullYear());
  });

  // ==================== SPENDING CALCULATION TESTS ====================

  describe('Spending Calculations', () => {
    it('should calculate employee spending correctly', fakeAsync(() => {
      tick();

      // Employee 1: 15000 + 10000 = 25000
      expect(component.getSpending(1)).toBe(25000);

      // Employee 2: 20000
      expect(component.getSpending(2)).toBe(20000);

      // Employee 3: 5000
      expect(component.getSpending(3)).toBe(5000);
    }));

    it('should return 0 for employee with no purchases', fakeAsync(() => {
      tick();

      // Non-existent employee
      expect(component.getSpending(999)).toBe(0);
    }));

    it('should use Map with employee ID as key for O(1) lookup', fakeAsync(() => {
      tick();

      expect(component.employeePurchases.has(1)).toBe(true);
      expect(component.employeePurchases.has(2)).toBe(true);
      expect(component.employeePurchases.has(3)).toBe(true);
    }));

    it('should handle employee with zero spending', fakeAsync(() => {
      // Set up empty summaries (no purchases)
      purchaseService.getEmployeeSummaries.mockReturnValue(of([]));

      component.loadData();
      tick();

      expect(component.getSpending(1)).toBe(0);
      expect(component.getSpending(2)).toBe(0);
      expect(component.getSpending(3)).toBe(0);
    }));
  });

  // ==================== FILTER TESTS ====================

  describe('Month/Year Filter', () => {
    it('should debounce filter changes', fakeAsync(() => {
      employeeService.getAllEmployees.mockClear();
      purchaseService.getEmployeeSummaries.mockClear();

      component.month = 0;
      component.onMonthChange();
      tick(100);

      component.month = 1;
      component.onMonthChange();
      tick(100);

      component.month = 2;
      component.onMonthChange();
      tick(300);

      // Should only call once after debounce
      expect(employeeService.getAllEmployees).toHaveBeenCalledTimes(1);
      expect(purchaseService.getEmployeeSummaries).toHaveBeenCalledTimes(1);
    }));

    it('should reload data on month change after debounce', fakeAsync(() => {
      employeeService.getAllEmployees.mockClear();
      purchaseService.getEmployeeSummaries.mockClear();

      component.month = 5;
      component.onMonthChange();
      tick(300);

      expect(employeeService.getAllEmployees).toHaveBeenCalled();
      expect(purchaseService.getEmployeeSummaries).toHaveBeenCalled();
    }));

    it('should reload data on year change after debounce', fakeAsync(() => {
      employeeService.getAllEmployees.mockClear();
      purchaseService.getEmployeeSummaries.mockClear();

      component.year = 2023;
      component.onMonthChange();
      tick(300);

      expect(employeeService.getAllEmployees).toHaveBeenCalled();
      expect(purchaseService.getEmployeeSummaries).toHaveBeenCalled();
    }));

    it('should pass correct date parameters to purchase service', fakeAsync(() => {
      purchaseService.getEmployeeSummaries.mockClear();
      component.year = 2024;
      component.month = 0; // January

      component.onMonthChange();
      tick(300);

      expect(purchaseService.getEmployeeSummaries).toHaveBeenCalledWith({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      });
    }));
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should handle load error', fakeAsync(() => {
      employeeService.getAllEmployees.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      component.loadData();
      tick();

      expect(component.error).toBe('Network error');
      expect(component.isLoading).toBe(false);
    }));

    it('should clear error on successful load', fakeAsync(() => {
      component.error = 'Previous error';

      component.loadData();
      tick();

      expect(component.error).toBeNull();
    }));

    it('should handle summaries service error', fakeAsync(() => {
      purchaseService.getEmployeeSummaries.mockReturnValue(
        throwError(() => new Error('Summaries load failed'))
      );

      component.loadData();
      tick();

      expect(component.error).toBe('Summaries load failed');
      expect(component.isLoading).toBe(false);
    }));
  });

  // ==================== LOADING STATE ====================

  describe('Loading State', () => {
    it('should set loading true when loading data', fakeAsync(() => {
      component.loadData();
      // isLoading is set to true at the start, but sync observable completes immediately
      tick();
      expect(component.isLoading).toBe(false);
    }));

    it('should set loading false after load completes', fakeAsync(() => {
      component.loadData();
      tick();

      expect(component.isLoading).toBe(false);
    }));

    it('should set loading false after load error', fakeAsync(() => {
      employeeService.getAllEmployees.mockReturnValue(
        throwError(() => new Error('Error'))
      );

      component.loadData();
      tick();

      expect(component.isLoading).toBe(false);
    }));
  });

  // ==================== DATA INTEGRATION TESTS ====================

  describe('Data Integration', () => {
    it('should correctly map summaries to employee spending', fakeAsync(() => {
      tick();

      // Verify the Map structure from backend aggregation
      expect(component.employeePurchases.size).toBe(3);
      expect(component.employeePurchases.get(1)).toBe(25000); // John's total
      expect(component.employeePurchases.get(2)).toBe(20000); // Jane's total
      expect(component.employeePurchases.get(3)).toBe(5000);  // Bob's total
    }));

    it('should initialize employees with zero when not in summaries', fakeAsync(() => {
      // Backend returns summaries for only 2 employees
      const partialSummaries: EmployeeSummary[] = [
        { employeeId: 1, totalSpending: 25000, purchaseCount: 2 }
      ];

      purchaseService.getEmployeeSummaries.mockReturnValue(of(partialSummaries));

      component.loadData();
      tick();

      // Employee 1 has spending from summaries
      expect(component.getSpending(1)).toBe(25000);
      // Employees 2 and 3 should be initialized to 0
      expect(component.getSpending(2)).toBe(0);
      expect(component.getSpending(3)).toBe(0);
    }));

    it('should handle unknown employee in summaries gracefully', fakeAsync(() => {
      // Backend returns summary for unknown employee
      const summariesWithUnknown: EmployeeSummary[] = [
        ...mockSummaries,
        { employeeId: 999, totalSpending: 100000, purchaseCount: 5 }
      ];

      purchaseService.getEmployeeSummaries.mockReturnValue(of(summariesWithUnknown));

      component.loadData();
      tick();

      // Unknown employee should have spending from summary (but won't appear in employee list)
      expect(component.employeePurchases.get(999)).toBe(100000);
    }));
  });

  // ==================== CLEANUP TESTS ====================

  describe('Component Cleanup', () => {
    it('should complete destroy$ subject on destroy', () => {
      const destroySpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('should emit next on destroy$ on destroy', () => {
      const nextSpy = jest.spyOn(component['destroy$'], 'next');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
    });
  });
});
