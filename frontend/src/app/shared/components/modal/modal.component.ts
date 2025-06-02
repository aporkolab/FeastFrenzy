import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable modal component for dialogs.
 * Professional UI pattern for CRUD operations.
 *
 * Usage:
 * <app-modal [isOpen]="showModal" [title]="'Add Product'" (close)="closeModal()">
 *   <ng-container modal-body>Form content here</ng-container>
 *   <ng-container modal-footer>Buttons here</ng-container>
 * </app-modal>
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div
        class="modal-backdrop"
        (click)="onBackdropClick($event)"
        role="dialog"
        [attr.aria-modal]="true"
        [attr.aria-labelledby]="titleId">
        <div
          class="modal-container"
          [class.modal-sm]="size === 'sm'"
          [class.modal-lg]="size === 'lg'"
          [class.modal-xl]="size === 'xl'"
          (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="modal-header">
            <h2 [id]="titleId" class="modal-title">{{ title }}</h2>
            <button
              type="button"
              class="btn-close"
              (click)="onClose()"
              aria-label="Close modal"
              [disabled]="loading">
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <ng-content select="[modal-body]"></ng-content>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <ng-content select="[modal-footer]"></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
      animation: fadeIn 0.15s ease-out;
    }

    .modal-container {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.2s ease-out;
    }

    .modal-sm { max-width: 300px; }
    .modal-lg { max-width: 800px; }
    .modal-xl { max-width: 1140px; }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--bs-border-color, #dee2e6);
    }

    .modal-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      opacity: 0.5;
      padding: 0.5rem;
      line-height: 1;
    }

    .btn-close:hover:not(:disabled) {
      opacity: 1;
    }

    .btn-close:disabled {
      cursor: not-allowed;
    }

    .btn-close::before {
      content: '×';
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .modal-footer {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--bs-border-color, #dee2e6);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() loading = false;
  @Input() closeOnBackdrop = true;

  @Output() close = new EventEmitter<void>();

  readonly titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen && !this.loading) {
      this.onClose();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop && !this.loading) {
      this.onClose();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
