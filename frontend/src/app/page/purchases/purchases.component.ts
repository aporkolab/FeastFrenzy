import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Purchase, CreatePurchaseDto } from 'src/app/model/purchase';
import { PurchaseService } from 'src/app/service/purchase.service';
import { TableSkeletonComponent, ErrorStateComponent } from 'src/app/shared/components';

@Component({
  selector: 'app-purchases',
  templateUrl: './purchases.component.html',
  styleUrls: ['./purchases.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    TableSkeletonComponent,
    ErrorStateComponent
  ]
})
export class PurchasesComponent implements OnInit, OnDestroy {
  purchases: Purchase[] = [];
  isLoading = false;
  error: string | null = null;
  editingPurchase: Purchase | null = null;

  
  formData: CreatePurchaseDto = this.getEmptyFormData();

  private destroy$ = new Subject<void>();

  constructor(private purchaseService: PurchaseService) {}

  ngOnInit(): void {
    this.loadPurchases();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getEmptyFormData(): CreatePurchaseDto {
    return {
      date: new Date().toISOString().split('T')[0],
      employeeId: 0,
      total: 0,
      closed: false
    };
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
        error: (err) => {
          this.error = err.message || 'Failed to load purchases';
          this.isLoading = false;
        }
      });
  }

  addPurchase(): void {
    if (!this.formData.employeeId) {
      this.error = 'Please select an employee';
      return;
    }

    this.purchaseService.addPurchase(this.formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadPurchases();
          this.resetForm();
        },
        error: (err) => {
          this.error = err.message || 'Failed to add purchase';
        }
      });
  }

  editPurchase(purchase: Purchase): void {
    this.editingPurchase = purchase;
    this.formData = {
      date: purchase.date,
      employeeId: purchase.employeeId,
      total: purchase.total,
      closed: purchase.closed
    };
  }

  cancelEdit(): void {
    this.editingPurchase = null;
    this.resetForm();
  }

  deletePurchase(purchase: Purchase): void {
    if (!confirm('Are you sure you want to delete this purchase?')) {
      return;
    }

    this.purchaseService.deletePurchase(purchase.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.purchases = this.purchases.filter(p => p.id !== purchase.id);
        },
        error: (err) => {
          this.error = err.message || 'Failed to delete purchase';
        }
      });
  }

  private resetForm(): void {
    this.formData = this.getEmptyFormData();
    this.editingPurchase = null;
  }

  trackByPurchaseId(index: number, purchase: Purchase): number {
    return purchase.id;
  }
}