import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';

/**
 * Guard that prevents authenticated users from accessing auth pages (login, register).
 * Redirects to dashboard if already logged in.
 */
export const noAuthGuardFn: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Already logged in - redirect to dashboard
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
