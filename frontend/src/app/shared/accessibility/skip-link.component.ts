import { Component, Input } from '@angular/core';

/**
 * Skip Link Component
 * 
 * Provides a skip link for keyboard users to bypass navigation.
 * WCAG 2.1 Level A requirement.
 * 
 * The link is visually hidden but becomes visible on focus.
 * 
 * Usage:
 * ```html
 * <!-- Place at the very beginning of app.component.html -->
 * <app-skip-link></app-skip-link>
 * 
 * <!-- With custom target -->
 * <app-skip-link target="content-area" text="Skip to main content"></app-skip-link>
 * ```
 */
@Component({
  selector: 'app-skip-link',
  standalone: true,
  template: `
    <a 
      [href]="'#' + target" 
      class="skip-link"
      (click)="handleClick($event)"
    >
      {{ text }}
    </a>
  `,
  styles: [`
    .skip-link {
      position: absolute;
      top: -100%;
      left: 0;
      background: var(--bs-primary, #0d6efd);
      color: white;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      text-decoration: none;
      z-index: 10001;
      border-radius: 0 0 0.375rem 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      transition: top 0.2s ease;
    }

    .skip-link:focus {
      top: 0;
      outline: 3px solid var(--bs-warning, #ffc107);
      outline-offset: 2px;
    }

    .skip-link:focus-visible {
      outline: 3px solid var(--bs-warning, #ffc107);
      outline-offset: 2px;
    }
  `]
})
export class SkipLinkComponent {
  /** ID of the element to skip to */
  @Input() target = 'main-content';
  
  /** Text for the skip link */
  @Input() text = 'Skip to main content';

  handleClick(event: Event): void {
    event.preventDefault();
    
    const targetElement = document.getElementById(this.target);
    
    if (targetElement) {
      // Make it focusable
      if (!targetElement.hasAttribute('tabindex')) {
        targetElement.setAttribute('tabindex', '-1');
      }
      
      // Focus and scroll
      targetElement.focus();
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Remove tabindex after focus
      setTimeout(() => {
        targetElement.removeAttribute('tabindex');
      }, 100);
    }
  }
}
