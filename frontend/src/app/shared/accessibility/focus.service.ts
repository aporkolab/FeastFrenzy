import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, Subscription } from 'rxjs';
import { AnnouncerService } from './announcer.service';

/**
 * Focus Management Service
 * 
 * Manages focus on route changes for accessibility.
 * Ensures screen reader users are aware of page changes.
 * 
 * Should be initialized in the root component.
 */
@Injectable({ providedIn: 'root' })
export class FocusService implements OnDestroy {
  private router = inject(Router);
  private titleService = inject(Title);
  private announcer = inject(AnnouncerService);
  private subscription: Subscription | null = null;

  /**
   * Initialize focus management.
   * Call this once in your root component's ngOnInit.
   */
  init(): void {
    if (this.subscription) {
      return; // Already initialized
    }

    this.subscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.handleNavigation();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Move focus to the main content area
   */
  focusMainContent(): void {
    const main = document.getElementById('main-content');
    
    if (main) {
      // Make it focusable temporarily if needed
      if (!main.hasAttribute('tabindex')) {
        main.setAttribute('tabindex', '-1');
      }
      
      main.focus({ preventScroll: false });
      
      // Remove tabindex after focus to maintain normal tab order
      setTimeout(() => {
        main.removeAttribute('tabindex');
      }, 100);
    }
  }

  /**
   * Focus the first heading (h1) on the page
   */
  focusFirstHeading(): void {
    const heading = document.querySelector('h1');
    
    if (heading) {
      if (!heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1');
      }
      
      heading.focus({ preventScroll: false });
      
      setTimeout(() => {
        heading.removeAttribute('tabindex');
      }, 100);
    }
  }

  /**
   * Set focus to a specific element by ID
   */
  focusElement(elementId: string): void {
    const element = document.getElementById(elementId);
    
    if (element instanceof HTMLElement) {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '-1');
      }
      
      element.focus({ preventScroll: false });
    }
  }

  /**
   * Reset focus to the beginning of the page (skip link target)
   */
  resetFocus(): void {
    const skipTarget = document.getElementById('main-content') || document.body;
    
    if (skipTarget) {
      skipTarget.scrollIntoView();
      this.focusMainContent();
    }
  }

  private handleNavigation(): void {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      const pageTitle = this.titleService.getTitle();
      
      // Move focus to main content
      this.focusMainContent();
      
      // Announce the navigation
      this.announcer.announceNavigation(pageTitle);
    }, 100);
  }
}
