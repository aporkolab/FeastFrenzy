import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


import { LoginComponent } from './page/login/login.component';
import { RegisterComponent } from './page/register/register.component';
import { DashboardComponent } from './page/dashboard/dashboard.component';
import { UnauthorizedComponent } from './page/unauthorized/unauthorized.component';
import { EmployeesComponent } from './page/employees/employees.component';
import { EmployeeDetailComponent } from './page/employee-detail/employee-detail.component';
import { ProductsComponent } from './page/products/products.component';
import { ProductDetailComponent } from './page/product-detail/product-detail.component';
import { PurchasesComponent } from './page/purchases/purchases.component';
import { PurchaseDetailComponent } from './page/purchase-detail/purchase-detail.component';
import { PurchaseReportComponent } from './page/purchase-report/purchase-report.component';
import { EmployeeReportComponent } from './page/employee-report/employee-report.component';
import { ProductReportComponent } from './page/product-report/product-report.component';
import { PageNotFoundComponent } from './page/page-not-found/page-not-found.component';


import { authGuardFn } from './guards/auth.guard';
import { roleGuardFn } from './guards/role.guard';

const routes: Routes = [
  
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },

  
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [authGuardFn]
  },
  { 
    path: 'products', 
    component: ProductsComponent,
    canActivate: [authGuardFn]
  },
  { 
    path: 'products/:id', 
    component: ProductDetailComponent,
    canActivate: [authGuardFn]
  },
  { 
    path: 'purchases', 
    component: PurchasesComponent,
    canActivate: [authGuardFn]
  },
  { 
    path: 'purchase/:id', 
    component: PurchaseDetailComponent,
    canActivate: [authGuardFn]
  },

  
  { 
    path: 'employees', 
    component: EmployeesComponent,
    canActivate: [authGuardFn, roleGuardFn],
    data: { roles: ['admin', 'manager'] }
  },
  { 
    path: 'employees/:id', 
    component: EmployeeDetailComponent,
    canActivate: [authGuardFn, roleGuardFn],
    data: { roles: ['admin', 'manager'] }
  },

  
  { 
    path: 'purchase-report', 
    component: PurchaseReportComponent,
    canActivate: [authGuardFn]
  },
  { 
    path: 'employee-report', 
    component: EmployeeReportComponent,
    canActivate: [authGuardFn, roleGuardFn],
    data: { roles: ['admin', 'manager'] }
  },
  { 
    path: 'product-report', 
    component: ProductReportComponent,
    canActivate: [authGuardFn]
  },

  
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  
  
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }


export { routes };
