import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Error type for different visual styles
 */
export type ErrorType = 'error' | 'warning' | 'info' | 'empty';

/**
 * Error State Component
 * 
 * Displays a friendly error state with optional retry functionality.
 * Use when data loading fails or when showing empty states.
 * 
 * Usage:
 * ```html
 * <!-- Basic error -->
 * <app-error-state 
 *   *ngIf="error" 
 *   [message]="error" 
 *   (retry)="loadData()"
 * ></app-error-state>
 * 
 * <!-- Empty state -->
 * <app-error-state 
 *   *ngIf="items.length === 0" 
 *   type="empty"
 *   title="No items yet"
 *   message="Add your first item to get started."
 *   [showRetry]="false"
 * ></app-error-state>
 * 
 * <!-- Custom action -->
 * <app-error-state 
 *   type="empty"
 *   title="No products found"
 *   message="Try adjusting your search criteria."
 *   actionText="Clear Filters"
 *   (action)="clearFilters()"
 * ></app-error-state>
 * ```
 */
@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="error-state" 
      [class]="'error-state-' + type"
      role="alert"
      [attr.aria-live]="type === 'error' ? 'assertive' : 'polite'"
    >
      <!-- Icon -->
      <div class="error-icon" aria-hidden="true">
        {{ getIcon() }}
      </div>
      
      <!-- Title -->
      <h3 class="error-title">{{ title }}</h3>
      
      <!-- Message -->
      <p class="error-message">{{ message }}</p>
      
      <!-- Details (collapsible) -->
      @if (details) {
        <details class="error-details">
          <summary>Technical Details</summary>
          <pre>{{ details }}</pre>
        </details>
      }
      
      <!-- Actions -->
      <div class="error-actions">
        @if (showRetry) {
          <button 
            class="btn btn-primary"
            (click)="onRetry()"
            [disabled]="retrying"
          >
            @if (retrying) {
              <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            }
            {{ retryText }}
          </button>
        }
        
        @if (actionText) {
          <button 
            class="btn"
            [class.btn-outline-primary]="showRetry"
            [class.btn-primary]="!showRetry"
            (click)="action.emit()"
          >
            {{ actionText }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 3rem 2rem;
      min-height: 300px;
      background: var(--bs-body-bg, #fff);
      border-radius: 0.5rem;
      border: 1px solid var(--bs-border-color, #dee2e6);
    }

    /* Type variants */
    .error-state-error {
      border-color: var(--bs-danger-border-subtle, #f5c2c7);
      background: var(--bs-danger-bg-subtle, #f8d7da);
    }

    .error-state-warning {
      border-color: var(--bs-warning-border-subtle, #ffecb5);
      background: var(--bs-warning-bg-subtle, #fff3cd);
    }

    .error-state-info {
      border-color: var(--bs-info-border-subtle, #b6effb);
      background: var(--bs-info-bg-subtle, #cff4fc);
    }

    .error-state-empty {
      border-style: dashed;
      background: var(--bs-tertiary-bg, #f8f9fa);
    }

    .error-icon {
      font-size: 4rem;
      line-height: 1;
      margin-bottom: 1rem;
      opacity: 0.8;
    }

    .error-state-error .error-icon {
      color: var(--bs-danger, #dc3545);
    }

    .error-state-warning .error-icon {
      color: var(--bs-warning, #ffc107);
    }

    .error-state-info .error-icon {
      color: var(--bs-info, #0dcaf0);
    }

    .error-state-empty .error-icon {
      color: var(--bs-secondary, #6c757d);
    }

    .error-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--bs-body-color, #212529);
    }

    .error-message {
      color: var(--bs-secondary-color, #6c757d);
      margin-bottom: 1.5rem;
      max-width: 400px;
    }

    .error-details {
      margin-bottom: 1.5rem;
      text-align: left;
      width: 100%;
      max-width: 500px;
    }

    .error-details summary {
      cursor: pointer;
      color: var(--bs-secondary-color, #6c757d);
      font-size: 0.875rem;
      padding: 0.5rem;
    }

    .error-details pre {
      background: var(--bs-body-bg, #fff);
      border: 1px solid var(--bs-border-color, #dee2e6);
      border-radius: 0.25rem;
      padding: 0.75rem;
      font-size: 0.75rem;
      overflow-x: auto;
      margin-top: 0.5rem;
      max-height: 200px;
    }

    .error-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    /* Animation */
    .error-state {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class ErrorStateComponent {
  /** Error type for styling */
  @Input() type: ErrorType = 'error';
  
  /** Title text */
  @Input() title = 'Something went wrong';
  
  /** Message text */
  @Input() message = 'An error occurred while loading data.';
  
  /** Technical details (shown in collapsible) */
  @Input() details?: string;
  
  /** Show retry button */
  @Input() showRetry = true;
  
  /** Retry button text */
  @Input() retryText = 'Try Again';
  
  /** Show retrying state */
  @Input() retrying = false;
  
  /** Custom action button text */
  @Input() actionText?: string;
  
  /** Retry event */
  @Output() retry = new EventEmitter<void>();
  
  /** Custom action event */
  @Output() action = new EventEmitter<void>();

  /**
   * Get icon based on error type
   */
  getIcon(): string {
    const icons: Record<ErrorType, string> = {
      error: '⚠️',
      warning: '⚡',
      info: 'ℹ️',
      empty: '📭'
    };
    return icons[this.type];
  }

  /**
   * Handle retry click
   */
  onRetry(): void {
    this.retry.emit();
  }
}
