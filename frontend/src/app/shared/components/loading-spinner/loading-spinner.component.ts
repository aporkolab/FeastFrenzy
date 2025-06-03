import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { LoadingService } from '../../services/loading.service';

/**
 * A versatile loading spinner component.
 *
 * Can be used in two modes:
 * 1. Local mode: Controlled by parent component via [loading] input
 * 2. Global mode: Automatically shows when HTTP requests are in progress
 *
 * Usage:
 * ```html
 * <!-- Local spinner -->
 * <app-loading-spinner [loading]="isLoading"></app-loading-spinner>
 * 
 * <!-- Global overlay spinner (uses LoadingService) -->
 * <app-loading-spinner [global]="true" [overlay]="true"></app-loading-spinner>
 * 
 * <!-- With size and message -->
 * <app-loading-spinner size="large" message="Loading data..."></app-loading-spinner>
 * ```
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (shouldShow$ | async) {
      <div
        class="spinner-container"
        [class.spinner-overlay]="overlay"
        [class.spinner-sm]="size === 'small'"
        [class.spinner-lg]="size === 'large'"
        role="status"
        aria-live="polite"
        [attr.aria-busy]="true"
      >
        <div class="spinner" aria-hidden="true">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        <span class="sr-only">{{ message || 'Loading...' }}</span>
        @if (message) {
          <span class="spinner-message" aria-hidden="true">{{ message }}</span>
        }
      </div>
    }
  `,
  styles: [`
    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1rem;
    }

    .spinner-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(2px);
      z-index: 9999;
    }

    .spinner {
      position: relative;
      width: 2.5rem;
      height: 2.5rem;
    }

    .spinner-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border: 3px solid transparent;
      border-top-color: var(--bs-primary, #0d6efd);
      border-radius: 50%;
      animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    }

    .spinner-ring:nth-child(1) {
      animation-delay: -0.45s;
    }

    .spinner-ring:nth-child(2) {
      animation-delay: -0.3s;
      opacity: 0.8;
    }

    .spinner-ring:nth-child(3) {
      animation-delay: -0.15s;
      opacity: 0.6;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    /* Sizes */
    .spinner-sm .spinner {
      width: 1.25rem;
      height: 1.25rem;
    }

    .spinner-sm .spinner-ring {
      border-width: 2px;
    }

    .spinner-lg .spinner {
      width: 4rem;
      height: 4rem;
    }

    .spinner-lg .spinner-ring {
      border-width: 4px;
    }

    /* Overlay mode text */
    .spinner-overlay .spinner-message {
      color: #fff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .spinner-message {
      color: var(--bs-primary, #0d6efd);
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Screen reader only text */
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

    /* Respect reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      .spinner-ring {
        animation: none;
        border-color: var(--bs-primary, #0d6efd);
        opacity: 0.5;
      }
      
      .spinner-ring:first-child {
        opacity: 1;
      }
    }
  `]
})
export class LoadingSpinnerComponent implements OnInit {
  private loadingService = inject(LoadingService);

  /** Size variant */
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  
  /** Show as overlay */
  @Input() overlay = false;
  
  /** Optional message to display */
  @Input() message?: string;
  
  /** 
   * Use global loading state from LoadingService.
   * When true, spinner shows/hides based on HTTP request activity.
   */
  @Input() global = false;

  /**
   * Manual control of loading state.
   * Ignored when global=true.
   */
  @Input() loading = true;

  /** Observable to control visibility */
  shouldShow$!: Observable<boolean>;

  ngOnInit(): void {
    if (this.global) {
      // Use global loading state
      this.shouldShow$ = this.loadingService.loading$;
    } else {
      // Use local loading input
      this.shouldShow$ = of(this.loading);
    }
  }
}
