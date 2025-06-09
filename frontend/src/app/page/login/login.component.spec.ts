import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';
import { AuthService } from '../../service/auth.service';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: { login: jest.Mock; isAuthenticated: jest.Mock };
  let router: Router;

  beforeEach(async () => {
    
    authSpy = {
      login: jest.fn(),
      isAuthenticated: jest.fn().mockReturnValue(false)
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        provideRouter([{ path: 'dashboard', component: LoginComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
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

  it('should validate email format', () => {
    const emailControl = component.form.get('email');
    emailControl?.setValue('invalid-email');
    expect(emailControl?.errors?.['email']).toBeTruthy();
    
    emailControl?.setValue('valid@email.com');
    expect(emailControl?.errors).toBeNull();
  });

  it('should require password', () => {
    const passwordControl = component.form.get('password');
    expect(passwordControl?.errors?.['required']).toBeTruthy();
    
    passwordControl?.setValue('password123');
    expect(passwordControl?.errors).toBeNull();
  });

  it('should call authService.login on valid form submit', fakeAsync(() => {
    const mockResponse = {
      user: { id: 1, email: 'test@test.com', name: 'Test', role: 'employee' as const },
      tokens: { accessToken: 'token', refreshToken: 'refresh' }
    };
    authSpy.login.mockReturnValue(of(mockResponse));
    jest.spyOn(router, 'navigate');

    component.form.setValue({ email: 'test@test.com', password: 'password123', rememberMe: false });
    component.onSubmit();
    tick();

    expect(authSpy.login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' });
  }));

  it('should display error message on login failure', fakeAsync(() => {
    authSpy.login.mockReturnValue(throwError(() => ({ message: 'Invalid credentials' })));

    component.form.setValue({ email: 'test@test.com', password: 'wrongpass', rememberMe: false });
    component.onSubmit();
    tick();

    expect(component.errorMessage).toBe('Invalid credentials');
  }));

  it('should not submit if form is invalid', () => {
    component.onSubmit();
    expect(authSpy.login).not.toHaveBeenCalled();
  });
});
