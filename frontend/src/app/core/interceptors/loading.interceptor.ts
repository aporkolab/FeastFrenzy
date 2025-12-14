import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../../shared/services/loading.service';

/**
 * URLs to skip loading indicator for.
 * Typically background operations that shouldn't show loading.
 */
const SKIP_LOADING_URLS = [
  '/auth/refresh', // Token refresh is background operation
  '/health',       // Health checks
  '/metrics'       // Metrics endpoints
];

/**
 * HTTP methods to skip loading indicator for.
 * Can be used to skip GET requests if needed.
 */
const SKIP_LOADING_METHODS: string[] = [
  // Add methods to skip, e.g., 'HEAD', 'OPTIONS'
];

/**
 * Loading Interceptor Function
 * 
 * Automatically manages global loading state for HTTP requests.
 * 
 * Features:
 * - Automatic show/hide of loading indicator
 * - URL-based skip list
 * - Method-based skip list
 * - Proper cleanup on success/error/cancel (finalize)
 * - Works with concurrent requests (via LoadingService counter)
 * 
 * Usage:
 * Add to providers in main.ts:
 * ```typescript
 * provideHttpClient(withInterceptors([
 *   authInterceptorFn,
 *   loadingInterceptorFn,
 *   errorInterceptorFn
 * ]))
 * ```
 * 
 * Note: Order matters! Place loading interceptor before error interceptor
 * so loading state is properly managed even on errors.
 */
export const loadingInterceptorFn: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Check if we should skip loading for this request
  const shouldSkip = shouldSkipLoading(req.url, req.method);

  if (shouldSkip) {
    return next(req);
  }

  // Show loading indicator
  loadingService.show();

  return next(req).pipe(
    // Always hide loading, whether success, error, or cancelled
    finalize(() => {
      loadingService.hide();
    })
  );
};

/**
 * Determine if loading indicator should be skipped for this request
 */
function shouldSkipLoading(url: string, method: string): boolean {
  // Check URL skip list
  if (SKIP_LOADING_URLS.some(skipUrl => url.includes(skipUrl))) {
    return true;
  }

  // Check method skip list
  if (SKIP_LOADING_METHODS.includes(method.toUpperCase())) {
    return true;
  }

  return false;
}

/**
 * Optional: Custom header to skip loading for specific requests
 * 
 * Usage in service:
 * ```typescript
 * this.http.get(url, {
 *   headers: { 'X-Skip-Loading': 'true' }
 * });
 * ```
 */
export const SKIP_LOADING_HEADER = 'X-Skip-Loading';

/**
 * Enhanced Loading Interceptor with header support
 * Uncomment to use header-based skip functionality
 */
/*
export const loadingInterceptorFnWithHeaders: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Check for skip header
  if (req.headers.has(SKIP_LOADING_HEADER)) {
    // Clone request without the header (don't send to server)
    const cleanReq = req.clone({
      headers: req.headers.delete(SKIP_LOADING_HEADER)
    });
    return next(cleanReq);
  }

  // Check URL/method skip list
  if (shouldSkipLoading(req.url, req.method)) {
    return next(req);
  }

  loadingService.show();

  return next(req).pipe(
    finalize(() => {
      loadingService.hide();
    })
  );
};
*/
