import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Purchase } from '../model/purchase';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private readonly apiUrl = `${environment.apiUrl}/purchases`;

  private purchasesSubject = new BehaviorSubject<Purchase[]>([]);
  public purchases$ = this.purchasesSubject.asObservable();

  constructor(private http: HttpClient) {}

  
  getPurchases(): Observable<Purchase[]> {
    return this.http.get<Purchase[]>(this.apiUrl).pipe(
      retry(environment.retryAttempts),
      tap(purchases => this.purchasesSubject.next(purchases)),
      catchError(this.handleError)
    );
  }

  
  getPurchase(id: number): Observable<Purchase> {
    return this.http.get<Purchase>(`${this.apiUrl}/${id}`).pipe(
      retry(environment.retryAttempts),
      catchError(this.handleError)
    );
  }

  
  addPurchase(purchase: Partial<Purchase>): Observable<Purchase> {
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
    return this.http.get<Purchase[]>(`${this.apiUrl}?employeeId=${employeeId}`).pipe(
      catchError(this.handleError)
    );
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