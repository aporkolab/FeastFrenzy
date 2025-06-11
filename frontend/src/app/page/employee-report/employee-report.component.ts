import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, forkJoin, debounceTime } from 'rxjs';
import { Employee } from 'src/app/model/employee';
import { EmployeeSummary } from 'src/app/model/purchase';
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
  month: number;
  year: number;
  // Use employee ID as key for O(1) lookup - populated from backend aggregation
  employeePurchases: Map<number, number> = new Map();

  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();
  private filterChange$ = new Subject<void>();

  constructor(
    private employeeService: EmployeeService,
    private purchaseService: PurchaseService
  ) {
    const currentDate = new Date();
    this.month = currentDate.getMonth();
    this.year = currentDate.getFullYear();
  }

  ngOnInit(): void {
    // Debounce filter changes to prevent rapid API calls when typing year
    this.filterChange$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadData();
    });

    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get date range for the selected month
   * Uses local date formatting to avoid timezone issues
   */
  private getDateRange(): { dateFrom: string; dateTo: string } {
    const dateFrom = new Date(this.year, this.month, 1);
    const dateTo = new Date(this.year, this.month + 1, 0); // Last day of month

    return {
      dateFrom: this.formatDate(dateFrom),
      dateTo: this.formatDate(dateTo)
    };
  }

  /**
   * Format date as YYYY-MM-DD without timezone conversion
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    const { dateFrom, dateTo } = this.getDateRange();

    forkJoin({
      employees: this.employeeService.getAllEmployees(),
      // Use optimized backend aggregation instead of fetching all purchases
      summaries: this.purchaseService.getEmployeeSummaries({ dateFrom, dateTo })
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        this.employees = result.employees;
        this.processEmployeeSummaries(result.summaries);
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load report data';
        this.isLoading = false;
      }
    });
  }

  /**
   * Process pre-aggregated summaries from backend
   * Much faster than client-side aggregation of all purchases
   */
  private processEmployeeSummaries(summaries: EmployeeSummary[]): void {
    this.employeePurchases.clear();

    // Initialize all employees with 0 spending
    this.employees.forEach(employee => this.employeePurchases.set(employee.id, 0));

    // Apply backend-aggregated summaries - O(n) with no calculation needed
    summaries.forEach(summary => {
      this.employeePurchases.set(summary.employeeId, summary.totalSpending);
    });
  }

  onMonthChange(): void {
    // Debounced reload when month/year changes
    this.filterChange$.next();
  }

  /**
   * Get spending for an employee by ID - used in template
   */
  getSpending(employeeId: number): number {
    return this.employeePurchases.get(employeeId) || 0;
  }
}