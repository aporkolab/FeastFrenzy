import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Purchase, EmployeeSummary } from '../model/purchase';
import { PaginatedResponse, PurchaseQueryParams } from '../model/pagination';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, retry, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private readonly apiUrl = `${environment.apiUrl}/purchases`;

  private purchasesSubject = new BehaviorSubject<Purchase[]>([]);
  public purchases$ = this.purchasesSubject.asObservable();

  constructor(private http: HttpClient) {}

  
  getPurchases(params?: PurchaseQueryParams): Observable<PaginatedResponse<Purchase>> {
    const httpParams = this.buildHttpParams(params);
    
    return this.http.get<PaginatedResponse<Purchase>>(this.apiUrl, { params: httpParams }).pipe(
      retry(environment.retryAttempts),
      tap(response => this.purchasesSubject.next(response.data)),
      catchError(this.handleError)
    );
  }

  
  getAllPurchases(): Observable<Purchase[]> {
    return this.getPurchases({ limit: 1000 }).pipe(
      map(response => response.data)
    );
  }

  
  getPurchase(id: number): Observable<Purchase> {
    return this.http.get<Purchase>(`${this.apiUrl}/${id}`).pipe(
      retry(environment.retryAttempts),
      catchError(this.handleError)
    );
  }

  
  createPurchase(purchase: Partial<Purchase>): Observable<Purchase> {
    return this.http.post<Purchase>(this.apiUrl, purchase).pipe(
      tap(() => this.refreshPurchases()),
      catchError(this.handleError)
    );
  }

  
  updatePurchase(id: number, purchase: Partial<Purchase>): Observable<Purchase> {
    return this.http.put<Purchase>(`${this.apiUrl}/${id}`, purchase).pipe(
      tap(() => this.refreshPurchases()),
      catchError(this.handleError)
    );
  }

  
  deletePurchase(purchase: Purchase | number): Observable<void> {
    const id = typeof purchase === 'number' ? purchase : purchase.id;
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshPurchases()),
      catchError(this.handleError)
    );
  }

  
  getPurchasesByEmployee(employeeId: number): Observable<Purchase[]> {
    return this.getPurchases({ employeeId }).pipe(
      map(response => response.data)
    );
  }

  /**
   * Get aggregated spending summaries for all employees
   * Uses optimized SQL GROUP BY on the backend - much faster than fetching all purchases
   */
  getEmployeeSummaries(params: { dateFrom: string; dateTo: string }): Observable<EmployeeSummary[]> {
    const httpParams = new HttpParams()
      .set('from', params.dateFrom)
      .set('to', params.dateTo);

    return this.http.get<EmployeeSummary[]>(`${this.apiUrl}/summaries`, { params: httpParams }).pipe(
      retry(environment.retryAttempts),
      catchError(this.handleError)
    );
  }

  private buildHttpParams(params?: PurchaseQueryParams): HttpParams {
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
    if (params.employeeId !== undefined) {
      httpParams = httpParams.set('employeeId', params.employeeId.toString());
    }
    if (params.closed !== undefined) {
      httpParams = httpParams.set('closed', params.closed.toString());
    }
    if (params.dateFrom) {
      httpParams = httpParams.set('dateFrom', params.dateFrom);
    }
    if (params.dateTo) {
      httpParams = httpParams.set('dateTo', params.dateTo);
    }
    if (params.minTotal !== undefined) {
      httpParams = httpParams.set('minTotal', params.minTotal.toString());
    }
    if (params.maxTotal !== undefined) {
      httpParams = httpParams.set('maxTotal', params.maxTotal.toString());
    }

    return httpParams;
  }

  
  private refreshPurchases(): void {
    this.getPurchases().subscribe();
  }

  
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.error?.message || `Server error: ${error.status} - ${error.statusText}`;
    }

    if (environment.enableLogging) {
      console.error('PurchaseService Error:', errorMessage, error);
    }

    return throwError(() => new Error(errorMessage));
  }
}