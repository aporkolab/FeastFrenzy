import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app/app-routing.module';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { authInterceptorFn } from './app/interceptors/auth.interceptor';
import { loadingInterceptorFn, errorInterceptorFn } from './app/core';
import { CustomPreloadingStrategy } from './app/core/preloading/custom-preloading.strategy';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(
      routes,
      withPreloading(CustomPreloadingStrategy) // Custom preloading for marked routes
    ),
    // Interceptor order matters:
    // 1. Auth - adds token
    // 2. Loading - shows/hides spinner
    // 3. Error - handles errors and shows toasts
    provideHttpClient(withInterceptors([
      authInterceptorFn,
      loadingInterceptorFn,
      errorInterceptorFn
    ])),
    provideAnimations(), // Required for toast animations
    importProvidersFrom(FormsModule, ReactiveFormsModule),
  ],
}).catch((err) => console.error(err));
