import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ContentChild, 
  TemplateRef,
  inject 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnnouncerService } from '../../accessibility/announcer.service';

export interface TableColumn {
  field: string;
  label: string;
  sortable?: boolean;
  headerClass?: string;
  cellClass?: string;
}

export interface SortEvent {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Accessible Data Table Component
 * 
 * A reusable, accessible data table with:
 * - Proper table semantics (caption, scope, headers)
 * - Sortable columns with aria-sort
 * - Screen reader announcements for sort changes
 * - Keyboard navigation for sortable headers
 * 
 * Usage:
 * ```html
 * <app-data-table
 *   caption="List of products"
 *   [columns]="columns"
 *   [data]="products"
 *   [sortField]="currentSort.field"
 *   [sortDirection]="currentSort.direction"
 *   (sortChange)="onSort($event)">
 *   
 *   <!-- Custom cell templates -->
 *   <ng-template #actions let-row>
 *     <button (click)="edit(row)">Edit</button>
 *   </ng-template>
 * </app-data-table>
 * ```
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="table-responsive" 
      role="region" 
      [attr.aria-label]="caption"
      [attr.aria-busy]="loading"
    >
      <table class="table table-hover" [attr.aria-describedby]="descriptionId">
        <caption [id]="captionId" [class.sr-only]="hideCaptionVisually">
          {{ caption }}
          @if (data.length > 0) {
            <span class="sr-only">
              , {{ data.length }} {{ data.length === 1 ? 'row' : 'rows' }}
            </span>
          }
        </caption>
        
        <thead class="table-light">
          <tr>
            @for (col of columns; track col.field) {
              <th 
                scope="col"
                [class]="col.headerClass || ''"
                [attr.aria-sort]="col.sortable ? getSortState(col.field) : null"
                [class.sortable]="col.sortable"
              >
                @if (col.sortable) {
                  <button
                    type="button"
                    class="sort-button"
                    (click)="onSortClick(col.field)"
                    (keydown.enter)="onSortClick(col.field)"
                    (keydown.space)="onSortClick(col.field); $event.preventDefault()"
                    [attr.aria-label]="getSortButtonLabel(col)"
                  >
                    {{ col.label }}
                    <span class="sort-icon" aria-hidden="true">
                      {{ getSortIcon(col.field) }}
                    </span>
                  </button>
                } @else {
                  {{ col.label }}
                }
              </th>
            }
            @if (actionsTemplate) {
              <th scope="col">
                <span class="sr-only">Actions</span>
                Actions
              </th>
            }
          </tr>
        </thead>
        
        <tbody>
          @if (loading) {
            <tr>
              <td [attr.colspan]="columns.length + (actionsTemplate ? 1 : 0)" class="text-center py-4">
                <span class="sr-only">Loading data...</span>
                <div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
                Loading...
              </td>
            </tr>
          } @else if (data.length === 0) {
            <tr>
              <td [attr.colspan]="columns.length + (actionsTemplate ? 1 : 0)" class="text-center py-4">
                {{ emptyMessage }}
              </td>
            </tr>
          } @else {
            @for (row of data; track trackByFn(row); let i = $index) {
              <tr>
                @for (col of columns; track col.field) {
                  <td [class]="col.cellClass || ''">
                    @if (cellTemplates[col.field]) {
                      <ng-container 
                        [ngTemplateOutlet]="cellTemplates[col.field]"
                        [ngTemplateOutletContext]="{ $implicit: row, index: i }">
                      </ng-container>
                    } @else {
                      {{ getNestedValue(row, col.field) }}
                    }
                  </td>
                }
                @if (actionsTemplate) {
                  <td class="table-actions">
                    <ng-container 
                      [ngTemplateOutlet]="actionsTemplate"
                      [ngTemplateOutletContext]="{ $implicit: row, index: i }">
                    </ng-container>
                  </td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    caption {
      caption-side: top;
      padding: 0.5rem;
      font-weight: 600;
      color: var(--bs-dark, #212529);
    }

    .sortable {
      cursor: pointer;
    }

    .sort-button {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      font-weight: 600;
      color: inherit;
      cursor: pointer;
      width: 100%;
      text-align: left;
    }

    .sort-button:hover {
      text-decoration: underline;
    }

    .sort-button:focus-visible {
      outline: 2px solid var(--bs-primary, #0d6efd);
      outline-offset: 2px;
      border-radius: 2px;
    }

    .sort-icon {
      opacity: 0.5;
      font-size: 0.875rem;
    }

    th[aria-sort="ascending"] .sort-icon,
    th[aria-sort="descending"] .sort-icon {
      opacity: 1;
    }

    .table-actions {
      white-space: nowrap;
    }

    .table-actions button,
    .table-actions a {
      margin-right: 0.25rem;
    }

    .table-actions button:last-child,
    .table-actions a:last-child {
      margin-right: 0;
    }
  `]
})
export class DataTableComponent<T extends Record<string, unknown>> {
  private announcer = inject(AnnouncerService);

  /** Table caption (required for accessibility) */
  @Input({ required: true }) caption = '';
  
  /** Hide caption visually but keep for screen readers */
  @Input() hideCaptionVisually = false;
  
  /** Column definitions */
  @Input({ required: true }) columns: TableColumn[] = [];
  
  /** Table data */
  @Input() data: T[] = [];
  
  /** Current sort field */
  @Input() sortField = '';
  
  /** Current sort direction */
  @Input() sortDirection: 'asc' | 'desc' = 'asc';
  
  /** Loading state */
  @Input() loading = false;
  
  /** Empty state message */
  @Input() emptyMessage = 'No data available';
  
  /** Track by function for rows */
  @Input() trackByFn: (row: T) => unknown = (row: T) => row['id'] || row;
  
  /** Custom cell templates */
  @Input() cellTemplates: Record<string, TemplateRef<unknown>> = {};

  /** Sort change event */
  @Output() sortChange = new EventEmitter<SortEvent>();

  /** Actions column template */
  @ContentChild('actions') actionsTemplate?: TemplateRef<unknown>;

  /** Unique IDs for ARIA */
  captionId = `table-caption-${Math.random().toString(36).substr(2, 9)}`;
  descriptionId = `table-desc-${Math.random().toString(36).substr(2, 9)}`;

  getSortState(field: string): 'ascending' | 'descending' | 'none' {
    if (this.sortField !== field) return 'none';
    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  getSortButtonLabel(col: TableColumn): string {
    const currentState = this.getSortState(col.field);
    
    if (currentState === 'none') {
      return `Sort by ${col.label}`;
    } else if (currentState === 'ascending') {
      return `${col.label}, sorted ascending. Click to sort descending`;
    } else {
      return `${col.label}, sorted descending. Click to sort ascending`;
    }
  }

  onSortClick(field: string): void {
    const newDirection: 'asc' | 'desc' = 
      this.sortField === field && this.sortDirection === 'asc' ? 'desc' : 'asc';
    
    this.sortChange.emit({ field, direction: newDirection });
    
    // Announce sort change to screen readers
    const column = this.columns.find(c => c.field === field);
    if (column) {
      const directionLabel = newDirection === 'asc' ? 'ascending' : 'descending';
      this.announcer.announceSortChange(column.label, directionLabel);
    }
  }

  getNestedValue(obj: T, path: string): unknown {
    return path.split('.').reduce((acc: unknown, part: string) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }
}
