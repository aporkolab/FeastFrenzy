import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Product, CreateProductDto, UpdateProductDto } from 'src/app/model/product';
import { ProductService } from 'src/app/service/product.service';
import { CardSkeletonComponent, ErrorStateComponent } from 'src/app/shared/components';
import { ToastService } from 'src/app/shared/services';
import { ProductFormComponent } from 'src/app/features/products/components';

type ViewMode = 'view' | 'create' | 'edit';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardSkeletonComponent,
    ErrorStateComponent,
    ProductFormComponent
  ]
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  isLoading = false;
  isSaving = false;
  error: string | null = null;
  mode: ViewMode = 'view';
  
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
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
      this.product = null;
      this.error = null;
      this.isLoading = false;

      if (path === 'new' || !id) {
        this.mode = 'create';
      } else {
        this.mode = 'edit';
        this.loadProduct(+id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load product from API
   */
  loadProduct(id?: number): void {
    const productId = id ?? this.product?.id;
    if (!productId) {
      this.error = 'Product ID not found';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.productService.getProduct(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          this.product = product;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load product';
          this.isLoading = false;
        }
      });
  }

  /**
   * Handle form save event
   */
  onSave(dto: CreateProductDto | UpdateProductDto): void {
    if (this.mode === 'create') {
      this.createProduct(dto as CreateProductDto);
    } else {
      this.updateProduct(dto as UpdateProductDto);
    }
  }

  /**
   * Create new product
   */
  private createProduct(dto: CreateProductDto): void {
    this.isSaving = true;

    this.productService.createProduct(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          this.isSaving = false;
          this.toastService.success(`Product "${product.name}" created successfully!`);
          this.router.navigate(['/products', product.id]);
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.message || 'Failed to create product');
        }
      });
  }

  /**
   * Update existing product
   */
  private updateProduct(dto: UpdateProductDto): void {
    if (!this.product?.id) return;

    this.isSaving = true;

    this.productService.updateProduct(this.product.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          this.isSaving = false;
          this.product = product;
          this.toastService.success(`Product "${product.name}" updated successfully!`);
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.message || 'Failed to update product');
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
        return 'Create New Product';
      case 'edit':
        return `Edit Product${this.product ? `: ${this.product.name}` : ''}`;
      default:
        return 'Product Details';
    }
  }
}
