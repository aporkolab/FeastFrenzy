import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ProductFormComponent } from './product-form.component';
import { Product } from 'src/app/model/product';

describe('ProductFormComponent', () => {
  let component: ProductFormComponent;
  let fixture: ComponentFixture<ProductFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent, ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with empty values in create mode', () => {
      expect(component.form.get('name')?.value).toBe('');
      expect(component.form.get('price')?.value).toBeNull();
      expect(component.isEditMode).toBe(false);
    });

    it('should initialize form with product values in edit mode', () => {
      const product: Product = { id: 1, name: 'Test Product', price: 29.99 };
      component.product = product;
      component.ngOnChanges({
        product: { currentValue: product, previousValue: null, firstChange: false, isFirstChange: () => false }
      });

      expect(component.form.get('name')?.value).toBe('Test Product');
      expect(component.form.get('price')?.value).toBe(29.99);
      expect(component.isEditMode).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should mark name as invalid when empty', () => {
      const nameControl = component.form.get('name');
      nameControl?.setValue('');
      nameControl?.markAsTouched();

      expect(nameControl?.invalid).toBe(true);
      expect(component.isFieldInvalid('name')).toBe(true);
    });

    it('should mark name as valid when filled', () => {
      const nameControl = component.form.get('name');
      nameControl?.setValue('Valid Product Name');
      nameControl?.markAsTouched();

      expect(nameControl?.valid).toBe(true);
      expect(component.isFieldValid('name')).toBe(true);
    });

    it('should mark price as invalid for negative values', () => {
      const priceControl = component.form.get('price');
      priceControl?.setValue(-10);
      priceControl?.markAsTouched();

      expect(priceControl?.invalid).toBe(true);
    });

    it('should mark price as invalid for too many decimals', () => {
      const priceControl = component.form.get('price');
      priceControl?.setValue(10.999);
      priceControl?.markAsTouched();

      expect(priceControl?.invalid).toBe(true);
    });

    it('should mark price as valid for proper price format', () => {
      const priceControl = component.form.get('price');
      priceControl?.setValue(29.99);
      priceControl?.markAsTouched();

      expect(priceControl?.valid).toBe(true);
    });
  });

  describe('Validation Message Display', () => {
    it('should return error message for required field', () => {
      const nameControl = component.form.get('name');
      nameControl?.setValue('');
      nameControl?.markAsTouched();

      const errorMessage = component.getFieldError('name');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage).toContain('required');
    });

    it('should return null when field is valid', () => {
      const nameControl = component.form.get('name');
      nameControl?.setValue('Valid Name');
      nameControl?.markAsTouched();

      expect(component.getFieldError('name')).toBeNull();
    });
  });

  describe('Form Submit Prevention', () => {
    it('should NOT emit save when form is invalid', () => {
      const saveSpy = jest.spyOn(component.save, 'emit');
      
      // Leave form empty (invalid)
      component.onFormSubmit();

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched when submitting invalid form', () => {
      const markAllAsTouchedSpy = jest.spyOn(component, 'markAllAsTouched');
      
      // Leave form empty (invalid)
      component.onFormSubmit();

      expect(markAllAsTouchedSpy).toHaveBeenCalled();
    });

    it('should emit save when form is valid', () => {
      const saveSpy = jest.spyOn(component.save, 'emit');
      
      // Fill form with valid data
      component.form.patchValue({
        name: 'Test Product',
        price: 29.99
      });

      component.onFormSubmit();

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should emit CreateProductDto in create mode', () => {
      const saveSpy = jest.spyOn(component.save, 'emit');
      component.product = null;
      
      component.form.patchValue({
        name: 'New Product',
        price: 19.99
      });

      component.onFormSubmit();

      expect(saveSpy).toHaveBeenCalledWith({
        name: 'New Product',
        price: 19.99
      });
    });

    it('should emit UpdateProductDto in edit mode', () => {
      const saveSpy = jest.spyOn(component.save, 'emit');
      const product: Product = { id: 1, name: 'Old Name', price: 10 };
      component.product = product;
      component.ngOnChanges({
        product: { currentValue: product, previousValue: null, firstChange: false, isFirstChange: () => false }
      });
      
      component.form.patchValue({
        name: 'Updated Name',
        price: 25.00
      });

      component.onFormSubmit();

      expect(saveSpy).toHaveBeenCalledWith({
        name: 'Updated Name',
        price: 25.00
      });
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
