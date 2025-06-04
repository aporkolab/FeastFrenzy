import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Form Skeleton Component
 * 
 * Displays a skeleton loading state for form-based layouts.
 * Use when loading data for edit pages or detail views.
 * 
 * Usage:
 * ```html
 * <app-form-skeleton *ngIf="loading" [fields]="6"></app-form-skeleton>
 * <app-edit-form *ngIf="!loading" [data]="data"></app-edit-form>
 * ```
 */
@Component({
  selector: 'app-form-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-form" role="status" aria-label="Loading form">
      <!-- Title -->
      @if (showTitle) {
        <div class="skeleton-form-title"></div>
      }
      
      <!-- Form fields -->
      @for (field of fieldArray; track $index) {
        <div 
          class="skeleton-field" 
          [style.animation-delay]="$index * 0.05 + 's'"
        >
          <div class="skeleton-label"></div>
          <div 
            class="skeleton-input"
            [class.skeleton-textarea]="$index === fieldArray.length - 1 && showTextarea"
          ></div>
        </div>
      }
      
      <!-- Action buttons -->
      @if (showActions) {
        <div class="skeleton-actions">
          <div class="skeleton-button skeleton-button-primary"></div>
          <div class="skeleton-button skeleton-button-secondary"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.5rem;
      background: var(--bs-body-bg, #fff);
      border-radius: 0.5rem;
      border: 1px solid var(--bs-border-color, #dee2e6);
      animation: fadeIn 0.3s ease-out;
    }

    .skeleton-form-title {
      height: 2rem;
      width: 40%;
      margin-bottom: 0.5rem;
      background: linear-gradient(
        90deg,
        var(--bs-secondary-bg, #e9ecef) 0%,
        var(--bs-body-bg, #fff) 50%,
        var(--bs-secondary-bg, #e9ecef) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.25rem;
    }

    .skeleton-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      animation: fadeIn 0.3s ease-out both;
    }

    .skeleton-label {
      height: 0.875rem;
      width: 30%;
      max-width: 120px;
      background: linear-gradient(
        90deg,
        var(--bs-secondary-bg, #e9ecef) 0%,
        var(--bs-body-bg, #fff) 50%,
        var(--bs-secondary-bg, #e9ecef) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.25rem;
    }

    .skeleton-input {
      height: 2.5rem;
      width: 100%;
      background: linear-gradient(
        90deg,
        var(--bs-secondary-bg, #e9ecef) 0%,
        var(--bs-tertiary-bg, #f8f9fa) 50%,
        var(--bs-secondary-bg, #e9ecef) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.375rem;
      border: 1px solid var(--bs-border-color, #dee2e6);
    }

    .skeleton-textarea {
      height: 6rem;
    }

    .skeleton-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--bs-border-color, #dee2e6);
    }

    .skeleton-button {
      height: 2.5rem;
      border-radius: 0.375rem;
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .skeleton-button-primary {
      width: 120px;
      background: linear-gradient(
        90deg,
        var(--bs-primary-bg-subtle, #cfe2ff) 0%,
        var(--bs-body-bg, #fff) 50%,
        var(--bs-primary-bg-subtle, #cfe2ff) 100%
      );
    }

    .skeleton-button-secondary {
      width: 100px;
      background: linear-gradient(
        90deg,
        var(--bs-secondary-bg, #e9ecef) 0%,
        var(--bs-body-bg, #fff) 50%,
        var(--bs-secondary-bg, #e9ecef) 100%
      );
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
  `]
})
export class FormSkeletonComponent {
  /** Number of form fields to show */
  @Input() fields = 4;
  
  /** Show form title */
  @Input() showTitle = true;
  
  /** Show action buttons */
  @Input() showActions = true;
  
  /** Show last field as textarea */
  @Input() showTextarea = false;

  get fieldArray(): number[] {
    return Array(this.fields).fill(0);
  }
}
