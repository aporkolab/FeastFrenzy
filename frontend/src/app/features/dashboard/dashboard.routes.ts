import { Routes } from '@angular/router';
import { authGuardFn } from '../../guards/auth.guard';

/**
 * Dashboard feature routes - lazy loaded
 * Main landing page after authentication
 */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../page/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [authGuardFn],
    title: 'Dashboard - FeastFrenzy',
  },
];
