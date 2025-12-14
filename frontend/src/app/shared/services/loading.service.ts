import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';

/**
 * Service for managing global loading state.
 * 
 * Uses a request counter to handle concurrent requests properly.
 * Loading state is only set to false when ALL requests have completed.
 * 
 * Features:
 * - Request counting for concurrent calls
 * - Debounced loading state (prevents flicker for fast requests)
 * - Safe decrement (prevents negative counts)
 * - Force reset capability
 * 
 * Usage:
 * ```typescript
 * // In a component
 * loading$ = inject(LoadingService).loading$;
 * 
 * // In template
 * <app-loading-spinner *ngIf="loading$ | async" [overlay]="true"></app-loading-spinner>
 * ```
 * 
 * Note: Typically used with LoadingInterceptor for automatic HTTP request tracking.
 */
@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private requestCount = 0;

  /** 
   * Debounce time to prevent loading flicker for fast requests.
   * If a request completes within this time, no loading indicator is shown.
   */
  private readonly DEBOUNCE_MS = 100;

  /** 
   * Observable of loading state.
   * Debounced to prevent flicker on fast requests.
   */
  public loading$: Observable<boolean> = this.loadingSubject.pipe(
    debounceTime(this.DEBOUNCE_MS),
    distinctUntilChanged()
  );

  /**
   * Raw loading state without debounce.
   * Use when immediate feedback is required.
   */
  public loadingImmediate$: Observable<boolean> = this.loadingSubject.asObservable();

  /**
   * Show loading indicator.
   * Increments the request counter.
   */
  show(): void {
    this.requestCount++;
    this.loadingSubject.next(true);
  }

  /**
   * Hide loading indicator.
   * Decrements the request counter.
   * Only hides when counter reaches 0.
   */
  hide(): void {
    this.requestCount = Math.max(0, this.requestCount - 1);
    if (this.requestCount === 0) {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Force reset loading state.
   * Use with caution - only for error recovery scenarios.
   */
  forceReset(): void {
    this.requestCount = 0;
    this.loadingSubject.next(false);
  }

  /**
   * Get current loading state synchronously.
   */
  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Get current request count.
   * Useful for debugging.
   */
  getRequestCount(): number {
    return this.requestCount;
  }
}
