import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app/app-routing.module';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { authInterceptorFn } from './app/interceptors/auth.interceptor';
import { CustomPreloadingStrategy } from './app/core/preloading/custom-preloading.strategy';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(
      routes,
      withPreloading(CustomPreloadingStrategy) // Custom preloading for marked routes
    ),
    provideHttpClient(withInterceptors([authInterceptorFn])),
    importProvidersFrom(FormsModule, ReactiveFormsModule),
  ],
}).catch((err) => console.error(err));
