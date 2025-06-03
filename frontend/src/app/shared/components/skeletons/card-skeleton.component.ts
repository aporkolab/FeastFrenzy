import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Card Skeleton Component
 * 
 * Displays a skeleton loading state for card-based layouts.
 * Perfect for product grids, user profiles, or any card UI.
 * 
 * Usage:
 * ```html
 * <!-- Single card -->
 * <app-card-skeleton *ngIf="loading"></app-card-skeleton>
 * 
 * <!-- Grid of cards -->
 * <div class="row">
 *   <div class="col-md-4" *ngFor="let i of [1,2,3]">
 *     <app-card-skeleton *ngIf="loading" [showImage]="true"></app-card-skeleton>
 *   </div>
 * </div>
 * ```
 */
@Component({
  selector: 'app-card-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="skeleton-card" 
      [class.skeleton-horizontal]="horizontal"
      role="status" 
      aria-label="Loading card"
    >
      <!-- Image placeholder -->
      @if (showImage) {
        <div 
          class="skeleton-image" 
          [style.height]="imageHeight"
        ></div>
      }
      
      <!-- Content area -->
      <div class="skeleton-content">
        <!-- Title -->
        <div class="skeleton-title"></div>
        
        <!-- Subtitle (optional) -->
        @if (showSubtitle) {
          <div class="skeleton-subtitle"></div>
        }
        
        <!-- Text lines -->
        @for (line of textLineArray; track $index) {
          <div 
            class="skeleton-text" 
            [class.skeleton-text-short]="$index === textLineArray.length - 1"
            [style.animation-delay]="$index * 0.1 + 's'"
          ></div>
        }
        
        <!-- Action button placeholder -->
        @if (showAction) {
          <div class="skeleton-action"></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .skeleton-card {
      background: var(--bs-body-bg, #fff);
      border-radius: 0.5rem;
      border: 1px solid var(--bs-border-color, #dee2e6);
      overflow: hidden;
      animation: fadeIn 0.3s ease-out;
    }

    .skeleton-horizontal {
      display: flex;
    }

    .skeleton-horizontal .skeleton-image {
      width: 120px;
      min-width: 120px;
      height: auto;
      min-height: 100px;
    }

    .skeleton-image {
      width: 100%;
      height: 180px;
      background: linear-gradient(
        90deg,
        var(--bs-secondary-bg, #e9ecef) 0%,
        var(--bs-tertiary-bg, #f8f9fa) 50%,
        var(--bs-secondary-bg, #e9ecef) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .skeleton-content {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
    }

    .skeleton-title {
      height: 1.5rem;
      width: 70%;
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

    .skeleton-subtitle {
      height: 1rem;
      width: 50%;
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

    .skeleton-text {
      height: 0.875rem;
      width: 100%;
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

    .skeleton-text-short {
      width: 60%;
    }

    .skeleton-action {
      height: 2.25rem;
      width: 100px;
      margin-top: 0.5rem;
      background: linear-gradient(
        90deg,
        var(--bs-primary-bg-subtle, #cfe2ff) 0%,
        var(--bs-body-bg, #fff) 50%,
        var(--bs-primary-bg-subtle, #cfe2ff) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.375rem;
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
      }
      to {
        opacity: 1;
      }
    }
  `]
})
export class CardSkeletonComponent {
  /** Show image placeholder */
  @Input() showImage = true;
  
  /** Show subtitle placeholder */
  @Input() showSubtitle = false;
  
  /** Number of text lines */
  @Input() textLines = 2;
  
  /** Show action button placeholder */
  @Input() showAction = false;
  
  /** Image height (CSS value) */
  @Input() imageHeight = '180px';
  
  /** Horizontal layout */
  @Input() horizontal = false;

  get textLineArray(): number[] {
    return Array(this.textLines).fill(0);
  }
}
