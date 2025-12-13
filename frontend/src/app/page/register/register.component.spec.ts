import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../service/auth.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RegisterComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule
      ],
      providers: [AuthService]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a register form with all required fields', () => {
    expect(component.registerForm.contains('name')).toBeTruthy();
    expect(component.registerForm.contains('email')).toBeTruthy();
    expect(component.registerForm.contains('password')).toBeTruthy();
    expect(component.registerForm.contains('confirmPassword')).toBeTruthy();
  });

  it('should validate password strength', () => {
    const passwordControl = component.registerForm.get('password');
    
    
    passwordControl?.setValue('weakpass');
    expect(passwordControl?.hasError('passwordStrength')).toBeTruthy();
    
    
    passwordControl?.setValue('StrongPass123');
    expect(passwordControl?.hasError('passwordStrength')).toBeFalsy();
  });

  it('should validate password match', () => {
    component.registerForm.patchValue({
      password: 'StrongPass123',
      confirmPassword: 'DifferentPass123'
    });
    
    expect(component.registerForm.hasError('passwordMismatch')).toBeTruthy();
    
    component.registerForm.patchValue({
      confirmPassword: 'StrongPass123'
    });
    
    expect(component.registerForm.hasError('passwordMismatch')).toBeFalsy();
  });

  it('should calculate password strength correctly', () => {
    component.registerForm.get('password')?.setValue('weak');
    expect(component.getPasswordStrength().label).toBe('Weak');
    
    component.registerForm.get('password')?.setValue('MediumPass1');
    expect(component.getPasswordStrength().label).toBe('Medium');
    
    component.registerForm.get('password')?.setValue('StrongPass123!');
    expect(component.getPasswordStrength().label).toBe('Strong');
  });
});
