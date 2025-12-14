import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { Product } from 'src/app/model/product';
import { ProductService } from 'src/app/service/product.service';
import { PaginationMeta, PAGE_SIZE_OPTIONS, ProductQueryParams } from 'src/app/model/pagination';
import { TableSkeletonComponent, ErrorStateComponent } from 'src/app/shared/components';
import { ToastService } from 'src/app/shared/services';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink,
    TableSkeletonComponent,
    ErrorStateComponent
  ]
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  isLoading = false;
  error: string | null = null;

  
  meta: PaginationMeta = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  
  filters = {
    name: '',
    minPrice: null as number | null,
    maxPrice: null as number | null,
  };

  
  sortField = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';

  
  pageSizeOptions = PAGE_SIZE_OPTIONS;

  private destroy$ = new Subject<void>();
  private filterSubject$ = new Subject<void>();

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    
    this.filterSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.meta.page = 1; 
      this.loadProducts();
    });

    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = null;

    const params: ProductQueryParams = {
      page: this.meta.page,
      limit: this.meta.limit,
      sort: this.buildSortString(),
    };

    
    if (this.filters.name) {
      params.name = this.filters.name;
    }
    if (this.filters.minPrice !== null) {
      params.minPrice = this.filters.minPrice;
    }
    if (this.filters.maxPrice !== null) {
      params.maxPrice = this.filters.maxPrice;
    }

    this.productService.getProducts(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.products = response.data;
          this.meta = response.meta;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load products';
          this.isLoading = false;
        }
      });
  }

  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.meta.totalPages) {
      this.meta.page = page;
      this.loadProducts();
    }
  }

  previousPage(): void {
    if (this.meta.hasPrevPage) {
      this.goToPage(this.meta.page - 1);
    }
  }

  nextPage(): void {
    if (this.meta.hasNextPage) {
      this.goToPage(this.meta.page + 1);
    }
  }

  onPageSizeChange(newSize: number): void {
    this.meta.limit = newSize;
    this.meta.page = 1; 
    this.loadProducts();
  }

  
  sortBy(field: string): void {
    if (this.sortField === field) {
      
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.loadProducts();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  private buildSortString(): string {
    const prefix = this.sortDirection === 'desc' ? '-' : '';
    return `${prefix}${this.sortField}`;
  }

  
  onFilterChange(): void {
    this.filterSubject$.next();
  }

  clearFilters(): void {
    this.filters = {
      name: '',
      minPrice: null,
      maxPrice: null,
    };
    this.meta.page = 1;
    this.loadProducts();
  }

  
  deleteProduct(product: Product): void {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    this.productService.deleteProduct(product.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          
          this.loadProducts();
        },
        error: (err) => {
          this.error = err.message || 'Failed to delete product';
        }
      });
  }

  trackByProductId(index: number, product: Product): number {
    return product.id;
  }

  
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const current = this.meta.page;
    const total = this.meta.totalPages;
    
    
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}