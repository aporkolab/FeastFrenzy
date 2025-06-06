import { Injectable, OnDestroy } from '@angular/core';

/**
 * Live Announcer Service
 * 
 * Announces messages to screen readers using ARIA live regions.
 * Essential for dynamic content changes, form submissions, errors, etc.
 * 
 * Usage:
 * ```typescript
 * constructor(private announcer: AnnouncerService) {}
 * 
 * onSave() {
 *   this.announcer.announce('Product saved successfully');
 * }
 * 
 * onError() {
 *   this.announcer.announce('Error saving product', 'assertive');
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AnnouncerService implements OnDestroy {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;
  private announceTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.createLiveRegions();
  }

  ngOnDestroy(): void {
    this.clearTimeout();
    this.politeRegion?.remove();
    this.assertiveRegion?.remove();
  }

  /**
   * Announce a message to screen readers
   * 
   * @param message - The message to announce
   * @param politeness - 'polite' waits for user to finish, 'assertive' interrupts
   * @param duration - How long the message stays in the live region (ms)
   */
  announce(
    message: string, 
    politeness: 'polite' | 'assertive' = 'polite',
    duration = 1000
  ): void {
    const region = politeness === 'assertive' 
      ? this.assertiveRegion 
      : this.politeRegion;

    if (!region) {
      return;
    }

    this.clearTimeout();

    // Clear and set in separate frames to ensure announcement
    region.textContent = '';
    
    this.announceTimeout = setTimeout(() => {
      region.textContent = message;
      
      // Clear after duration
      this.announceTimeout = setTimeout(() => {
        region.textContent = '';
      }, duration);
    }, 100);
  }

  /**
   * Announce form errors to screen readers
   */
  announceFormError(errorCount: number): void {
    const message = errorCount === 1
      ? 'Form has 1 error. Please correct it before submitting.'
      : `Form has ${errorCount} errors. Please correct them before submitting.`;
    
    this.announce(message, 'assertive');
  }

  /**
   * Announce successful form submission
   */
  announceSuccess(action: string): void {
    this.announce(`${action} completed successfully`, 'polite');
  }

  /**
   * Announce loading state
   */
  announceLoading(isLoading: boolean, context?: string): void {
    if (isLoading) {
      const message = context 
        ? `Loading ${context}...` 
        : 'Loading, please wait...';
      this.announce(message, 'polite');
    } else if (context) {
      this.announce(`${context} loaded`, 'polite');
    }
  }

  /**
   * Announce page navigation
   */
  announceNavigation(pageTitle: string): void {
    this.announce(`Navigated to ${pageTitle}`, 'polite');
  }

  /**
   * Announce table sort change
   */
  announceSortChange(column: string, direction: 'ascending' | 'descending'): void {
    this.announce(`Sorted by ${column}, ${direction}`, 'polite');
  }

  /**
   * Announce pagination
   */
  announcePagination(page: number, totalPages: number): void {
    this.announce(`Page ${page} of ${totalPages}`, 'polite');
  }

  private createLiveRegions(): void {
    // Polite live region
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('role', 'status');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.applyHiddenStyles(this.politeRegion);
    document.body.appendChild(this.politeRegion);

    // Assertive live region (for urgent announcements)
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('role', 'alert');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.applyHiddenStyles(this.assertiveRegion);
    document.body.appendChild(this.assertiveRegion);
  }

  private applyHiddenStyles(el: HTMLElement): void {
    Object.assign(el.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0'
    });
  }

  private clearTimeout(): void {
    if (this.announceTimeout) {
      clearTimeout(this.announceTimeout);
      this.announceTimeout = null;
    }
  }
}
