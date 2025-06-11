import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from 'src/app/model/employee';
import { EmployeeService } from 'src/app/service/employee.service';
import { TableSkeletonComponent, ErrorStateComponent, ModalComponent } from 'src/app/shared/components';
import { ToastService } from 'src/app/shared/services';
import { EmployeeFormComponent } from 'src/app/features/employees/components';

@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableSkeletonComponent,
    ErrorStateComponent,
    ModalComponent,
    EmployeeFormComponent
  ]
})
export class EmployeesComponent implements OnInit, OnDestroy {
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  monthlyConsumptionValue = 0;
  isLoading = false;
  error: string | null = null;

  // Filters
  filters = {
    name: '',
    employeeNumber: '',
  };

  // Sorting
  sortField = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Modal state
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedEmployee: Employee | null = null;
  isSaving = false;

  private destroy$ = new Subject<void>();
  private filterSubject$ = new Subject<void>();

  constructor(
    private employeeService: EmployeeService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Filter changes trigger filtering after debounce
    this.filterSubject$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });

    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== DATA LOADING ====================

  loadEmployees(): void {
    this.isLoading = true;
    this.error = null;

    this.employeeService.getAllEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employees) => {
          this.employees = employees;
          this.applyFilters();
          this.calculateMonthlyConsumptionValue();
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load employees';
          this.isLoading = false;
        }
      });
  }

  // ==================== FILTERING ====================

  onFilterChange(): void {
    this.filterSubject$.next();
  }

  clearFilters(): void {
    this.filters = {
      name: '',
      employeeNumber: '',
    };
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = [...this.employees];

    // Filter by name
    if (this.filters.name?.trim()) {
      const searchTerm = this.filters.name.toLowerCase().trim();
      result = result.filter(e => e.name.toLowerCase().includes(searchTerm));
    }

    // Filter by employee number
    if (this.filters.employeeNumber?.trim()) {
      const searchTerm = this.filters.employeeNumber.toLowerCase().trim();
      result = result.filter(e => e.employee_number.toLowerCase().includes(searchTerm));
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: any = a[this.sortField as keyof Employee];
      let bVal: any = b[this.sortField as keyof Employee];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredEmployees = result;
  }

  // ==================== SORTING ====================

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // ==================== CALCULATIONS ====================

  calculateMonthlyConsumptionValue(): void {
    this.monthlyConsumptionValue = this.employees.reduce(
      (total, employee) => total + employee.monthlyConsumptionValue,
      0
    );
  }

  // ==================== MODAL CRUD ====================

  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedEmployee = null;
    this.showModal = true;
  }

  openEditModal(employee: Employee): void {
    this.modalMode = 'edit';
    this.selectedEmployee = employee;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedEmployee = null;
    this.isSaving = false;
  }

  onSave(dto: CreateEmployeeDto | UpdateEmployeeDto): void {
    this.isSaving = true;

    if (this.modalMode === 'create') {
      this.employeeService.createEmployee(dto as CreateEmployeeDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (employee) => {
            this.toastService.success(`Employee "${employee.name}" created successfully`);
            this.closeModal();
            this.loadEmployees();
          },
          error: (err) => {
            this.isSaving = false;
            this.toastService.error(err.message || 'Failed to create employee');
          }
        });
    } else if (this.selectedEmployee) {
      this.employeeService.updateEmployee(this.selectedEmployee.id, dto as UpdateEmployeeDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (employee) => {
            this.toastService.success(`Employee "${employee.name}" updated successfully`);
            this.closeModal();
            this.loadEmployees();
          },
          error: (err) => {
            this.isSaving = false;
            this.toastService.error(err.message || 'Failed to update employee');
          }
        });
    }
  }

  // ==================== DELETE ====================

  deleteEmployee(employee: Employee): void {
    if (!confirm(`Are you sure you want to delete "${employee.name}"?`)) {
      return;
    }

    this.employeeService.deleteEmployee(employee.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success(`Employee "${employee.name}" deleted successfully`);
          this.loadEmployees();
        },
        error: (err) => {
          const errorMsg = err.message || 'Failed to delete employee';
          this.error = errorMsg;
          this.toastService.error(errorMsg);
        }
      });
  }

  // ==================== HELPERS ====================

  trackByEmployeeId(index: number, employee: Employee): number {
    return employee.id;
  }

  get modalTitle(): string {
    return this.modalMode === 'create' ? 'Add New Employee' : `Edit Employee: ${this.selectedEmployee?.name}`;
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.name?.trim() || this.filters.employeeNumber?.trim());
  }
}
