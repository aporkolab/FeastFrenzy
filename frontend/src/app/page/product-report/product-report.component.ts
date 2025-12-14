import { Product } from './../../model/product';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { TableSkeletonComponent, ErrorStateComponent } from 'src/app/shared/components';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-product-report',
  templateUrl: './product-report.component.html',
  styleUrls: ['./product-report.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    TableSkeletonComponent,
    ErrorStateComponent
  ]
})
export class ProductReportComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  selectedMonth = '';
  isLoading = false;
  error: string | null = null;
  hasSearched = false;

  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getProductReport(): void {
    if (!this.selectedMonth) {
      this.error = 'Please select a month';
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.hasSearched = true;

    this.http.get<Product[]>(`${environment.apiUrl}/products?month=${this.selectedMonth}`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (data) => {
          this.products = data;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load product report';
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}