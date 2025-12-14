import { Routes } from '@angular/router';
import { noAuthGuardFn } from '../../core/guards/no-auth.guard';

/**
 * Auth feature routes - lazy loaded
 * All auth routes redirect to dashboard if user is already authenticated
 */
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../../page/login/login.component').then((m) => m.LoginComponent),
    canActivate: [noAuthGuardFn],
    title: 'Login - FeastFrenzy',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('../../page/register/register.component').then(
        (m) => m.RegisterComponent
      ),
    canActivate: [noAuthGuardFn],
    title: 'Register - FeastFrenzy',
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
