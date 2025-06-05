import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification interface
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

/**
 * Service for displaying toast notifications.
 * 
 * Features:
 * - Multiple toast types (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Manual dismiss support
 * - Queue management
 * 
 * Usage:
 * ```typescript
 * constructor(private toastService: ToastService) {}
 * 
 * showSuccess() {
 *   this.toastService.success('Operation completed!');
 * }
 * 
 * showError() {
 *   this.toastService.error('Something went wrong', 10000); // 10s duration
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  
  /** Observable stream of active toasts */
  public toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  /** Maximum number of toasts to display at once */
  private readonly MAX_TOASTS = 5;

  /**
   * Display a success toast
   * @param message - Message to display
   * @param duration - Auto-dismiss duration in ms (default: 3000)
   */
  success(message: string, duration = 3000): void {
    this.show('success', message, duration);
  }

  /**
   * Display an error toast
   * @param message - Message to display
   * @param duration - Auto-dismiss duration in ms (default: 5000)
   */
  error(message: string, duration = 5000): void {
    this.show('error', message, duration);
  }

  /**
   * Display a warning toast
   * @param message - Message to display
   * @param duration - Auto-dismiss duration in ms (default: 4000)
   */
  warning(message: string, duration = 4000): void {
    this.show('warning', message, duration);
  }

  /**
   * Display an info toast
   * @param message - Message to display
   * @param duration - Auto-dismiss duration in ms (default: 3000)
   */
  info(message: string, duration = 3000): void {
    this.show('info', message, duration);
  }

  /**
   * Internal method to create and show a toast
   */
  private show(type: ToastType, message: string, duration: number): void {
    const id = this.generateId();
    const toast: Toast = { id, type, message, duration };
    
    // Get current toasts and limit the queue
    let currentToasts = this.toastsSubject.value;
    if (currentToasts.length >= this.MAX_TOASTS) {
      // Remove oldest toast
      currentToasts = currentToasts.slice(1);
    }
    
    this.toastsSubject.next([...currentToasts, toast]);
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  /**
   * Dismiss a toast by ID
   * @param id - Toast ID to dismiss
   */
  dismiss(id: string): void {
    this.toastsSubject.next(
      this.toastsSubject.value.filter(t => t.id !== id)
    );
  }

  /**
   * Dismiss all active toasts
   */
  dismissAll(): void {
    this.toastsSubject.next([]);
  }

  /**
   * Generate a unique ID for a toast
   */
  private generateId(): string {
    // Use crypto.randomUUID if available, fallback to timestamp + random
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
