import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * A simple loading spinner component.
 *
 * Usage:
 * ```html
 * <app-loading-spinner></app-loading-spinner>
 * <app-loading-spinner size="large"></app-loading-spinner>
 * <app-loading-spinner [overlay]="true"></app-loading-spinner>
 * ```
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="spinner-container"
      [class.spinner-overlay]="overlay"
      [class.spinner-sm]="size === 'small'"
      [class.spinner-lg]="size === 'large'"
    >
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <span *ngIf="message" class="spinner-message">{{ message }}</span>
    </div>
  `,
  styles: [
    `
      .spinner-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem;
      }

      .spinner-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
      }

      .spinner-sm .spinner-border {
        width: 1rem;
        height: 1rem;
        border-width: 0.15em;
      }

      .spinner-lg .spinner-border {
        width: 3rem;
        height: 3rem;
        border-width: 0.3em;
      }

      .spinner-message {
        color: var(--bs-primary);
        font-size: 0.875rem;
      }
    `,
  ],
})
export class LoadingSpinnerComponent {
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() overlay = false;
  @Input() message?: string;
}
