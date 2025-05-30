import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpHandlerFn
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { inject } from '@angular/core';
import { AuthService } from '../service/auth.service';
import { environment } from '../../environments/environment';


const AUTH_WHITELIST = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh'
];


function isWhitelisted(url: string): boolean {
  return AUTH_WHITELIST.some(path => url.includes(path));
}


@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    
    if (isWhitelisted(request.url)) {
      return next.handle(request);
    }

    
    const token = this.authService.getAccessToken();
    if (token) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap(tokens => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(tokens.accessToken);
          return next.handle(this.addToken(request, tokens.accessToken));
        }),
        catchError(error => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => error);
        })
      );
    }

    
    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next.handle(this.addToken(request, token!)))
    );
  }
}


export const authInterceptorFn: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  
  if (isWhitelisted(req.url)) {
    return next(req);
  }

  
  const token = authService.getAccessToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isWhitelisted(req.url)) {
        
        return authService.refreshToken().pipe(
          switchMap(tokens => {
            const newReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${tokens.accessToken}`
              }
            });
            return next(newReq);
          }),
          catchError(refreshError => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
