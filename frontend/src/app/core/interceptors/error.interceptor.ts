import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpErrorResponse
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';

/**
 * Error response structure from the API
 */
interface ApiErrorResponse {
  error?: {
    message?: string;
    code?: string;
    details?: ValidationErrorDetail[];
  };
  message?: string;
}

/**
 * Validation error detail structure
 */
interface ValidationErrorDetail {
  field?: string;
  message: string;
}

/**
 * URLs to skip error handling for (handled elsewhere)
 */
const SKIP_ERROR_HANDLING = [
  '/auth/refresh' // Auth interceptor handles token refresh errors
];

/**
 * Error Interceptor Function
 * 
 * Handles HTTP errors globally and displays appropriate toast notifications.
 * 
 * Features:
 * - Status-code specific error messages
 * - Validation error formatting (422)
 * - Navigation on 403 (Forbidden)
 * - Network error detection
 * - Skips certain URLs (auth refresh handled separately)
 * 
 * Error Handling Strategy:
 * - 400: Bad Request - shows API message or default
 * - 401: Unauthorized - skipped (auth interceptor handles)
 * - 403: Forbidden - navigates to /unauthorized
 * - 404: Not Found
 * - 409: Conflict - shows API message
 * - 422: Validation - formats field errors
 * - 500: Server Error
 * - 0: Network Error
 */
export const errorInterceptorFn: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const router = inject(Router);

  // Skip error handling for certain URLs
  if (SKIP_ERROR_HANDLING.some(url => req.url.includes(url))) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';
      let shouldShowToast = true;

      // Parse error response
      const errorBody = error.error as ApiErrorResponse | null;

      switch (error.status) {
        case 400:
          // Bad Request
          message = errorBody?.error?.message 
            || errorBody?.message 
            || 'Invalid request. Please check your input.';
          break;

        case 401:
          // Unauthorized - Auth interceptor handles this
          // Don't show toast, auth interceptor will handle refresh/logout
          shouldShowToast = false;
          break;

        case 403:
          // Forbidden - User doesn't have permission
          message = 'You do not have permission to perform this action';
          router.navigate(['/unauthorized']);
          break;

        case 404:
          // Not Found
          message = errorBody?.error?.message 
            || 'The requested resource was not found';
          break;

        case 409:
          // Conflict (e.g., duplicate entry)
          message = errorBody?.error?.message 
            || errorBody?.message 
            || 'A conflict occurred. The resource may already exist.';
          break;

        case 422:
          // Validation Error
          message = formatValidationErrors(errorBody?.error?.details);
          break;

        case 423:
          // Locked (e.g., account locked)
          message = errorBody?.error?.message 
            || errorBody?.message 
            || 'This resource is currently locked';
          break;

        case 429:
          // Too Many Requests
          message = 'Too many requests. Please wait a moment and try again.';
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server Errors
          message = 'Server error. Please try again later.';
          // Log server errors for debugging
          console.error('Server Error:', error);
          break;

        case 0:
          // Network Error (no response)
          message = 'Unable to connect to server. Please check your internet connection.';
          break;

        default:
          // Unknown error
          message = errorBody?.error?.message 
            || errorBody?.message 
            || `Error ${error.status}: ${error.statusText}`;
      }

      // Show toast notification (unless suppressed)
      if (shouldShowToast) {
        toastService.error(message);
      }

      // Re-throw the error for component-level handling if needed
      return throwError(() => error);
    })
  );
};

/**
 * Format validation errors into a readable string
 */
function formatValidationErrors(details: ValidationErrorDetail[] | undefined): string {
  if (!details || details.length === 0) {
    return 'Validation failed. Please check your input.';
  }

  // If there's only one error, show it directly
  if (details.length === 1) {
    return details[0].message;
  }

  // Multiple errors - show as list
  const errorMessages = details.map(d => {
    if (d.field) {
      return `${d.field}: ${d.message}`;
    }
    return d.message;
  });

  // Join with commas, max 3 errors to avoid overwhelming the user
  if (errorMessages.length > 3) {
    return errorMessages.slice(0, 3).join(', ') + '...';
  }

  return errorMessages.join(', ');
}
