import { Directive } from '@angular/core';
import { FormGroup, FormArray, AbstractControl } from '@angular/forms';

/**
 * Abstract base class for form components.
 * Provides common functionality for form handling, validation display, and error management.
 * 
 * Usage:
 * ```typescript
 * @Component({...})
 * export class ProductFormComponent extends BaseFormComponent {
 *   form = this.fb.group({...});
 * }
 * ```
 * 
 * Template usage:
 * ```html
 * <input [class.is-invalid]="isFieldInvalid('name')">
 * <div class="invalid-feedback">{{ getFieldError('name') }}</div>
 * ```
 */
@Directive() // Required for Angular to recognize it as injectable
export abstract class BaseFormComponent {
  abstract form: FormGroup;

  /**
   * Error messages mapped to validation error keys.
   * Override in child class to customize messages.
   */
  protected errorMessages: Record<string, string | ((error: any) => string)> = {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    minlength: (error) => `Minimum ${error.requiredLength} characters required`,
    maxlength: (error) => `Maximum ${error.requiredLength} characters allowed`,
    min: (error) => `Minimum value is ${error.min}`,
    max: (error) => `Maximum value is ${error.max}`,
    pattern: 'Invalid format',
    // Custom validators
    noUpperCase: 'Must contain at least one uppercase letter',
    noLowerCase: 'Must contain at least one lowercase letter',
    noNumber: 'Must contain at least one number',
    noSpecialChar: 'Must contain at least one special character (!@#$%^&*)',
    mismatch: 'Fields do not match',
    negative: 'Value cannot be negative',
    notPositive: 'Value must be greater than zero',
    notANumber: 'Please enter a valid number',
    invalidDecimals: (error) => `Maximum ${error.maxDecimals} decimal places allowed`,
    invalidPhone: (error) => `Invalid phone number format${error?.example ? `. Example: ${error.example}` : ''}`,
    invalidDate: 'Please enter a valid date',
    pastDate: (error) => `Date must be ${error?.minDate || 'today'} or later`,
    futureDate: (error) => `Date must be ${error?.maxDate || 'today'} or earlier`,
    dateRange: 'Start date must be before end date',
    invalidEmployeeNumber: (error) => `Invalid format${error?.example ? `. Example: ${error.example}` : ''}`,
    whitespace: 'This field cannot be only whitespace',
    invalidUrl: 'Please enter a valid URL',
    invalidCreditCard: 'Invalid credit card number',
  };

  /**
   * Check if a field should show validation errors.
   * Returns true if the field is invalid AND has been touched or dirty.
   */
  isFieldInvalid(fieldPath: string): boolean {
    const field = this.getField(fieldPath);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  /**
   * Check if a field is valid and has been interacted with.
   * Useful for showing success states.
   */
  isFieldValid(fieldPath: string): boolean {
    const field = this.getField(fieldPath);
    return field ? field.valid && (field.dirty || field.touched) : false;
  }

  /**
   * Get the first error message for a field.
   * Looks up error messages from the errorMessages map.
   */
  getFieldError(fieldPath: string): string | null {
    const field = this.getField(fieldPath);
    if (!field || !field.errors) return null;

    const errorKeys = Object.keys(field.errors);
    if (errorKeys.length === 0) return null;

    const firstErrorKey = errorKeys[0];
    const errorValue = field.errors[firstErrorKey];
    const messageOrFn = this.errorMessages[firstErrorKey];

    if (!messageOrFn) {
      return 'Invalid value';
    }

    if (typeof messageOrFn === 'function') {
      return messageOrFn(errorValue);
    }

    return messageOrFn;
  }

  /**
   * Get all error messages for a field as an array.
   */
  getFieldErrors(fieldPath: string): string[] {
    const field = this.getField(fieldPath);
    if (!field || !field.errors) return [];

    return Object.keys(field.errors).map((errorKey) => {
      const errorValue = field.errors![errorKey];
      const messageOrFn = this.errorMessages[errorKey];

      if (!messageOrFn) return 'Invalid value';
      if (typeof messageOrFn === 'function') return messageOrFn(errorValue);
      return messageOrFn;
    });
  }

  /**
   * Get a form control by its path (supports nested paths like 'address.street').
   */
  protected getField(fieldPath: string): AbstractControl | null {
    return this.form.get(fieldPath);
  }

  /**
   * Mark all form controls as touched to trigger validation display.
   * Handles nested FormGroups and FormArrays.
   */
  markAllAsTouched(): void {
    this.markControlAsTouched(this.form);
  }

  /**
   * Recursively mark a control and its children as touched.
   */
  private markControlAsTouched(control: AbstractControl): void {
    control.markAsTouched({ onlySelf: true });

    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach((c) => this.markControlAsTouched(c));
    } else if (control instanceof FormArray) {
      control.controls.forEach((c) => this.markControlAsTouched(c));
    }
  }

  /**
   * Reset the form to its initial state.
   * Optionally accepts new default values.
   */
  resetForm(values?: Record<string, any>): void {
    if (values) {
      this.form.reset(values);
    } else {
      this.form.reset();
    }
  }

  /**
   * Check if the form has any unsaved changes.
   */
  get isDirty(): boolean {
    return this.form.dirty;
  }

  /**
   * Check if the form is valid.
   */
  get isValid(): boolean {
    return this.form.valid;
  }

  /**
   * Get form value as typed object.
   * Note: This returns the raw form value. Use getRawValue() for disabled fields.
   */
  get formValue(): Record<string, any> {
    return this.form.value;
  }

  /**
   * Get form value including disabled fields.
   */
  get rawFormValue(): Record<string, any> {
    return this.form.getRawValue();
  }

  /**
   * Utility method to check if we're in edit mode (has an ID or existing data).
   * Override in child class if needed.
   */
  abstract get isEditMode(): boolean;
}
