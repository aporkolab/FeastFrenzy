import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Purchase } from 'src/app/model/purchase';
import { PurchaseService } from 'src/app/service/purchase.service';
import { ToastService } from 'src/app/shared/services';
import { CardSkeletonComponent, ErrorStateComponent } from 'src/app/shared/components';
import { PurchaseFormComponent, CreatePurchaseWithItemsDto } from 'src/app/features/purchases/components';

type PageMode = 'view' | 'create' | 'edit';

@Component({
  selector: 'app-purchase-detail',
  templateUrl: './purchase-detail.component.html',
  styleUrls: ['./purchase-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    CardSkeletonComponent,
    ErrorStateComponent,
    PurchaseFormComponent
  ]
})
export class PurchaseDetailComponent implements OnInit, OnDestroy {
  purchase: Purchase | null = null;
  isLoading = false;
  isSaving = false;
  error: string | null = null;
  mode: PageMode = 'view';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private purchaseService: PurchaseService,
    private toastService: ToastService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.determineMode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isCreateMode(): boolean {
    return this.mode === 'create';
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get isViewMode(): boolean {
    return this.mode === 'view';
  }

  get pageTitle(): string {
    switch (this.mode) {
      case 'create': return 'New Purchase';
      case 'edit': return 'Edit Purchase';
      default: return 'Purchase Details';
    }
  }

  /**
   * Determine page mode based on route
   */
  private determineMode(): void {
    const path = this.route.snapshot.routeConfig?.path || '';
    const id = this.route.snapshot.paramMap.get('id');

    if (path === 'new') {
      this.mode = 'create';
      this.purchase = null;
    } else if (id) {
      // Check if path includes 'edit' to determine mode
      this.mode = path.includes('edit') ? 'edit' : 'view';
      this.loadPurchase(+id);
    }
  }

  /**
   * Load purchase by ID
   */
  loadPurchase(id: number): void {
    this.isLoading = true;
    this.error = null;

    this.purchaseService.getPurchase(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (purchase) => {
          this.purchase = purchase;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err.message || 'Failed to load purchase';
          this.isLoading = false;
        }
      });
  }

  /**
   * Handle form save (create or update)
   */
  onSave(data: CreatePurchaseWithItemsDto): void {
    if (this.isCreateMode) {
      this.createPurchase(data as CreatePurchaseWithItemsDto);
    } else if (this.isEditMode && this.purchase) {
      this.updatePurchase(this.purchase.id, data as CreatePurchaseWithItemsDto);
    }
  }

  /**
   * Create new purchase with items in a single transactional API call
   * The backend handles items creation atomically
   */
  private createPurchase(data: CreatePurchaseWithItemsDto): void {
    this.isSaving = true;

    // Send purchase with items to backend - single transactional call
    // Backend's createWithItems handles everything atomically
    const payload = {
      ...data,
      items: data.items?.map(item => ({
        productId: item.productId,
        quantity: item.quantity
        // Note: price is not sent - backend uses product price
      }))
    };

    this.purchaseService.createPurchase(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.toastService.success('Purchase created successfully!');
          this.router.navigate(['/purchases']);
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.message || 'Failed to create purchase');
        }
      });
  }

  /**
   * Update existing purchase with items
   * If items array is provided, backend replaces all existing items
   */
  private updatePurchase(id: number, data: CreatePurchaseWithItemsDto): void {
    this.isSaving = true;

    // Build update payload - include items if they were modified
    const payload: any = {
      date: data.date,
      closed: data.closed,
      total: data.total
    };

    // Include items for replacement if provided
    if (data.items && data.items.length > 0) {
      payload.items = data.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));
    }

    this.purchaseService.updatePurchase(id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.toastService.success('Purchase updated successfully!');
          this.router.navigate(['/purchases']);
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.message || 'Failed to update purchase');
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
   * Switch to edit mode from view mode
   */
  switchToEditMode(): void {
    this.mode = 'edit';
  }

  /**
   * Navigate back
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Retry loading
   */
  retry(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPurchase(+id);
    }
  }
}
