import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { TableSkeletonComponent, ErrorStateComponent } from 'src/app/shared/components';
import { environment } from 'src/environments/environment';

/**
 * Product with consumption statistics from backend
 */
interface ProductWithStats {
  id: number;
  name: string;
  price: number;
  orderCount: number;
  totalQuantity: number;
}

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
  products: ProductWithStats[] = [];
  limit = 20;
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadPopularProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPopularProducts(): void {
    this.isLoading = true;
    this.error = null;

    this.http.get<ProductWithStats[]>(`${environment.apiUrl}/products/popular?limit=${this.limit}`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (data) => {
          this.products = data;
        },
        error: (err) => {
          this.error = err.error?.message || err.message || 'Failed to load product report';
        }
      });
  }

  onLimitChange(): void {
    this.loadPopularProducts();
  }

  goBack(): void {
    this.router.navigate(['/products']);
  }
}