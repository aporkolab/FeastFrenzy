import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, retry } from 'rxjs/operators';
import { Employee } from '../model/employee';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private readonly apiUrl = `${environment.apiUrl}/employees`;

  private employeesSubject = new BehaviorSubject<Employee[]>([]);
  public employees$ = this.employeesSubject.asObservable();

  constructor(private http: HttpClient) {}

  
  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.apiUrl).pipe(
      retry(environment.retryAttempts),
      tap(employees => this.employeesSubject.next(employees)),
      catchError(this.handleError)
    );
  }

  
  getEmployee(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`).pipe(
      retry(environment.retryAttempts),
      catchError(this.handleError)
    );
  }

  
  addEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, employee).pipe(
      tap(() => this.refreshEmployees()),
      catchError(this.handleError)
    );
  }

  
  updateEmployee(employee: Employee): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/${employee.id}`, employee).pipe(
      tap(() => this.refreshEmployees()),
      catchError(this.handleError)
    );
  }

  
  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshEmployees()),
      catchError(this.handleError)
    );
  }

  
  private refreshEmployees(): void {
    this.getEmployees().subscribe();
  }

  
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.error?.message || `Server error: ${error.status} - ${error.statusText}`;
    }

    if (environment.enableLogging) {
      console.error('EmployeeService Error:', errorMessage, error);
    }

    return throwError(() => new Error(errorMessage));
  }
}
