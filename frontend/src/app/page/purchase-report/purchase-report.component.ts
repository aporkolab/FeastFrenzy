import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, finalize } from 'rxjs';
import { Purchase } from 'src/app/model/purchase';
import { TableSkeletonComponent, ErrorStateComponent } from 'src/app/shared/components';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-purchase-report',
  templateUrl: './purchase-report.component.html',
  styleUrls: ['./purchase-report.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    RouterLink,
    TableSkeletonComponent,
    ErrorStateComponent
  ]
})
export class PurchaseReportComponent implements OnInit, OnDestroy {
  purchases: Purchase[] = [];
  selectedMonth = '';
  isLoading = false;
  error: string | null = null;
  hasSearched = false;

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getPurchaseReport(): void {
    if (!this.selectedMonth) {
      this.error = 'Please select a month';
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.hasSearched = true;

    this.http.get<Purchase[]>(`${environment.apiUrl}/purchases?month=${this.selectedMonth}`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (data) => {
          this.purchases = data.sort((a, b) => b.total - a.total);
        },
        error: (err) => {
          this.error = err.message || 'Failed to load purchase report';
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}