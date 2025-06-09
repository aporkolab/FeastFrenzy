import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { PurchaseFormComponent } from './purchase-form.component';
import { EmployeeService } from 'src/app/service/employee.service';
import { ProductService } from 'src/app/service/product.service';
import { Purchase } from 'src/app/model/purchase';

describe('PurchaseFormComponent', () => {
  let component: PurchaseFormComponent;
  let fixture: ComponentFixture<PurchaseFormComponent>;
  let mockEmployeeService: jest.Mocked<EmployeeService>;
  let mockProductService: jest.Mocked<ProductService>;

  const mockEmployees = [
    { id: 1, name: 'John Doe', employee_number: 'EMP001', monthlyConsumptionValue: 500 },
    { id: 2, name: 'Jane Smith', employee_number: 'EMP002', monthlyConsumptionValue: 600 }
  ];

  const mockProducts = [
    { id: 1, name: 'Product A', price: 10.00 },
    { id: 2, name: 'Product B', price: 25.50 }
  ];

  beforeEach(async () => {
    mockEmployeeService = {
      getAllEmployees: jest.fn().mockReturnValue(of(mockEmployees))
    } as any;

    mockProductService = {
      getAllProducts: jest.fn().mockReturnValue(of(mockProducts))
    } as any;

    await TestBed.configureTestingModule({
      imports: [PurchaseFormComponent, ReactiveFormsModule],
      providers: [
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: ProductService, useValue: mockProductService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values in create mode', () => {
      expect(component.form.get('employeeId')?.value).toBeNull();
      expect(component.form.get('date')?.value).toBeTruthy(); // Today's date
      expect(component.form.get('closed')?.value).toBe(false);
      expect(component.isEditMode).toBe(false);
    });

    it('should load employees on init', fakeAsync(() => {
      tick();
      expect(mockEmployeeService.getAllEmployees).toHaveBeenCalled();
      expect(component.employees.length).toBe(2);
    }));

    it('should load products on init', fakeAsync(() => {
      tick();
      expect(mockProductService.getAllProducts).toHaveBeenCalled();
      expect(component.products.length).toBe(2);
    }));

    it('should initialize with empty items array', () => {
      expect(component.itemsArray.length).toBe(0);
    });
  });

  describe('FormArray - Items Management', () => {
    it('should add item to items array', () => {
      expect(component.itemsArray.length).toBe(0);
      
      component.addItem();
      
      expect(component.itemsArray.length).toBe(1);
    });

    it('should remove item from items array', () => {
      component.addItem();
      component.addItem();
      expect(component.itemsArray.length).toBe(2);
      
      component.removeItem(0);
      
      expect(component.itemsArray.length).toBe(1);
    });

    it('should create item with default values', () => {
      component.addItem();
      
      const item = component.itemsArray.at(0);
      expect(item.get('productId')?.value).toBeNull();
      expect(item.get('quantity')?.value).toBe(1);
      expect(item.get('price')?.value).toBeNull();
    });

    it('should validate item productId as required', () => {
      component.addItem();
      const item = component.itemsArray.at(0);
      item.get('productId')?.markAsTouched();
      
      expect(item.get('productId')?.invalid).toBe(true);
      expect(component.isItemFieldInvalid(0, 'productId')).toBe(true);
    });

    it('should validate item quantity minimum', () => {
      component.addItem();
      const item = component.itemsArray.at(0);
      item.get('quantity')?.setValue(0);
      item.get('quantity')?.markAsTouched();
      
      expect(item.get('quantity')?.invalid).toBe(true);
    });
  });

  describe('Total Calculation', () => {
    it('should calculate line total correctly', () => {
      component.addItem();
      const item = component.itemsArray.at(0);
      item.patchValue({ productId: 1, quantity: 3, price: 10.00 });
      
      expect(component.getLineTotal(0)).toBe(30.00);
    });

    it('should calculate grand total correctly', () => {
      component.addItem();
      component.addItem();
      
      component.itemsArray.at(0).patchValue({ productId: 1, quantity: 2, price: 10.00 });
      component.itemsArray.at(1).patchValue({ productId: 2, quantity: 1, price: 25.50 });
      
      component.recalculateTotal();
      
      expect(component.calculatedTotal).toBe(45.50); // 20 + 25.50
    });

    it('should recalculate total when item removed', () => {
      component.addItem();
      component.addItem();
      component.itemsArray.at(0).patchValue({ productId: 1, quantity: 2, price: 10.00 });
      component.itemsArray.at(1).patchValue({ productId: 2, quantity: 1, price: 25.50 });
      component.recalculateTotal();
      
      component.removeItem(1);
      
      expect(component.calculatedTotal).toBe(20.00);
    });
  });

  describe('Product Selection', () => {
    it('should auto-fill price when product selected', fakeAsync(() => {
      tick(); // Wait for products to load
      component.addItem();
      const item = component.itemsArray.at(0);
      
      item.get('productId')?.setValue(1);
      component.onProductChange(0);
      
      expect(item.get('price')?.value).toBe(10.00);
    }));
  });

  describe('Validation', () => {
    it('should mark employeeId as invalid when not selected', () => {
      const employeeControl = component.form.get('employeeId');
      employeeControl?.markAsTouched();
      
      expect(employeeControl?.invalid).toBe(true);
      expect(component.isFieldInvalid('employeeId')).toBe(true);
    });

    it('should mark date as invalid when empty', () => {
      const dateControl = component.form.get('date');
      dateControl?.setValue('');
      dateControl?.markAsTouched();
      
      expect(dateControl?.invalid).toBe(true);
    });
  });

  describe('Form Submit Prevention', () => {
    it('should NOT emit save when form is invalid', () => {
      const saveSpy = jest.spyOn(component.save, 'emit');
      
      // Leave form invalid (no employee selected)
      component.onFormSubmit();

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched when submitting invalid form', () => {
      const markAllAsTouchedSpy = jest.spyOn(component, 'markAllAsTouched');
      
      component.onFormSubmit();

      expect(markAllAsTouchedSpy).toHaveBeenCalled();
    });

    it('should emit save when form is valid', () => {
      const saveSpy = jest.spyOn(component.save, 'emit');
      
      component.form.patchValue({
        employeeId: 1,
        date: '2024-01-15',
        closed: false
      });

      component.onFormSubmit();

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should include items in CreatePurchaseWithItemsDto', () => {
      const saveSpy = jest.spyOn(component.save, 'emit');
      
      component.form.patchValue({
        employeeId: 1,
        date: '2024-01-15',
        closed: false
      });
      
      component.addItem();
      component.itemsArray.at(0).patchValue({
        productId: 1,
        quantity: 2,
        price: 10.00
      });
      component.recalculateTotal();

      component.onFormSubmit();

      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
        employeeId: 1,
        date: '2024-01-15',
        closed: false,
        total: 20.00,
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: 1,
            quantity: 2,
            price: 10.00
          })
        ])
      }));
    });
  });

  describe('Edit Mode', () => {
    it('should populate form with existing purchase data', () => {
      const purchase: Purchase = {
        id: 1,
        employeeId: 2,
        date: '2024-01-15T00:00:00',
        closed: false,
        total: 50.00,
        purchaseItems: [
          { id: 1, purchaseId: 1, productId: 1, quantity: 2, product: { id: 1, name: 'Product A', price: 10.00 } },
          { id: 2, purchaseId: 1, productId: 2, quantity: 1, product: { id: 2, name: 'Product B', price: 30.00 } }
        ]
      };

      component.purchase = purchase;
      component.ngOnChanges({
        purchase: { currentValue: purchase, previousValue: null, firstChange: false, isFirstChange: () => false }
      });

      expect(component.form.get('employeeId')?.value).toBe(2);
      expect(component.form.get('date')?.value).toBe('2024-01-15');
      expect(component.itemsArray.length).toBe(2);
      expect(component.isEditMode).toBe(true);
    });

    it('should disable form when purchase is closed', () => {
      const purchase: Purchase = {
        id: 1,
        employeeId: 2,
        date: '2024-01-15T00:00:00',
        closed: true,
        total: 50.00
      };
      
      component.purchase = purchase;
      component.ngOnChanges({
        purchase: { currentValue: purchase, previousValue: null, firstChange: false, isFirstChange: () => false }
      });

      expect(component.form.disabled).toBe(true);
    });
  });

  describe('Cancel', () => {
    it('should emit cancel event when cancel clicked', () => {
      const cancelSpy = jest.spyOn(component.cancel, 'emit');
      
      component.onCancelClick();

      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});
