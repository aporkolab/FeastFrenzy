import { 
  Directive, 
  ElementRef, 
  AfterViewInit, 
  OnDestroy, 
  Input,
  HostListener 
} from '@angular/core';

/**
 * Focus Trap Directive
 * 
 * Traps keyboard focus within an element (essential for modals/dialogs).
 * When the user tabs past the last focusable element, focus wraps to the first.
 * 
 * Usage:
 * ```html
 * <div role="dialog" focusTrap [focusTrapActive]="isOpen">
 *   <!-- Dialog content -->
 * </div>
 * ```
 */
@Directive({
  selector: '[focusTrap]',
  standalone: true
})
export class FocusTrapDirective implements AfterViewInit, OnDestroy {
  /**
   * Whether the focus trap is currently active.
   * Should be set to true when modal opens, false when it closes.
   */
  @Input() focusTrapActive = true;

  /**
   * Auto-focus the first focusable element when trap activates.
   */
  @Input() focusTrapAutoFocus = true;

  /**
   * Element to restore focus to when trap deactivates.
   */
  @Input() focusTrapRestoreEl?: HTMLElement;

  private focusableElementsSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');

  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;
  private previouslyFocused: HTMLElement | null = null;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement;
    
    if (this.focusTrapActive) {
      this.activate();
    }
  }

  ngOnDestroy(): void {
    this.deactivate();
  }

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.focusTrapActive || event.key !== 'Tab') {
      return;
    }

    this.updateFocusableElements();

    if (!this.firstFocusable || !this.lastFocusable) {
      event.preventDefault();
      return;
    }

    const activeElement = document.activeElement;

    // Shift+Tab from first element -> wrap to last
    if (event.shiftKey && activeElement === this.firstFocusable) {
      event.preventDefault();
      this.lastFocusable.focus();
    }
    // Tab from last element -> wrap to first
    else if (!event.shiftKey && activeElement === this.lastFocusable) {
      event.preventDefault();
      this.firstFocusable.focus();
    }
  }

  @HostListener('keydown.escape', ['$event'])
  handleEscape(event: Event): void {
    // Escape handling should be done by the parent component
    // This just ensures the event is captured
  }

  /**
   * Activate the focus trap
   */
  activate(): void {
    this.updateFocusableElements();
    
    if (this.focusTrapAutoFocus && this.firstFocusable) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        this.firstFocusable?.focus();
      }, 0);
    }
  }

  /**
   * Deactivate the focus trap and restore focus
   */
  deactivate(): void {
    const restoreTarget = this.focusTrapRestoreEl || this.previouslyFocused;
    
    if (restoreTarget && typeof restoreTarget.focus === 'function') {
      setTimeout(() => {
        restoreTarget.focus();
      }, 0);
    }
  }

  /**
   * Update the list of focusable elements
   */
  private updateFocusableElements(): void {
    const focusableElements = this.el.nativeElement.querySelectorAll(
      this.focusableElementsSelector
    ) as NodeListOf<HTMLElement>;

    const visibleElements = Array.from(focusableElements).filter(el => {
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    });

    this.firstFocusable = visibleElements[0] || null;
    this.lastFocusable = visibleElements[visibleElements.length - 1] || null;
  }
}
