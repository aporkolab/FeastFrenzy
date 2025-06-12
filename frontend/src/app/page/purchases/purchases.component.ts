import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Purchase } from 'src/app/model/purchase';
import { PurchaseService } from 'src/app/service/purchase.service';
import { TableSkeletonComponent, ErrorStateComponent } from 'src/app/shared/components';
import { ToastService } from 'src/app/shared/services';

@Component({
  selector: 'app-purchases',
  templateUrl: './purchases.component.html',
  styleUrls: ['./purchases.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TableSkeletonComponent,
    ErrorStateComponent
  ]
})
export class PurchasesComponent implements OnInit, OnDestroy {
  purchases: Purchase[] = [];
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private purchaseService: PurchaseService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPurchases();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPurchases(): void {
    this.isLoading = true;
    this.error = null;

    this.purchaseService.getAllPurchases()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (purchases) => {
          this.purchases = purchases;
          this.isLoading = false;
        },
        error: (err: Error) => {
          this.error = err.message || 'Failed to load purchases';
          this.isLoading = false;
        }
      });
  }

  // ==================== NAVIGATION ====================

  navigateToNew(): void {
    this.router.navigate(['/purchases', 'new']);
  }

  viewPurchase(purchase: Purchase): void {
    this.router.navigate(['/purchases', purchase.id]);
  }

  editPurchase(purchase: Purchase): void {
    this.router.navigate(['/purchases', purchase.id, 'edit']);
  }

  // ==================== DELETE ====================

  deletePurchase(purchase: Purchase): void {
    if (!confirm('Are you sure you want to delete this purchase?')) {
      return;
    }

    this.purchaseService.deletePurchase(purchase.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Purchase deleted successfully');
          this.loadPurchases();
        },
        error: (err: Error) => {
          this.error = err.message || 'Failed to delete purchase';
          this.toastService.error(this.error);
        }
      });
  }

  // ==================== HELPERS ====================

  trackByPurchaseId(index: number, purchase: Purchase): number {
    return purchase.id;
  }
}
