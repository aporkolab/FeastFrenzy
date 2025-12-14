import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Purchase } from 'src/app/model/purchase';
import { PurchaseService } from 'src/app/service/purchase.service';
import { CardSkeletonComponent, TableSkeletonComponent, ErrorStateComponent } from 'src/app/shared/components';

@Component({
  selector: 'app-purchase-detail',
  templateUrl: './purchase-detail.component.html',
  styleUrls: ['./purchase-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    RouterLink,
    CardSkeletonComponent,
    TableSkeletonComponent,
    ErrorStateComponent
  ]
})
export class PurchaseDetailComponent implements OnInit, OnDestroy {
  purchase: Purchase | null = null;
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private purchaseService: PurchaseService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loadPurchase();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPurchase(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Purchase ID not found';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.purchaseService.getPurchase(+id)
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

  goBack(): void {
    this.location.back();
  }
}