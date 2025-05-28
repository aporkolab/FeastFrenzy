import { Routes } from '@angular/router';

/**
 * Main application routes with lazy loading.
 *
 * Route structure:
 * - /auth/* - Login, Register (lazy loaded, no-auth guard)
 * - /dashboard - Main landing page (lazy loaded, requires auth)
 * - /products/* - Product CRUD + report (lazy loaded, requires auth)
 * - /employees/* - Employee CRUD + report (lazy loaded, requires auth + role)
 * - /purchases/* - Purchase CRUD + report (lazy loaded, requires auth)
 * - /unauthorized - 403 page
 * - /** - 404 page
 *
 * Preloading strategy:
 * - Dashboard: preloaded immediately (most common destination)
 * - Products: preloaded with 1s delay (frequently accessed)
 * - Others: loaded on demand
 */
export const routes: Routes = [
  // Auth routes - login, register
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  // Legacy support - redirect old paths to new auth paths
  { path: 'login', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: 'register', redirectTo: '/auth/register', pathMatch: 'full' },

  // Main application routes - all require authentication
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        (m) => m.DASHBOARD_ROUTES
      ),
    data: { preload: true }, // Preload immediately - main landing page
  },
  {
    path: 'products',
    loadChildren: () =>
      import('./features/products/products.routes').then(
        (m) => m.PRODUCTS_ROUTES
      ),
    data: { preload: true, preloadDelay: 1000 }, // Preload after 1s
  },
  // Legacy support for old product-report path
  { path: 'product-report', redirectTo: '/products/report', pathMatch: 'full' },

  {
    path: 'employees',
    loadChildren: () =>
      import('./features/employees/employees.routes').then(
        (m) => m.EMPLOYEES_ROUTES
      ),
    // No preload - admin/manager only
  },
  // Legacy support for old employee-report path
  { path: 'employee-report', redirectTo: '/employees/report', pathMatch: 'full' },

  {
    path: 'purchases',
    loadChildren: () =>
      import('./features/purchases/purchases.routes').then(
        (m) => m.PURCHASES_ROUTES
      ),
    data: { preload: true, preloadDelay: 2000 }, // Preload after 2s
  },
  // Legacy support for old purchase paths
  { path: 'purchase/:id', redirectTo: '/purchases/:id', pathMatch: 'full' },
  { path: 'purchase-report', redirectTo: '/purchases/report', pathMatch: 'full' },

  // Utility routes - eagerly loaded (small components)
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./page/unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent
      ),
    title: 'Unauthorized - FeastFrenzy',
  },

  // Default redirect
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // 404 - catch all
  {
    path: '**',
    loadComponent: () =>
      import('./page/page-not-found/page-not-found.component').then(
        (m) => m.PageNotFoundComponent
      ),
    title: '404 - FeastFrenzy',
  },
];

// Legacy NgModule support - can be removed after full migration
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
