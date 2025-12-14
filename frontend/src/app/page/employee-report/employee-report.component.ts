import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { Employee } from 'src/app/model/employee';
import { Purchase } from 'src/app/model/purchase';
import { EmployeeService } from 'src/app/service/employee.service';
import { PurchaseService } from 'src/app/service/purchase.service';
import { TableSkeletonComponent, ErrorStateComponent } from 'src/app/shared/components';

@Component({
  selector: 'app-employee-report',
  templateUrl: './employee-report.component.html',
  styleUrls: ['./employee-report.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    RouterLink,
    TableSkeletonComponent,
    ErrorStateComponent
  ]
})
export class EmployeeReportComponent implements OnInit, OnDestroy {
  employees: Employee[] = [];
  purchases: Purchase[] = [];
  month: number;
  year: number;
  employeePurchases: Map<Employee, number> = new Map();
  
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private employeeService: EmployeeService, 
    private purchaseService: PurchaseService
  ) {
    const currentDate = new Date();
    this.month = currentDate.getMonth();
    this.year = currentDate.getFullYear();
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      employees: this.employeeService.getAllEmployees(),
      purchases: this.purchaseService.getAllPurchases()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        this.employees = result.employees;
        this.purchases = result.purchases;
        this.calculateEmployeePurchases();
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load report data';
        this.isLoading = false;
      }
    });
  }

  calculateEmployeePurchases(): void {
    this.employeePurchases.clear();
    this.employees.forEach(employee => this.employeePurchases.set(employee, 0));
    this.purchases.forEach(purchase => {
      const purchaseDate = new Date(purchase.date);
      if (purchaseDate.getMonth() === this.month && purchaseDate.getFullYear() === this.year) {
        const employee = this.employees.find(e => e.id === purchase.employeeId);
        if (employee) {
          this.employeePurchases.set(employee, this.employeePurchases.get(employee)! + (purchase.total || 0));
        }
      }
    });
  }

  onMonthChange(): void {
    this.calculateEmployeePurchases();
  }
}