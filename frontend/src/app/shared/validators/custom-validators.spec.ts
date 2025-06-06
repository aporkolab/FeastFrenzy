import { FormControl, FormGroup } from '@angular/forms';
import { CustomValidators } from './custom-validators';

describe('CustomValidators', () => {
  describe('password', () => {
    it('should return null for empty value (let required handle it)', () => {
      const control = new FormControl('');
      expect(CustomValidators.password(control)).toBeNull();
    });

    it('should return null for valid password', () => {
      const control = new FormControl('Password1');
      expect(CustomValidators.password(control)).toBeNull();
    });

    it('should return error for password without uppercase', () => {
      const control = new FormControl('password1');
      const result = CustomValidators.password(control);
      expect(result).toEqual(expect.objectContaining({ noUpperCase: true }));
    });

    it('should return error for password without number', () => {
      const control = new FormControl('Password');
      const result = CustomValidators.password(control);
      expect(result).toEqual(expect.objectContaining({ noNumber: true }));
    });

    it('should return error for password too short', () => {
      const control = new FormControl('Pass1');
      const result = CustomValidators.password(control);
      expect(result).toEqual(expect.objectContaining({ 
        minLength: { requiredLength: 8, actualLength: 5 } 
      }));
    });

    it('should return multiple errors for weak password', () => {
      const control = new FormControl('abc');
      const result = CustomValidators.password(control);
      expect(result).toEqual(expect.objectContaining({
        noUpperCase: true,
        noNumber: true,
        minLength: { requiredLength: 8, actualLength: 3 }
      }));
    });
  });

  describe('strongPassword', () => {
    it('should return null for strong password with special char', () => {
      const control = new FormControl('Password1!');
      expect(CustomValidators.strongPassword(control)).toBeNull();
    });

    it('should return error for password without special char', () => {
      const control = new FormControl('Password1');
      const result = CustomValidators.strongPassword(control);
      expect(result).toEqual(expect.objectContaining({ noSpecialChar: true }));
    });
  });

  describe('matchField', () => {
    it('should return null when fields match', () => {
      const group = new FormGroup({
        password: new FormControl('Test1234'),
        confirmPassword: new FormControl('Test1234', [CustomValidators.matchField('password')])
      });

      const confirmControl = group.get('confirmPassword');
      // Trigger validation after form is fully constructed (parent is set)
      confirmControl?.updateValueAndValidity();
      expect(confirmControl?.valid).toBe(true);
    });

    it('should return error when fields do not match', () => {
      const group = new FormGroup({
        password: new FormControl('Test1234'),
        confirmPassword: new FormControl('Different', [CustomValidators.matchField('password')])
      });

      const confirmControl = group.get('confirmPassword');
      // Trigger validation after form is fully constructed (parent is set)
      confirmControl?.updateValueAndValidity();
      expect(confirmControl?.errors).toEqual({ mismatch: { otherField: 'password' } });
    });

    it('should return null when parent is not available', () => {
      const control = new FormControl('value');
      const validator = CustomValidators.matchField('other');
      expect(validator(control)).toBeNull();
    });
  });

  describe('price', () => {
    it('should return null for valid price', () => {
      const control = new FormControl(29.99);
      expect(CustomValidators.price(control)).toBeNull();
    });

    it('should return null for empty value', () => {
      const control = new FormControl(null);
      expect(CustomValidators.price(control)).toBeNull();
    });

    it('should return error for negative price', () => {
      const control = new FormControl(-5);
      expect(CustomValidators.price(control)).toEqual({ negative: true });
    });

    it('should return error for too many decimal places', () => {
      const control = new FormControl(29.999);
      expect(CustomValidators.price(control)).toEqual({ 
        invalidDecimals: { maxDecimals: 2, actualDecimals: 3 } 
      });
    });

    it('should return error for price exceeding maximum', () => {
      const control = new FormControl(1000000);
      expect(CustomValidators.price(control)).toEqual({ 
        max: { max: 999999.99, actual: 1000000 } 
      });
    });

    it('should accept string numbers', () => {
      const control = new FormControl('29.99');
      expect(CustomValidators.price(control)).toBeNull();
    });

    it('should return error for non-numeric string', () => {
      const control = new FormControl('abc');
      expect(CustomValidators.price(control)).toEqual({ notANumber: true });
    });
  });

  describe('positiveNumber', () => {
    it('should return null for positive number', () => {
      const control = new FormControl(100);
      expect(CustomValidators.positiveNumber(control)).toBeNull();
    });

    it('should return error for zero', () => {
      const control = new FormControl(0);
      expect(CustomValidators.positiveNumber(control)).toEqual({ notPositive: true });
    });

    it('should return error for negative number', () => {
      const control = new FormControl(-5);
      expect(CustomValidators.positiveNumber(control)).toEqual({ notPositive: true });
    });
  });

  describe('phoneNumber (Hungarian)', () => {
    it('should return null for valid mobile with +36', () => {
      const control = new FormControl('+36 20 123 4567');
      expect(CustomValidators.phoneNumber(control)).toBeNull();
    });

    it('should return null for valid mobile with 06', () => {
      const control = new FormControl('06 70 123 4567');
      expect(CustomValidators.phoneNumber(control)).toBeNull();
    });

    it('should return null for valid mobile without spaces', () => {
      const control = new FormControl('+36301234567');
      expect(CustomValidators.phoneNumber(control)).toBeNull();
    });

    it('should return null for valid landline (Budapest)', () => {
      const control = new FormControl('+36 1 234 5678');
      expect(CustomValidators.phoneNumber(control)).toBeNull();
    });

    it('should return error for invalid phone number', () => {
      const control = new FormControl('123456');
      expect(CustomValidators.phoneNumber(control)).toEqual({ 
        invalidPhone: { example: '+36 20 123 4567' } 
      });
    });

    it('should return null for empty value', () => {
      const control = new FormControl('');
      expect(CustomValidators.phoneNumber(control)).toBeNull();
    });
  });

  describe('futureDate', () => {
    it('should return null for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const control = new FormControl(futureDate.toISOString().split('T')[0]);
      expect(CustomValidators.futureDate(control)).toBeNull();
    });

    it('should return null for today', () => {
      const today = new Date().toISOString().split('T')[0];
      const control = new FormControl(today);
      expect(CustomValidators.futureDate(control)).toBeNull();
    });

    it('should return error for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const control = new FormControl(pastDate.toISOString().split('T')[0]);
      const result = CustomValidators.futureDate(control);
      expect(result).toEqual(expect.objectContaining({ pastDate: expect.any(Object) }));
    });

    it('should return error for invalid date string', () => {
      const control = new FormControl('not-a-date');
      expect(CustomValidators.futureDate(control)).toEqual({ invalidDate: true });
    });
  });

  describe('pastDate', () => {
    it('should return null for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const control = new FormControl(pastDate.toISOString().split('T')[0]);
      expect(CustomValidators.pastDate(control)).toBeNull();
    });

    it('should return null for today', () => {
      const today = new Date().toISOString().split('T')[0];
      const control = new FormControl(today);
      expect(CustomValidators.pastDate(control)).toBeNull();
    });

    it('should return error for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const control = new FormControl(futureDate.toISOString().split('T')[0]);
      const result = CustomValidators.pastDate(control);
      expect(result).toEqual(expect.objectContaining({ futureDate: expect.any(Object) }));
    });
  });

  describe('employeeNumber', () => {
    it('should return null for valid employee number', () => {
      const control = new FormControl('EMP12345');
      expect(CustomValidators.employeeNumber(control)).toBeNull();
    });

    it('should return null for employee number with 4 letters', () => {
      const control = new FormControl('ABCD1234');
      expect(CustomValidators.employeeNumber(control)).toBeNull();
    });

    it('should return error for invalid format', () => {
      const control = new FormControl('12345');
      expect(CustomValidators.employeeNumber(control)).toEqual({ 
        invalidEmployeeNumber: { example: 'EMP12345' } 
      });
    });

    it('should return error for too few letters', () => {
      const control = new FormControl('E12345');
      expect(CustomValidators.employeeNumber(control)).toEqual({ 
        invalidEmployeeNumber: { example: 'EMP12345' } 
      });
    });
  });

  describe('noWhitespace', () => {
    it('should return null for valid string with content', () => {
      const control = new FormControl('Valid Name');
      expect(CustomValidators.noWhitespace(control)).toBeNull();
    });

    it('should return error for whitespace-only string', () => {
      const control = new FormControl('   ');
      expect(CustomValidators.noWhitespace(control)).toEqual({ whitespace: true });
    });

    it('should return null for empty string (let required handle it)', () => {
      const control = new FormControl('');
      expect(CustomValidators.noWhitespace(control)).toBeNull();
    });
  });

  describe('url', () => {
    it('should return null for valid URL', () => {
      const control = new FormControl('https://example.com');
      expect(CustomValidators.url(control)).toBeNull();
    });

    it('should return null for valid URL with path', () => {
      const control = new FormControl('https://example.com/path/to/page');
      expect(CustomValidators.url(control)).toBeNull();
    });

    it('should return error for invalid URL', () => {
      const control = new FormControl('not-a-url');
      expect(CustomValidators.url(control)).toEqual({ invalidUrl: true });
    });

    it('should return null for empty value', () => {
      const control = new FormControl('');
      expect(CustomValidators.url(control)).toBeNull();
    });
  });

  describe('dateRange', () => {
    it('should return null when start is before end', () => {
      const group = new FormGroup({
        startDate: new FormControl('2024-01-01'),
        endDate: new FormControl('2024-12-31')
      }, { validators: CustomValidators.dateRange('startDate', 'endDate') });

      expect(group.errors).toBeNull();
    });

    it('should return null when dates are equal', () => {
      const group = new FormGroup({
        startDate: new FormControl('2024-06-15'),
        endDate: new FormControl('2024-06-15')
      }, { validators: CustomValidators.dateRange('startDate', 'endDate') });

      expect(group.errors).toBeNull();
    });

    it('should return error when start is after end', () => {
      const group = new FormGroup({
        startDate: new FormControl('2024-12-31'),
        endDate: new FormControl('2024-01-01')
      }, { validators: CustomValidators.dateRange('startDate', 'endDate') });

      expect(group.errors).toEqual({ 
        dateRange: { start: 'startDate', end: 'endDate' } 
      });
    });

    it('should return null when either date is empty', () => {
      const group = new FormGroup({
        startDate: new FormControl(''),
        endDate: new FormControl('2024-12-31')
      }, { validators: CustomValidators.dateRange('startDate', 'endDate') });

      expect(group.errors).toBeNull();
    });
  });
});
