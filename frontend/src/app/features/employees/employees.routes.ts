import { Routes } from '@angular/router';
import { authGuardFn } from '../../guards/auth.guard';
import { roleGuardFn } from '../../guards/role.guard';

/**
 * Employees feature routes - lazy loaded
 * All routes require authentication + admin/manager role
 */
export const EMPLOYEES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../page/employees/employees.component').then(
        (m) => m.EmployeesComponent
      ),
    canActivate: [authGuardFn, roleGuardFn],
    data: { roles: ['admin', 'manager'] },
    title: 'Employees - FeastFrenzy',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('../../page/employee-detail/employee-detail.component').then(
        (m) => m.EmployeeDetailComponent
      ),
    canActivate: [authGuardFn, roleGuardFn],
    data: { roles: ['admin', 'manager'] },
    title: 'New Employee - FeastFrenzy',
  },
  {
    path: 'report',
    loadComponent: () =>
      import('../../page/employee-report/employee-report.component').then(
        (m) => m.EmployeeReportComponent
      ),
    canActivate: [authGuardFn, roleGuardFn],
    data: { roles: ['admin', 'manager'] },
    title: 'Employee Report - FeastFrenzy',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('../../page/employee-detail/employee-detail.component').then(
        (m) => m.EmployeeDetailComponent
      ),
    canActivate: [authGuardFn, roleGuardFn],
    data: { roles: ['admin', 'manager'] },
    title: 'Edit Employee - FeastFrenzy',
  },
];
