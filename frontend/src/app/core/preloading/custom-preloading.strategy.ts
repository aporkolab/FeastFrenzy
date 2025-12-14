import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * Custom preloading strategy that only preloads routes marked with:
 * - data: { preload: true } - immediate preload
 * - data: { preload: true, preloadDelay: 2000 } - delayed preload (in ms)
 * 
 * This gives fine-grained control over which modules are preloaded
 * and when, optimizing initial load vs. subsequent navigation.
 */
@Injectable({ providedIn: 'root' })
export class CustomPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    // Check if route should be preloaded
    if (!route.data?.['preload']) {
      return of(null);
    }

    // Check for delayed preloading
    const delay = route.data?.['preloadDelay'];
    if (delay && typeof delay === 'number') {
      // Delayed preload - useful for secondary features
      return timer(delay).pipe(
        mergeMap(() => {
          console.log(`[Preload] Lazy loading ${route.path} after ${delay}ms delay`);
          return load();
        })
      );
    }

    // Immediate preload
    console.log(`[Preload] Preloading ${route.path}`);
    return load();
  }
}
