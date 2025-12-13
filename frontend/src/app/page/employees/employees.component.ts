import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Employee } from 'src/app/model/employee';
import { EmployeeService } from 'src/app/service/employee.service';

@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EmployeesComponent implements OnInit, OnDestroy {
  employees: Employee[] = [];
  monthlyConsumptionValue = 0;
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private employeeService: EmployeeService) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.error = null;

    this.employeeService.getEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employees) => {
          this.employees = employees;
          this.calculateMonthlyConsumptionValue();
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load employees';
          this.isLoading = false;
        }
      });
  }

  calculateMonthlyConsumptionValue(): void {
    this.monthlyConsumptionValue = this.employees.reduce(
      (total, employee) => total + employee.monthlyConsumptionValue,
      0
    );
  }

  deleteEmployee(employee: Employee): void {
    if (!confirm(`Are you sure you want to delete "${employee.name}"?`)) {
      return;
    }

    this.employeeService.deleteEmployee(employee.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.employees = this.employees.filter(e => e.id !== employee.id);
          this.calculateMonthlyConsumptionValue();
        },
        error: (err) => {
          this.error = err.message || 'Failed to delete employee';
        }
      });
  }

  trackByEmployeeId(index: number, employee: Employee): number {
    return employee.id;
  }
}