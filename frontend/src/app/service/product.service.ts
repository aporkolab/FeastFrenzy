import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Product } from '../model/product';
import { PaginatedResponse, ProductQueryParams } from '../model/pagination';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, retry, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly apiUrl = `${environment.apiUrl}/products`;

  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();

  constructor(private http: HttpClient) {}

  
  getProducts(params?: ProductQueryParams): Observable<PaginatedResponse<Product>> {
    const httpParams = this.buildHttpParams(params);
    
    return this.http.get<PaginatedResponse<Product>>(this.apiUrl, { params: httpParams }).pipe(
      retry(environment.retryAttempts),
      tap(response => this.productsSubject.next(response.data)),
      catchError(this.handleError)
    );
  }

  
  getAllProducts(): Observable<Product[]> {
    return this.getProducts({ limit: 1000 }).pipe(
      map(response => response.data)
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
    return this.http.get<PaginatedResponse<Product>>(`${this.apiUrl}?month=${month}`).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  
  private buildHttpParams(params?: ProductQueryParams): HttpParams {
    let httpParams = new HttpParams();
    
    if (!params) return httpParams;

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    if (params.name) {
      httpParams = httpParams.set('name', params.name);
    }
    if (params.minPrice !== undefined) {
      httpParams = httpParams.set('minPrice', params.minPrice.toString());
    }
    if (params.maxPrice !== undefined) {
      httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
    }

    return httpParams;
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
