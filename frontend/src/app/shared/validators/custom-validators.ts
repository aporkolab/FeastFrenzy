import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Custom validators for FeastFrenzy application.
 * 
 * Usage:
 * ```typescript
 * this.form = this.fb.group({
 *   password: ['', [Validators.required, CustomValidators.password]],
 *   confirmPassword: ['', [CustomValidators.matchField('password')]],
 *   price: ['', [CustomValidators.price]],
 *   phone: ['', [CustomValidators.phoneNumber]],
 *   eventDate: ['', [CustomValidators.futureDate]]
 * });
 * ```
 */
export class CustomValidators {
  /**
   * Password validator: minimum 8 characters, at least 1 uppercase, 1 number
   * Returns specific errors for each requirement not met.
   */
  static password(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null; // Let required validator handle empty

    const errors: ValidationErrors = {};

    if (value.length < 8) {
      errors['minLength'] = { requiredLength: 8, actualLength: value.length };
    }
    if (!/[A-Z]/.test(value)) {
      errors['noUpperCase'] = true;
    }
    if (!/[a-z]/.test(value)) {
      errors['noLowerCase'] = true;
    }
    if (!/[0-9]/.test(value)) {
      errors['noNumber'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  /**
   * Strong password validator: extends password with special character requirement
   */
  static strongPassword(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const errors = CustomValidators.password(control) || {};

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      errors['noSpecialChar'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  /**
   * Field matching validator - typically used for password confirmation.
   * Must be applied to the confirmation field, not the original.
   * 
   * @param fieldName - The name of the field to match against
   */
  static matchField(fieldName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const parent = control.parent;
      if (!parent) return null;

      const fieldToMatch = parent.get(fieldName);
      if (!fieldToMatch) return null;

      // Subscribe to changes of the original field to revalidate
      // This ensures the confirmation field updates when original changes
      const controlWithFlag = control as AbstractControl & { _matchFieldSubscribed?: boolean };
      if (!controlWithFlag._matchFieldSubscribed) {
        controlWithFlag._matchFieldSubscribed = true;
        fieldToMatch.valueChanges.subscribe(() => {
          control.updateValueAndValidity({ emitEvent: false });
        });
      }

      return control.value === fieldToMatch.value ? null : { mismatch: { otherField: fieldName } };
    };
  }

  /**
   * Price validator: positive number with max 2 decimal places
   * Max value: 999,999.99
   */
  static price(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return { notANumber: true };
    }

    if (numValue < 0) {
      return { negative: true };
    }

    // Check decimal places
    const strValue = numValue.toString();
    if (strValue.includes('.')) {
      const decimals = strValue.split('.')[1];
      if (decimals && decimals.length > 2) {
        return { invalidDecimals: { maxDecimals: 2, actualDecimals: decimals.length } };
      }
    }

    if (numValue > 999999.99) {
      return { max: { max: 999999.99, actual: numValue } };
    }

    return null;
  }

  /**
   * Positive number validator
   */
  static positiveNumber(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return { notANumber: true };
    }

    if (numValue <= 0) {
      return { notPositive: true };
    }

    return null;
  }

  /**
   * Hungarian phone number validator
   * Accepts formats: +36 20 123 4567, 06 70 123 4567, etc.
   */
  static phoneNumber(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    // Remove all spaces and hyphens for validation
    const cleaned = value.replace(/[\s-]/g, '');

    // Hungarian mobile: +36/06 + operator (20,30,31,50,70) + 7 digits
    // Hungarian landline: +36/06 + area code (1-9X) + 6-7 digits
    const mobilePattern = /^(\+36|06)(20|30|31|50|70)\d{7}$/;
    const landlinePattern = /^(\+36|06)(1\d{7}|[2-9]\d{7,8})$/;

    if (!mobilePattern.test(cleaned) && !landlinePattern.test(cleaned)) {
      return { invalidPhone: { example: '+36 20 123 4567' } };
    }

    return null;
  }

  /**
   * International phone number validator (basic E.164 format)
   */
  static internationalPhone(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const cleaned = value.replace(/[\s-()]/g, '');
    // E.164: + followed by 7-15 digits
    const pattern = /^\+[1-9]\d{6,14}$/;

    return pattern.test(cleaned) ? null : { invalidPhone: { example: '+1234567890' } };
  }

  /**
   * Future date validator - date cannot be in the past
   * Compares at day level (ignores time)
   */
  static futureDate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const inputDate = new Date(value);
    if (isNaN(inputDate.getTime())) {
      return { invalidDate: true };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);

    return inputDate >= today ? null : { pastDate: { minDate: today.toISOString().split('T')[0] } };
  }

  /**
   * Past date validator - date cannot be in the future
   */
  static pastDate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const inputDate = new Date(value);
    if (isNaN(inputDate.getTime())) {
      return { invalidDate: true };
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    inputDate.setHours(0, 0, 0, 0);

    return inputDate <= today ? null : { futureDate: { maxDate: today.toISOString().split('T')[0] } };
  }

  /**
   * Date range validator - use with FormGroup
   * Ensures start date is before end date
   * 
   * @param startFieldName - Name of the start date field
   * @param endFieldName - Name of the end date field
   */
  static dateRange(startFieldName: string, endFieldName: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const startControl = group.get(startFieldName);
      const endControl = group.get(endFieldName);

      if (!startControl || !endControl) return null;

      const startValue = startControl.value;
      const endValue = endControl.value;

      if (!startValue || !endValue) return null;

      const startDate = new Date(startValue);
      const endDate = new Date(endValue);

      if (startDate > endDate) {
        return { dateRange: { start: startFieldName, end: endFieldName } };
      }

      return null;
    };
  }

  /**
   * Employee number validator - alphanumeric, specific format
   * Format: 2-4 letters followed by 4-8 digits (e.g., EMP12345, ABC1234)
   */
  static employeeNumber(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const pattern = /^[A-Za-z]{2,4}\d{4,8}$/;
    return pattern.test(value) ? null : { invalidEmployeeNumber: { example: 'EMP12345' } };
  }

  /**
   * No whitespace validator - trims and checks for empty
   */
  static noWhitespace(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const trimmed = value.toString().trim();
    if (trimmed.length === 0) {
      return { whitespace: true };
    }

    return null;
  }

  /**
   * URL validator
   */
  static url(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    try {
      new URL(value);
      return null;
    } catch {
      return { invalidUrl: true };
    }
  }

  /**
   * Credit card number validator (Luhn algorithm)
   * For demonstration - use a proper payment provider in production!
   */
  static creditCard(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length < 13 || cleaned.length > 19) {
      return { invalidCreditCard: true };
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0 ? null : { invalidCreditCard: true };
  }
}
