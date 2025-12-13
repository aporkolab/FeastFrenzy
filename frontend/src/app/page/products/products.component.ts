import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Product } from 'src/app/model/product';
import { ProductService } from 'src/app/service/product.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styles: [''],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink]
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = null;

    this.productService.getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load products';
          this.isLoading = false;
        }
      });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    this.productService.deleteProduct(product.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.products = this.products.filter(p => p.id !== product.id);
        },
        error: (err) => {
          this.error = err.message || 'Failed to delete product';
        }
      });
  }

  trackByProductId(index: number, product: Product): number {
    return product.id;
  }
}