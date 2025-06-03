import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Table Skeleton Component
 * 
 * Displays a skeleton loading state for tables.
 * Use instead of a spinner when loading tabular data.
 * 
 * Usage:
 * ```html
 * <app-table-skeleton *ngIf="loading" [rows]="10" [columns]="5"></app-table-skeleton>
 * <app-data-table *ngIf="!loading" [data]="data"></app-data-table>
 * ```
 */
@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-table" role="status" aria-label="Loading table data">
      <!-- Header row -->
      <div class="skeleton-header">
        @for (col of columnArray; track $index) {
          <div 
            class="skeleton-cell skeleton-header-cell" 
            [style.width]="getColumnWidth($index)"
          ></div>
        }
      </div>
      
      <!-- Data rows -->
      @for (row of rowArray; track $index) {
        <div class="skeleton-row" [style.animation-delay]="$index * 0.05 + 's'">
          @for (col of columnArray; track $index) {
            <div 
              class="skeleton-cell" 
              [style.width]="getColumnWidth($index)"
            ></div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-table {
      width: 100%;
      border-radius: 0.5rem;
      overflow: hidden;
      background: var(--bs-body-bg, #fff);
      border: 1px solid var(--bs-border-color, #dee2e6);
    }

    .skeleton-header {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: var(--bs-tertiary-bg, #f8f9fa);
      border-bottom: 2px solid var(--bs-border-color, #dee2e6);
    }

    .skeleton-header-cell {
      height: 1rem;
      background: linear-gradient(
        90deg,
        var(--bs-secondary-bg, #e9ecef) 0%,
        var(--bs-tertiary-bg, #f8f9fa) 50%,
        var(--bs-secondary-bg, #e9ecef) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.25rem;
    }

    .skeleton-row {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid var(--bs-border-color-translucent, rgba(0,0,0,0.1));
      animation: fadeIn 0.3s ease-out both;
    }

    .skeleton-row:last-child {
      border-bottom: none;
    }

    .skeleton-cell {
      height: 1rem;
      background: linear-gradient(
        90deg,
        var(--bs-secondary-bg, #e9ecef) 0%,
        var(--bs-body-bg, #fff) 50%,
        var(--bs-secondary-bg, #e9ecef) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.25rem;
      flex: 1;
    }

    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Vary cell widths for realism */
    .skeleton-row .skeleton-cell:first-child {
      max-width: 60px;
      flex: 0 0 60px;
    }

    .skeleton-row .skeleton-cell:last-child {
      max-width: 100px;
      flex: 0 0 100px;
    }
  `]
})
export class TableSkeletonComponent {
  /** Number of skeleton rows to display */
  @Input() rows = 5;
  
  /** Number of columns per row */
  @Input() columns = 4;
  
  /** Custom column widths (optional) */
  @Input() columnWidths?: string[];

  get rowArray(): number[] {
    return Array(this.rows).fill(0);
  }

  get columnArray(): number[] {
    return Array(this.columns).fill(0);
  }

  getColumnWidth(index: number): string {
    if (this.columnWidths && this.columnWidths[index]) {
      return this.columnWidths[index];
    }
    return 'auto';
  }
}
