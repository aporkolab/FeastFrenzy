import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { User, AuthResponse, TokenResponse } from '../model/auth';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;
  const apiUrl = `${environment.apiUrl}/auth`;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'employee'
  };

  const mockTokens: TokenResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  };

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    tokens: mockTokens
  };

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: {} as any }]),
        AuthService
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should successfully login and store tokens', fakeAsync(() => {
      const credentials = { email: 'test@example.com', password: 'password123' };

      service.login(credentials).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockAuthResponse);
      tick();

      expect(localStorage.getItem('accessToken')).toBe(mockTokens.accessToken);
      expect(localStorage.getItem('refreshToken')).toBe(mockTokens.refreshToken);
      expect(service.getCurrentUser()).toEqual(mockUser);
    }));

    it('should handle login failure with error message', fakeAsync(() => {
      const credentials = { email: 'test@example.com', password: 'wrongpassword' };
      let errorThrown = false;

      service.login(credentials).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          errorThrown = true;
          expect(error.message).toBe('Invalid credentials');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(errorThrown).toBe(true);
    }));
  });

  describe('register', () => {
    it('should successfully register and store tokens', fakeAsync(() => {
      const registerData = { name: 'New User', email: 'new@example.com', password: 'Password123' };

      service.register(registerData).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerData);
      req.flush(mockAuthResponse);
      tick();

      expect(localStorage.getItem('accessToken')).toBe(mockTokens.accessToken);
    }));
  });

  describe('logout', () => {
    it('should clear all auth data on logout', fakeAsync(() => {
      localStorage.setItem('accessToken', mockTokens.accessToken);
      localStorage.setItem('refreshToken', mockTokens.refreshToken);
      localStorage.setItem('currentUser', JSON.stringify(mockUser));

      jest.spyOn(router, 'navigate');

      service.logout();

      const req = httpMock.expectOne(`${apiUrl}/logout`);
      req.flush({ message: 'Logged out successfully' });
      tick();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('currentUser')).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    }));
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', fakeAsync(() => {
      localStorage.setItem('refreshToken', mockTokens.refreshToken);

      const newTokens: TokenResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      service.refreshToken().subscribe(tokens => {
        expect(tokens).toEqual(newTokens);
      });

      const req = httpMock.expectOne(`${apiUrl}/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: mockTokens.refreshToken });
      req.flush(newTokens);
      tick();

      expect(localStorage.getItem('accessToken')).toBe(newTokens.accessToken);
      expect(localStorage.getItem('refreshToken')).toBe(newTokens.refreshToken);
    }));

    it('should fail if no refresh token available', fakeAsync(() => {
      let errorThrown = false;

      service.refreshToken().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          errorThrown = true;
          expect(error.message).toBe('No refresh token available');
        }
      });

      tick();
      expect(errorThrown).toBe(true);
    }));
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', () => {
      localStorage.setItem('accessToken', mockTokens.accessToken);
      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      
      service = new AuthService(TestBed.inject(HttpTestingController) as any, router);
      (service as any).currentUserSubject.next(mockUser);
      
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when no token', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return false when no user', () => {
      localStorage.setItem('accessToken', mockTokens.accessToken);
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', () => {
      (service as any).currentUserSubject.next(mockUser);
      expect(service.hasRole('employee')).toBe(true);
    });

    it('should return true when user has any of multiple roles', () => {
      const adminUser: User = { ...mockUser, role: 'admin' };
      (service as any).currentUserSubject.next(adminUser);
      expect(service.hasRole('admin', 'manager')).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      (service as any).currentUserSubject.next(mockUser);
      expect(service.hasRole('admin')).toBe(false);
    });

    it('should return false when no user is logged in', () => {
      expect(service.hasRole('admin')).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('accessToken', 'test-token');
      expect(service.getAccessToken()).toBe('test-token');
    });

    it('should return null when no token', () => {
      expect(service.getAccessToken()).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user from subject', () => {
      (service as any).currentUserSubject.next(mockUser);
      expect(service.getCurrentUser()).toEqual(mockUser);
    });

    it('should return null when no user', () => {
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('currentUser$', () => {
    it('should emit user changes', fakeAsync(() => {
      let emittedUser: User | null = null;
      
      service.currentUser$.subscribe(user => {
        emittedUser = user;
      });

      (service as any).currentUserSubject.next(mockUser);
      tick();

      expect(emittedUser).toEqual(mockUser as any);
    }));
  });

  describe('loadStoredUser', () => {
    it('should load user from localStorage on service init', () => {
      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      const newService = new AuthService(TestBed.inject(HttpTestingController) as any, router);
      expect(newService.getCurrentUser()).toEqual(mockUser);
    });

    it('should clear auth data if stored user is invalid JSON', () => {
      localStorage.setItem('currentUser', 'invalid-json');
      localStorage.setItem('accessToken', 'some-token');
      new AuthService(TestBed.inject(HttpTestingController) as any, router);
      expect(localStorage.getItem('currentUser')).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle 409 conflict error', fakeAsync(() => {
      const registerData = { name: 'Test', email: 'existing@example.com', password: 'Pass123' };
      let errorMessage = '';

      service.register(registerData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          errorMessage = error.message;
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      req.flush({ message: 'Email already registered' }, { status: 409, statusText: 'Conflict' });
      tick();

      expect(errorMessage).toBe('Email already registered');
    }));

    it('should handle 423 locked account error', fakeAsync(() => {
      const credentials = { email: 'locked@example.com', password: 'password' };
      let errorMessage = '';

      service.login(credentials).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          errorMessage = error.message;
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush({ message: 'Account locked. Try again in 15 minutes' }, { status: 423, statusText: 'Locked' });
      tick();

      expect(errorMessage).toBe('Account locked. Try again in 15 minutes');
    }));
  });
});
