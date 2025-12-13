import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Product } from '../model/product';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly apiUrl = `${environment.apiUrl}/products`;

  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();

  constructor(private http: HttpClient) {}

  
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl).pipe(
      retry(environment.retryAttempts),
      tap(products => this.productsSubject.next(products)),
      catchError(this.handleError)
    );
  }

  
  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`).pipe(
      retry(environment.retryAttempts),
      catchError(this.handleError)
    );
  }

  
  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product).pipe(
      tap(() => this.refreshProducts()),
      catchError(this.handleError)
    );
  }

  
  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, product).pipe(
      tap(() => this.refreshProducts()),
      catchError(this.handleError)
    );
  }

  
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshProducts()),
      catchError(this.handleError)
    );
  }

  
  getProductReport(month: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}?month=${month}`).pipe(
      catchError(this.handleError)
    );
  }

  
  private refreshProducts(): void {
    this.getProducts().subscribe();
  }

  
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      
      errorMessage = error.error?.error?.message || `Server error: ${error.status} - ${error.statusText}`;
    }

    if (environment.enableLogging) {
      console.error('ProductService Error:', errorMessage, error);
    }

    return throwError(() => new Error(errorMessage));
  }
}
