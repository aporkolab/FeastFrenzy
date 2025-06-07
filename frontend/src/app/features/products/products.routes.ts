import { Routes } from '@angular/router';
import { authGuardFn } from '../../guards/auth.guard';

/**
 * Products feature routes - lazy loaded
 * All routes require authentication
 */
export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../page/products/products.component').then(
        (m) => m.ProductsComponent
      ),
    canActivate: [authGuardFn],
    title: 'Products - FeastFrenzy',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('../../page/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent
      ),
    canActivate: [authGuardFn],
    title: 'New Product - FeastFrenzy',
  },
  {
    path: 'report',
    loadComponent: () =>
      import('../../page/product-report/product-report.component').then(
        (m) => m.ProductReportComponent
      ),
    canActivate: [authGuardFn],
    title: 'Product Report - FeastFrenzy',
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('../../page/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent
      ),
    canActivate: [authGuardFn],
    title: 'Edit Product - FeastFrenzy',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('../../page/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent
      ),
    canActivate: [authGuardFn],
    title: 'View Product - FeastFrenzy',
  },
];
