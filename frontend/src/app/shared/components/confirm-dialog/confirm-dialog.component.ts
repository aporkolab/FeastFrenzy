import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * A confirmation dialog component using Bootstrap modal.
 *
 * Usage:
 * ```html
 * <app-confirm-dialog
 *   [show]="showDeleteConfirm"
 *   title="Confirm Delete"
 *   message="Are you sure you want to delete this item?"
 *   confirmText="Delete"
 *   confirmClass="btn-danger"
 *   (confirmed)="onDeleteConfirmed()"
 *   (cancelled)="showDeleteConfirm = false">
 * </app-confirm-dialog>
 * ```
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="modal fade"
      [class.show]="show"
      [style.display]="show ? 'block' : 'none'"
      tabindex="-1"
      role="dialog"
      (click)="onBackdropClick($event)"
    >
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ title }}</h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              (click)="onCancel()"
            ></button>
          </div>
          <div class="modal-body">
            <p>{{ message }}</p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              (click)="onCancel()"
            >
              {{ cancelText }}
            </button>
            <button
              type="button"
              class="btn"
              [ngClass]="confirmClass"
              (click)="onConfirm()"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade" [class.show]="show" *ngIf="show"></div>
  `,
  styles: [
    `
      .modal {
        background-color: rgba(0, 0, 0, 0.5);
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  @Input() show = false;
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() confirmClass = 'btn-primary';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    // Only close if clicking directly on the modal backdrop, not the dialog
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.onCancel();
    }
  }
}
