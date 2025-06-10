import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { Product, CreateProductDto, UpdateProductDto } from 'src/app/model/product';
import { ProductService } from 'src/app/service/product.service';
import { PaginationMeta, PAGE_SIZE_OPTIONS, ProductQueryParams } from 'src/app/model/pagination';
import { TableSkeletonComponent, ErrorStateComponent, ModalComponent } from 'src/app/shared/components';
import { ToastService } from 'src/app/shared/services';
import { ProductFormComponent } from 'src/app/features/products/components';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableSkeletonComponent,
    ErrorStateComponent,
    ModalComponent,
    ProductFormComponent
  ]
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  isLoading = false;
  error: string | null = null;

  // Pagination
  meta: PaginationMeta = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Filters (string type for price allows empty string from HTML input)
  filters: {
    name: string;
    minPrice: number | string | null;
    maxPrice: number | string | null;
  } = {
    name: '',
    minPrice: null,
    maxPrice: null,
  };

  // Sorting
  sortField = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Page size options
  pageSizeOptions = PAGE_SIZE_OPTIONS;

  // Modal state
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedProduct: Product | null = null;
  isSaving = false;

  private destroy$ = new Subject<void>();
  private filterSubject$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Filter changes trigger reload after debounce
    this.filterSubject$.pipe(
      debounceTime(300),
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

  // ==================== DATA LOADING ====================

  loadProducts(): void {
    this.isLoading = true;
    this.error = null;

    const params: ProductQueryParams = {
      page: this.meta.page,
      limit: this.meta.limit,
      sort: this.buildSortString(),
    };

    // Add filters only if they have valid values
    if (this.filters.name?.trim()) {
      params.name = this.filters.name.trim();
    }
    if (this.filters.minPrice != null && this.filters.minPrice !== '') {
      params.minPrice = Number(this.filters.minPrice);
    }
    if (this.filters.maxPrice != null && this.filters.maxPrice !== '') {
      params.maxPrice = Number(this.filters.maxPrice);
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

  // ==================== PAGINATION ====================

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

  // ==================== SORTING ====================

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

  // ==================== FILTERING ====================

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

  // ==================== MODAL CRUD ====================

  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedProduct = null;
    this.showModal = true;
  }

  openEditModal(product: Product): void {
    this.modalMode = 'edit';
    this.selectedProduct = product;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedProduct = null;
    this.isSaving = false;
  }

  onSave(dto: CreateProductDto | UpdateProductDto): void {
    this.isSaving = true;

    if (this.modalMode === 'create') {
      this.productService.createProduct(dto as CreateProductDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (product) => {
            this.toastService.success(`Product "${product.name}" created successfully`);
            this.closeModal();
            this.loadProducts();
          },
          error: (err) => {
            this.isSaving = false;
            this.toastService.error(err.message || 'Failed to create product');
          }
        });
    } else if (this.selectedProduct) {
      this.productService.updateProduct(this.selectedProduct.id, dto as UpdateProductDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (product) => {
            this.toastService.success(`Product "${product.name}" updated successfully`);
            this.closeModal();
            this.loadProducts();
          },
          error: (err) => {
            this.isSaving = false;
            this.toastService.error(err.message || 'Failed to update product');
          }
        });
    }
  }

  // ==================== DELETE ====================

  deleteProduct(product: Product): void {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    this.productService.deleteProduct(product.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success(`Product "${product.name}" deleted successfully`);
          this.loadProducts();
        },
        error: (err) => {
          const errorMsg = err.message || 'Failed to delete product';
          this.error = errorMsg;
          this.toastService.error(errorMsg);
        }
      });
  }

  // ==================== HELPERS ====================

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

  get modalTitle(): string {
    return this.modalMode === 'create' ? 'Add New Product' : `Edit Product: ${this.selectedProduct?.name}`;
  }
}
