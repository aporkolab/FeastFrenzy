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
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['register']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form when empty', () => {
    expect(component.registerForm.valid).toBe(false);
  });

  it('should validate name is required', () => {
    const nameControl = component.registerForm.get('name');
    expect(nameControl?.errors?.['required']).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component.registerForm.get('email');
    emailControl?.setValue('invalid');
    expect(emailControl?.errors?.['email']).toBeTruthy();
  });

  it('should validate password minimum length', () => {
    const passwordControl = component.registerForm.get('password');
    passwordControl?.setValue('123');
    expect(passwordControl?.errors?.['minlength']).toBeTruthy();
  });

  it('should call authService.register on valid submit', fakeAsync(() => {
    const mockResponse = {
      user: { id: 1, email: 'new@test.com', name: 'New User', role: 'employee' as const },
      tokens: { accessToken: 'token', refreshToken: 'refresh' }
    };
    authService.register.and.returnValue(of(mockResponse));
    jest.spyOn(router, 'navigate');

    component.registerForm.setValue({
      name: 'New User',
      email: 'new@test.com',
      password: 'Password123'
    });
    component.onSubmit();
    tick();

    expect(authService.register).toHaveBeenCalled();
  }));

  it('should show error on registration failure', fakeAsync(() => {
    authService.register.and.returnValue(throwError(() => ({ message: 'Email exists' })));

    component.registerForm.setValue({
      name: 'Test',
      email: 'exists@test.com',
      password: 'Password123'
    });
    component.onSubmit();
    tick();

    expect(component.errorMessage).toBe('Email exists');
  }));
});
