import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { EmployeeFormComponent } from './employee-form.component';
import { Employee } from 'src/app/model/employee';

describe('EmployeeFormComponent', () => {
  let component: EmployeeFormComponent;
  let fixture: ComponentFixture<EmployeeFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeFormComponent, ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with empty values in create mode', () => {
      expect(component.form.get('name')?.value).toBe('');
      expect(component.form.get('employee_number')?.value).toBe('');
      expect(component.form.get('monthlyConsumptionValue')?.value).toBeNull();
      expect(component.isEditMode).toBe(false);
    });

    it('should initialize form with employee values in edit mode', () => {
      const employee: Employee = {
        id: 1,
        name: 'John Doe',
        employee_number: 'EMP12345',
        monthlyConsumptionValue: 500
      };
      component.employee = employee;
      component.ngOnChanges({
        employee: { currentValue: employee, previousValue: null, firstChange: false, isFirstChange: () => false }
      });

      expect(component.form.get('name')?.value).toBe('John Doe');
      expect(component.form.get('employee_number')?.value).toBe('EMP12345');
      expect(component.form.get('monthlyConsumptionValue')?.value).toBe(500);
      expect(component.isEditMode).toBe(true);
    });

    it('should disable employee_number field in edit mode', () => {
      const employee: Employee = {
        id: 1,
        name: 'John Doe',
        employee_number: 'EMP12345',
        monthlyConsumptionValue: 500
      };
      component.employee = employee;
      component.ngOnChanges({
        employee: { currentValue: employee, previousValue: null, firstChange: false, isFirstChange: () => false }
      });

      expect(component.form.get('employee_number')?.disabled).toBe(true);
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

    it('should mark name as invalid when too short', () => {
      const nameControl = component.form.get('name');
      nameControl?.setValue('A');
      nameControl?.markAsTouched();

      expect(nameControl?.invalid).toBe(true);
    });

    it('should mark employee_number as invalid for wrong format', () => {
      const empNumControl = component.form.get('employee_number');
      empNumControl?.setValue('123'); // Invalid format
      empNumControl?.markAsTouched();

      expect(empNumControl?.invalid).toBe(true);
    });

    it('should mark employee_number as valid for correct format', () => {
      const empNumControl = component.form.get('employee_number');
      empNumControl?.setValue('EMP12345');
      empNumControl?.markAsTouched();

      expect(empNumControl?.valid).toBe(true);
    });

    it('should mark monthlyConsumptionValue as invalid for zero', () => {
      const consumptionControl = component.form.get('monthlyConsumptionValue');
      consumptionControl?.setValue(0);
      consumptionControl?.markAsTouched();

      expect(consumptionControl?.invalid).toBe(true);
    });

    it('should mark monthlyConsumptionValue as invalid for negative', () => {
      const consumptionControl = component.form.get('monthlyConsumptionValue');
      consumptionControl?.setValue(-100);
      consumptionControl?.markAsTouched();

      expect(consumptionControl?.invalid).toBe(true);
    });

    it('should mark monthlyConsumptionValue as valid for positive number', () => {
      const consumptionControl = component.form.get('monthlyConsumptionValue');
      consumptionControl?.setValue(500);
      consumptionControl?.markAsTouched();

      expect(consumptionControl?.valid).toBe(true);
    });
  });

  describe('Validation Message Display', () => {
    it('should return error message for required name', () => {
      const nameControl = component.form.get('name');
      nameControl?.setValue('');
      nameControl?.markAsTouched();

      const errorMessage = component.getFieldError('name');
      expect(errorMessage).toBeTruthy();
    });

    it('should return error message for invalid employee number', () => {
      const empNumControl = component.form.get('employee_number');
      empNumControl?.setValue('INVALID');
      empNumControl?.markAsTouched();

      const errorMessage = component.getFieldError('employee_number');
      expect(errorMessage).toBeTruthy();
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
      
      component.onFormSubmit();

      expect(markAllAsTouchedSpy).toHaveBeenCalled();
    });

    it('should emit save when form is valid', () => {
      const saveSpy = jest.spyOn(component.save, 'emit');
      
      component.form.patchValue({
        name: 'John Doe',
        employee_number: 'EMP12345',
        monthlyConsumptionValue: 500
      });

      component.onFormSubmit();

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should emit CreateEmployeeDto in create mode', () => {
      const saveSpy = jest.spyOn(component.save, 'emit');
      component.employee = null;
      
      component.form.patchValue({
        name: 'Jane Doe',
        employee_number: 'EMP99999',
        monthlyConsumptionValue: 750
      });

      component.onFormSubmit();

      expect(saveSpy).toHaveBeenCalledWith({
        name: 'Jane Doe',
        employee_number: 'EMP99999',
        monthlyConsumptionValue: 750
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
