import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { PurchaseItem, CreatePurchaseItemDto, UpdatePurchaseItemDto } from '../model/purchase-item';
import { PaginatedResponse } from '../model/pagination';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PurchaseItemService {
  private readonly apiUrl = `${environment.apiUrl}/purchase-items`;

  constructor(private http: HttpClient) {}

  /**
   * Get all items for a specific purchase
   */
  getPurchaseItems(purchaseId: number): Observable<PurchaseItem[]> {
    return this.http.get<PaginatedResponse<PurchaseItem>>(`${this.apiUrl}?purchaseId=${purchaseId}&limit=1000`).pipe(
      retry(environment.retryAttempts),
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get a single purchase item by ID
   */
  getPurchaseItem(id: number): Observable<PurchaseItem> {
    return this.http.get<PurchaseItem>(`${this.apiUrl}/${id}`).pipe(
      retry(environment.retryAttempts),
      catchError(this.handleError)
    );
  }

  /**
   * Create a new purchase item
   */
  createPurchaseItem(item: CreatePurchaseItemDto): Observable<PurchaseItem> {
    return this.http.post<PurchaseItem>(this.apiUrl, item).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing purchase item
   */
  updatePurchaseItem(id: number, item: UpdatePurchaseItemDto): Observable<PurchaseItem> {
    return this.http.put<PurchaseItem>(`${this.apiUrl}/${id}`, item).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete a purchase item
   */
  deletePurchaseItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Error handler
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.error?.message || `Server error: ${error.status} - ${error.statusText}`;
    }

    if (environment.enableLogging) {
      console.error('PurchaseItemService Error:', errorMessage, error);
    }

    return throwError(() => new Error(errorMessage));
  }
}
