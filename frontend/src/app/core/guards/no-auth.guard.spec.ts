import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { noAuthGuardFn } from './no-auth.guard';
import { AuthService } from '../../service/auth.service';

describe('noAuthGuardFn', () => {
  let authServiceMock: { isAuthenticated: jest.Mock };
  let routerMock: { createUrlTree: jest.Mock };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: jest.fn(),
    };

    routerMock = {
      createUrlTree: jest.fn().mockReturnValue({} as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should return true when user is not authenticated', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    TestBed.runInInjectionContext(() => {
      const result = noAuthGuardFn({} as any, {} as any);
      expect(result).toBe(true);
    });
  });

  it('should redirect to dashboard when user is authenticated', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);

    TestBed.runInInjectionContext(() => {
      const result = noAuthGuardFn({} as any, {} as any);
      expect(result).not.toBe(true);
      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});
