import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../service/auth.service';
import { of, throwError } from 'rxjs';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authSpy: { register: jest.Mock; isAuthenticated: jest.Mock };
  let router: Router;

  beforeEach(async () => {
    
    authSpy = {
      register: jest.fn(),
      isAuthenticated: jest.fn().mockReturnValue(false)
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule],
      providers: [
        provideRouter([{ path: 'login', component: RegisterComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form when empty', () => {
    expect(component.form.valid).toBe(false);
  });

  it('should validate name is required', () => {
    const nameControl = component.form.get('name');
    expect(nameControl?.errors?.['required']).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component.form.get('email');
    emailControl?.setValue('invalid');
    expect(emailControl?.errors?.['email']).toBeTruthy();
  });

  it('should validate password requirements', () => {
    const passwordControl = component.form.get('password');
    passwordControl?.setValue('123');
    // CustomValidators.password returns specific error keys
    expect(passwordControl?.errors?.['minLength']).toBeTruthy();
  });

  it('should call authService.register on valid submit', fakeAsync(() => {
    const mockResponse = {
      user: { id: 1, email: 'new@test.com', name: 'New User', role: 'employee' as const },
      tokens: { accessToken: 'token', refreshToken: 'refresh' }
    };
    authSpy.register.mockReturnValue(of(mockResponse));
    jest.spyOn(router, 'navigate');

    component.form.setValue({
      name: 'New User',
      email: 'new@test.com',
      password: 'Password123',
      confirmPassword: 'Password123'
    });
    component.onSubmit();
    tick();

    expect(authSpy.register).toHaveBeenCalled();
  }));

  it('should show error on registration failure', fakeAsync(() => {
    authSpy.register.mockReturnValue(throwError(() => ({ message: 'Email exists' })));

    component.form.setValue({
      name: 'Test',
      email: 'exists@test.com',
      password: 'Password123',
      confirmPassword: 'Password123'
    });
    component.onSubmit();
    tick();

    expect(component.errorMessage).toBe('Email exists');
  }));
});
