import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from 'src/app/model/employee';
import { BaseFormComponent, FormFieldComponent } from 'src/app/shared/components';
import { CustomValidators } from 'src/app/shared/validators';

/**
 * Reusable Employee form component.
 * Handles both create and edit modes based on whether an employee is provided.
 * 
 * Usage:
 * ```html
 * <app-employee-form
 *   [employee]="existingEmployee"
 *   [loading]="isSaving"
 *   (save)="onSave($event)"
 *   (cancel)="onCancel()"
 * ></app-employee-form>
 * ```
 */
@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent],
  template: `
    <form 
      [formGroup]="form" 
      (ngSubmit)="onFormSubmit()" 
      class="employee-form" 
      novalidate
      aria-label="Employee information form"
    >
      <!-- Name Field -->
      <app-form-field
        label="Full Name"
        fieldId="employee-name"
        [required]="true"
        [showError]="isFieldInvalid('name')"
        [errorMessage]="getFieldError('name')"
        hint="Employee's full name as it appears on official documents">
        <input
          type="text"
          id="employee-name"
          class="form-control"
          formControlName="name"
          [class.is-invalid]="isFieldInvalid('name')"
          [class.is-valid]="isFieldValid('name')"
          placeholder="e.g., John Smith"
          autocomplete="name"
          aria-required="true"
          [attr.aria-invalid]="isFieldInvalid('name')"
          [attr.aria-describedby]="isFieldInvalid('name') ? 'employee-name-error' : 'employee-name-hint'"
        >
      </app-form-field>

      <!-- Employee Number Field -->
      <app-form-field
        label="Employee Number"
        fieldId="employee-number"
        [required]="true"
        [showError]="isFieldInvalid('employee_number')"
        [errorMessage]="getFieldError('employee_number')"
        hint="Unique identifier (2-4 letters + 4-8 digits, e.g., EMP12345)">
        <input
          type="text"
          id="employee-number"
          class="form-control"
          formControlName="employee_number"
          [class.is-invalid]="isFieldInvalid('employee_number')"
          [class.is-valid]="isFieldValid('employee_number')"
          placeholder="e.g., EMP12345"
          autocomplete="off"
          [readonly]="isEditMode"
          [class.readonly-field]="isEditMode"
          aria-required="true"
          [attr.aria-invalid]="isFieldInvalid('employee_number')"
          [attr.aria-describedby]="isFieldInvalid('employee_number') ? 'employee-number-error' : 'employee-number-hint'"
          [attr.aria-readonly]="isEditMode"
        >
        @if (isEditMode) {
          <small class="text-muted d-block mt-1" aria-live="polite">
            <em>Employee number cannot be changed after creation</em>
          </small>
        }
      </app-form-field>

      <!-- Monthly Consumption Value Field -->
      <app-form-field
        label="Monthly Consumption Allowance"
        fieldId="monthly-consumption"
        [required]="true"
        [showError]="isFieldInvalid('monthlyConsumptionValue')"
        [errorMessage]="getFieldError('monthlyConsumptionValue')"
        hint="Maximum monthly spending limit for this employee">
        <div class="input-group">
          <span class="input-group-text" aria-hidden="true">$</span>
          <input
            type="number"
            id="monthly-consumption"
            class="form-control"
            formControlName="monthlyConsumptionValue"
            [class.is-invalid]="isFieldInvalid('monthlyConsumptionValue')"
            [class.is-valid]="isFieldValid('monthlyConsumptionValue')"
            placeholder="0.00"
            step="0.01"
            min="0"
            autocomplete="off"
            aria-required="true"
            aria-label="Monthly consumption allowance in dollars"
            [attr.aria-invalid]="isFieldInvalid('monthlyConsumptionValue')"
            [attr.aria-describedby]="isFieldInvalid('monthlyConsumptionValue') ? 'monthly-consumption-error' : 'monthly-consumption-hint'"
          >
        </div>
      </app-form-field>

      <!-- Form Actions -->
      <div class="form-actions d-flex gap-2 mt-4" role="group" aria-label="Form actions">
        <button
          type="button"
          class="btn btn-outline-secondary"
          (click)="onCancelClick()"
          [disabled]="loading"
          aria-label="Cancel and go back">
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          [disabled]="loading || (form.invalid && form.touched)"
          [attr.aria-busy]="loading"
          [attr.aria-label]="isEditMode ? 'Update employee' : 'Create employee'">
          @if (loading) {
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            <span class="sr-only">{{ isEditMode ? 'Updating employee...' : 'Creating employee...' }}</span>
            {{ isEditMode ? 'Updating...' : 'Creating...' }}
          } @else {
            {{ isEditMode ? 'Update Employee' : 'Create Employee' }}
          }
        </button>
      </div>

      <!-- Debug info (remove in production) -->
      @if (showDebug) {
        <div class="mt-4 p-3 bg-light rounded small" aria-hidden="true">
          <strong>Form Debug:</strong><br>
          Valid: {{ form.valid }}<br>
          Dirty: {{ form.dirty }}<br>
          Touched: {{ form.touched }}<br>
          Errors: {{ form.errors | json }}<br>
          Value: {{ form.value | json }}
        </div>
      }
    </form>
  `,
  styles: [`
    .employee-form {
      max-width: 500px;
    }

    .form-actions {
      padding-top: 1rem;
      border-top: 1px solid var(--bs-border-color);
    }

    .readonly-field {
      background-color: var(--bs-gray-100);
      cursor: not-allowed;
    }

    :host ::ng-deep .input-group .form-control.is-invalid {
      border-top-right-radius: 0.375rem;
      border-bottom-right-radius: 0.375rem;
    }
  `]
})
export class EmployeeFormComponent extends BaseFormComponent implements OnInit, OnChanges {
  /** Employee to edit (null for create mode) */
  @Input() employee: Employee | null = null;
  
  /** Loading state for submit button */
  @Input() loading = false;
  
  /** Show debug information (dev only) */
  @Input() showDebug = false;

  /** Emitted when form is submitted with valid data */
  @Output() save = new EventEmitter<CreateEmployeeDto | UpdateEmployeeDto>();
  
  /** Emitted when cancel is clicked */
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  // Override error messages with employee-specific ones
  protected override errorMessages: Record<string, string | ((error: any) => string)> = {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    minlength: (error: any) => `Minimum ${error.requiredLength} characters required`,
    maxlength: (error: any) => `Maximum ${error.requiredLength} characters allowed`,
    min: (error: any) => `Minimum value is ${error.min}`,
    max: (error: any) => `Maximum value is ${error.max}`,
    pattern: 'Invalid format',
    noUpperCase: 'Must contain at least one uppercase letter',
    noLowerCase: 'Must contain at least one lowercase letter',
    noNumber: 'Must contain at least one number',
    noSpecialChar: 'Must contain at least one special character (!@#$%^&*)',
    mismatch: 'Fields do not match',
    negative: 'Value cannot be negative',
    notPositive: 'Value must be greater than zero',
    notANumber: 'Please enter a valid number',
    invalidDecimals: (error: any) => `Maximum ${error.maxDecimals} decimal places allowed`,
    invalidPhone: (error: any) => `Invalid phone number format${error?.example ? `. Example: ${error.example}` : ''}`,
    invalidDate: 'Please enter a valid date',
    pastDate: (error: any) => `Date must be ${error?.minDate || 'today'} or later`,
    futureDate: (error: any) => `Date must be ${error?.maxDate || 'today'} or earlier`,
    dateRange: 'Start date must be before end date',
    invalidEmployeeNumber: () => 'Format: 2-4 letters + 4-8 digits (e.g., EMP12345)',
    whitespace: 'Name cannot be empty or only whitespace',
    invalidUrl: 'Please enter a valid URL',
    invalidCreditCard: 'Invalid credit card number',
  };

  constructor(private fb: FormBuilder) {
    super();
  }

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-initialize form when employee changes (e.g., loaded from API)
    if (changes['employee'] && !changes['employee'].firstChange) {
      this.initForm();
    }
  }

  /**
   * Check if we're in edit mode (have an existing employee)
   */
  get isEditMode(): boolean {
    return !!this.employee?.id;
  }

  /**
   * Initialize the form with validators
   */
  private initForm(): void {
    this.form = this.fb.group({
      name: [
        this.employee?.name || '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(255),
          CustomValidators.noWhitespace
        ]
      ],
      employee_number: [
        this.employee?.employee_number || '',
        [
          Validators.required,
          CustomValidators.employeeNumber
        ]
      ],
      monthlyConsumptionValue: [
        this.employee?.monthlyConsumptionValue ?? null,
        [
          Validators.required,
          CustomValidators.positiveNumber,
          CustomValidators.price // Reuse price validation for currency format
        ]
      ]
    });

    // In edit mode, disable employee_number as it shouldn't be changed
    if (this.isEditMode) {
      this.form.get('employee_number')?.disable();
    }
  }

  /**
   * Handle form submission
   */
  onFormSubmit(): void {
    if (this.form.invalid) {
      this.markAllAsTouched();
      return;
    }

    // Use getRawValue to include disabled fields (employee_number in edit mode)
    const formValue = this.form.getRawValue();
    
    // Trim string values and parse number
    const dto: CreateEmployeeDto | UpdateEmployeeDto = {
      name: formValue.name.trim(),
      employee_number: formValue.employee_number.trim().toUpperCase(),
      monthlyConsumptionValue: parseFloat(formValue.monthlyConsumptionValue)
    };

    // In edit mode, we might want to exclude employee_number from the DTO
    // depending on backend behavior
    if (this.isEditMode) {
      const updateDto: UpdateEmployeeDto = {
        name: dto.name,
        monthlyConsumptionValue: dto.monthlyConsumptionValue
      };
      this.save.emit(updateDto);
    } else {
      this.save.emit(dto);
    }
  }

  /**
   * Handle cancel click
   */
  onCancelClick(): void {
    this.cancel.emit();
  }
}
