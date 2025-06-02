import { 
  Component, 
  EventEmitter, 
  Input, 
  Output, 
  OnChanges, 
  SimpleChanges,
  HostListener 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusTrapDirective } from '../../../shared/accessibility/focus-trap.directive';

/**
 * A confirmation dialog component using Bootstrap modal.
 * 
 * Accessibility features:
 * - Focus trap when open
 * - Proper ARIA attributes (role, aria-modal, aria-labelledby, aria-describedby)
 * - Escape key to close
 * - Focus restoration on close
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
  imports: [CommonModule, FocusTrapDirective],
  template: `
    @if (show) {
      <div
        class="modal fade show"
        style="display: block"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="dialogId + '-title'"
        [attr.aria-describedby]="dialogId + '-desc'"
        (click)="onBackdropClick($event)"
      >
        <div 
          class="modal-dialog modal-dialog-centered"
          focusTrap
          [focusTrapActive]="show"
        >
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" [id]="dialogId + '-title'">{{ title }}</h5>
              <button
                type="button"
                class="btn-close"
                aria-label="Close dialog"
                (click)="onCancel()"
              ></button>
            </div>
            <div class="modal-body">
              <p [id]="dialogId + '-desc'">{{ message }}</p>
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
      <div class="modal-backdrop fade show"></div>
    }
  `,
  styles: [`
    .modal {
      background-color: rgba(0, 0, 0, 0.5);
    }
    
    .modal-content:focus {
      outline: none;
    }
  `],
})
export class ConfirmDialogComponent implements OnChanges {
  @Input() show = false;
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() confirmClass = 'btn-primary';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  /** Unique ID for ARIA references */
  dialogId = `confirm-dialog-${Math.random().toString(36).substr(2, 9)}`;
  
  private previouslyFocused: HTMLElement | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['show']) {
      if (this.show) {
        this.previouslyFocused = document.activeElement as HTMLElement;
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
        // Restore focus
        this.restoreFocus();
      }
    }
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.show) {
      this.onCancel();
    }
  }

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

  private restoreFocus(): void {
    if (this.previouslyFocused && typeof this.previouslyFocused.focus === 'function') {
      setTimeout(() => {
        this.previouslyFocused?.focus();
      }, 0);
    }
  }
}
