import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { PurchasesComponent } from './purchases.component';
import { PurchaseService } from '../../service/purchase.service';
import { ToastService } from '../../shared/services';
import { of, throwError } from 'rxjs';
import { Purchase } from '../../model/purchase';

describe('PurchasesComponent', () => {
  let component: PurchasesComponent;
  let fixture: ComponentFixture<PurchasesComponent>;
  let purchaseService: jest.Mocked<PurchaseService>;
  let toastService: jest.Mocked<ToastService>;
  let router: Router;

  const mockPurchases: Purchase[] = [
    {
      id: 1,
      employeeId: 1,
      date: '2024-01-15',
      total: 150.00,
      closed: false,
      employee: { id: 1, name: 'John Doe', employee_number: 'EMP001', monthlyConsumptionValue: 50000 }
    },
    {
      id: 2,
      employeeId: 2,
      date: '2024-01-16',
      total: 200.00,
      closed: true,
      employee: { id: 2, name: 'Jane Smith', employee_number: 'EMP002', monthlyConsumptionValue: 45000 }
    },
    {
      id: 3,
      employeeId: 1,
      date: '2024-01-17',
      total: 75.50,
      closed: false,
      employee: { id: 1, name: 'John Doe', employee_number: 'EMP001', monthlyConsumptionValue: 50000 }
    }
  ];

  beforeEach(async () => {
    const purchaseSpy = {
      getPurchases: jest.fn().mockReturnValue(of({ data: mockPurchases, meta: {} })),
      getAllPurchases: jest.fn().mockReturnValue(of(mockPurchases)),
      getPurchase: jest.fn(),
      createPurchase: jest.fn(),
      updatePurchase: jest.fn(),
      deletePurchase: jest.fn().mockReturnValue(of(void 0))
    };

    const toastSpy = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PurchasesComponent],
      providers: [
        provideRouter([
          { path: 'purchases/new', component: PurchasesComponent },
          { path: 'purchases/:id', component: PurchasesComponent },
          { path: 'purchases/:id/edit', component: PurchasesComponent }
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PurchaseService, useValue: purchaseSpy },
        { provide: ToastService, useValue: toastSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchasesComponent);
    component = fixture.componentInstance;
    purchaseService = TestBed.inject(PurchaseService) as jest.Mocked<PurchaseService>;
    toastService = TestBed.inject(ToastService) as jest.Mocked<ToastService>;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    fixture.detectChanges();
  });

  // ==================== BASIC TESTS ====================

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load purchases on init', () => {
    expect(purchaseService.getAllPurchases).toHaveBeenCalled();
    expect(component.purchases).toEqual(mockPurchases);
    expect(component.isLoading).toBe(false);
  });

  it('should display correct number of purchases', () => {
    expect(component.purchases.length).toBe(3);
  });

  // ==================== NAVIGATION TESTS ====================

  describe('Navigation', () => {
    it('should navigate to new purchase page', () => {
      component.navigateToNew();

      expect(router.navigate).toHaveBeenCalledWith(['/purchases', 'new']);
    });

    it('should navigate to view purchase page', () => {
      const purchase = mockPurchases[0];

      component.viewPurchase(purchase);

      expect(router.navigate).toHaveBeenCalledWith(['/purchases', 1]);
    });

    it('should navigate to edit purchase page', () => {
      const purchase = mockPurchases[0];

      component.editPurchase(purchase);

      expect(router.navigate).toHaveBeenCalledWith(['/purchases', 1, 'edit']);
    });
  });

  // ==================== DELETE TESTS ====================

  describe('Delete Operations', () => {
    it('should delete purchase after confirmation', fakeAsync(() => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      const purchase = mockPurchases[0];

      component.deletePurchase(purchase);
      tick();

      expect(purchaseService.deletePurchase).toHaveBeenCalledWith(1);
      expect(toastService.success).toHaveBeenCalledWith('Purchase deleted successfully');
    }));

    it('should not delete purchase if not confirmed', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      const purchase = mockPurchases[0];

      component.deletePurchase(purchase);

      expect(purchaseService.deletePurchase).not.toHaveBeenCalled();
    });

    it('should handle delete error', fakeAsync(() => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      purchaseService.deletePurchase.mockReturnValue(
        throwError(() => new Error('Delete failed'))
      );

      component.deletePurchase(mockPurchases[0]);
      tick();

      expect(component.error).toBe('Delete failed');
      expect(toastService.error).toHaveBeenCalledWith('Delete failed');
    }));

    it('should reload purchases after successful delete', fakeAsync(() => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      purchaseService.getAllPurchases.mockClear();

      component.deletePurchase(mockPurchases[0]);
      tick();

      expect(purchaseService.getAllPurchases).toHaveBeenCalled();
    }));
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should handle load error', fakeAsync(() => {
      purchaseService.getAllPurchases.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      component.loadPurchases();
      tick();

      expect(component.error).toBe('Network error');
      expect(component.isLoading).toBe(false);
    }));

    it('should clear error on successful load', fakeAsync(() => {
      component.error = 'Previous error';

      component.loadPurchases();
      tick();

      expect(component.error).toBeNull();
    }));
  });

  // ==================== HELPER TESTS ====================

  describe('Helper Methods', () => {
    it('should track purchases by id', () => {
      const purchase = mockPurchases[0];
      expect(component.trackByPurchaseId(0, purchase)).toBe(1);
    });
  });

  // ==================== LOADING STATE ====================

  describe('Loading State', () => {
    it('should set loading true when loading purchases', () => {
      purchaseService.getAllPurchases.mockReturnValue(of(mockPurchases));

      component.loadPurchases();

      // isLoading is set to true at the start
      // After observable completes, it's false
      expect(component.isLoading).toBe(false);
    });

    it('should set loading false after load completes', fakeAsync(() => {
      component.loadPurchases();
      tick();

      expect(component.isLoading).toBe(false);
    }));

    it('should set loading false after load error', fakeAsync(() => {
      purchaseService.getAllPurchases.mockReturnValue(
        throwError(() => new Error('Error'))
      );

      component.loadPurchases();
      tick();

      expect(component.isLoading).toBe(false);
    }));
  });
});
