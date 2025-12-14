import { Routes } from '@angular/router';
import { authGuardFn } from '../../guards/auth.guard';

/**
 * Purchases feature routes - lazy loaded
 * All routes require authentication
 */
export const PURCHASES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../page/purchases/purchases.component').then(
        (m) => m.PurchasesComponent
      ),
    canActivate: [authGuardFn],
    title: 'Purchases - FeastFrenzy',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('../../page/purchase-detail/purchase-detail.component').then(
        (m) => m.PurchaseDetailComponent
      ),
    canActivate: [authGuardFn],
    title: 'New Purchase - FeastFrenzy',
  },
  {
    path: 'report',
    loadComponent: () =>
      import('../../page/purchase-report/purchase-report.component').then(
        (m) => m.PurchaseReportComponent
      ),
    canActivate: [authGuardFn],
    title: 'Purchase Report - FeastFrenzy',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('../../page/purchase-detail/purchase-detail.component').then(
        (m) => m.PurchaseDetailComponent
      ),
    canActivate: [authGuardFn],
    title: 'Edit Purchase - FeastFrenzy',
  },
];
