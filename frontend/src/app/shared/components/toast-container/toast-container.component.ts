import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastService, Toast, ToastType } from '../../services/toast.service';

/**
 * Toast Container Component
 * 
 * Displays toast notifications in a fixed position overlay.
 * Should be placed once in the root component (app.component.html).
 * 
 * Usage:
 * ```html
 * <!-- In app.component.html -->
 * <app-toast-container></app-toast-container>
 * <router-outlet></router-outlet>
 * ```
 * 
 * Features:
 * - Animated entrance/exit
 * - Click to dismiss
 * - Type-based icons and colors
 * - Accessible (ARIA roles)
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" role="alert" aria-live="polite" aria-atomic="true">
      @for (toast of toasts$ | async; track toast.id) {
        <div 
          class="toast-item toast-{{ toast.type }}"
          [@fadeSlide]
          (click)="dismiss(toast.id)"
          role="status"
        >
          <span class="toast-icon" aria-hidden="true">{{ getIcon(toast.type) }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <button 
            class="toast-close" 
            (click)="dismiss(toast.id); $event.stopPropagation()"
            aria-label="Close notification"
          >
            &times;
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 400px;
      pointer-events: none;
    }

    .toast-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      pointer-events: auto;
      color: #fff;
      font-size: 0.9rem;
      min-width: 280px;
      backdrop-filter: blur(8px);
    }

    .toast-item:hover {
      transform: translateX(-4px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    /* Toast Types */
    .toast-success {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    }

    .toast-error {
      background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%);
    }

    .toast-warning {
      background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
      color: #212529;
    }

    .toast-info {
      background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%);
    }

    .toast-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .toast-message {
      flex: 1;
      line-height: 1.4;
    }

    .toast-close {
      background: none;
      border: none;
      color: inherit;
      font-size: 1.5rem;
      line-height: 1;
      padding: 0;
      margin-left: 0.5rem;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .toast-close:hover {
      opacity: 1;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .toast-container {
        left: 1rem;
        right: 1rem;
        max-width: none;
      }

      .toast-item {
        min-width: auto;
      }
    }
  `],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ 
          opacity: 0, 
          transform: 'translateX(100%)' 
        }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
          opacity: 1, 
          transform: 'translateX(0)' 
        }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
          opacity: 0, 
          transform: 'translateX(100%)' 
        }))
      ])
    ])
  ]
})
export class ToastContainerComponent {
  private toastService = inject(ToastService);
  
  toasts$ = this.toastService.toasts$;

  /**
   * Get icon for toast type
   */
  getIcon(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type];
  }

  /**
   * Dismiss a toast
   */
  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
