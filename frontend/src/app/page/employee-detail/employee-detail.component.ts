import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from 'src/app/model/employee';
import { EmployeeService } from 'src/app/service/employee.service';
import { FormSkeletonComponent, ErrorStateComponent } from 'src/app/shared/components';
import { ToastService } from 'src/app/shared/services';
import { EmployeeFormComponent } from 'src/app/features/employees/components';

type ViewMode = 'view' | 'create' | 'edit';

@Component({
  selector: 'app-employee-detail',
  templateUrl: './employee-detail.component.html',
  styleUrls: ['./employee-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormSkeletonComponent,
    ErrorStateComponent,
    EmployeeFormComponent
  ]
})
export class EmployeeDetailComponent implements OnInit, OnDestroy {
  employee: Employee | null = null;
  isLoading = false;
  isSaving = false;
  error: string | null = null;
  mode: ViewMode = 'view';
  
  private destroy$ = new Subject<void>();

  constructor(
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Subscribe to route params reactively - fixes spinner issue on navigation
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params.get('id');
      const path = this.route.snapshot.routeConfig?.path;

      // Reset state on route change
      this.employee = null;
      this.error = null;
      this.isLoading = false;

      if (path === 'new' || !id) {
        this.mode = 'create';
      } else {
        this.mode = 'edit';
        this.loadEmployee(+id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load employee from API
   */
  loadEmployee(id?: number): void {
    const employeeId = id ?? this.employee?.id;
    if (!employeeId) {
      this.error = 'Employee ID not found';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.employeeService.getEmployee(employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          this.employee = employee;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load employee';
          this.isLoading = false;
        }
      });
  }

  /**
   * Handle form save event
   */
  onSave(dto: CreateEmployeeDto | UpdateEmployeeDto): void {
    if (this.mode === 'create') {
      this.createEmployee(dto as CreateEmployeeDto);
    } else {
      this.updateEmployee(dto as UpdateEmployeeDto);
    }
  }

  /**
   * Create new employee
   */
  private createEmployee(dto: CreateEmployeeDto): void {
    this.isSaving = true;

    this.employeeService.createEmployee(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          this.isSaving = false;
          this.toastService.success(`Employee "${employee.name}" created successfully!`);
          this.router.navigate(['/employees', employee.id]);
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.message || 'Failed to create employee');
        }
      });
  }

  /**
   * Update existing employee
   */
  private updateEmployee(dto: UpdateEmployeeDto): void {
    if (!this.employee?.id) return;

    this.isSaving = true;

    this.employeeService.updateEmployee(this.employee.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          this.isSaving = false;
          this.employee = employee;
          this.toastService.success(`Employee "${employee.name}" updated successfully!`);
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.message || 'Failed to update employee');
        }
      });
  }

  /**
   * Handle form cancel
   */
  onCancel(): void {
    this.goBack();
  }

  /**
   * Navigate back
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Get page title based on mode
   */
  get pageTitle(): string {
    switch (this.mode) {
      case 'create':
        return 'Add New Employee';
      case 'edit':
        return `Edit Employee${this.employee ? `: ${this.employee.name}` : ''}`;
      default:
        return 'Employee Details';
    }
  }
}
