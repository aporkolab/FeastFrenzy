import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Employee } from 'src/app/model/employee';
import { EmployeeService } from 'src/app/service/employee.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-employee-detail',
  templateUrl: './employee-detail.component.html',
  styleUrls: ['./employee-detail.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink]
})
export class EmployeeDetailComponent implements OnInit, OnDestroy {
  employee: Employee | null = null;
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEmployee();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEmployee(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (!idParam) {
      this.error = 'No employee ID provided';
      return;
    }

    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      this.error = 'Invalid employee ID';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.employeeService.getEmployee(id)
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

  goBack(): void {
    this.router.navigate(['/employees']);
  }
}