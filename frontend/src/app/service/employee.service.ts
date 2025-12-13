import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, retry, map } from 'rxjs/operators';
import { Employee } from '../model/employee';
import { PaginatedResponse, EmployeeQueryParams } from '../model/pagination';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private readonly apiUrl = `${environment.apiUrl}/employees`;

  private employeesSubject = new BehaviorSubject<Employee[]>([]);
  public employees$ = this.employeesSubject.asObservable();

  constructor(private http: HttpClient) {}

  
  getEmployees(params?: EmployeeQueryParams): Observable<PaginatedResponse<Employee>> {
    const httpParams = this.buildHttpParams(params);
    
    return this.http.get<PaginatedResponse<Employee>>(this.apiUrl, { params: httpParams }).pipe(
      retry(environment.retryAttempts),
      tap(response => this.employeesSubject.next(response.data)),
      catchError(this.handleError)
    );
  }

  
  getAllEmployees(): Observable<Employee[]> {
    return this.getEmployees({ limit: 1000 }).pipe(
      map(response => response.data)
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

  
  private buildHttpParams(params?: EmployeeQueryParams): HttpParams {
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
    if (params.employee_number) {
      httpParams = httpParams.set('employee_number', params.employee_number);
    }
    if (params.minConsumption !== undefined) {
      httpParams = httpParams.set('minConsumption', params.minConsumption.toString());
    }
    if (params.maxConsumption !== undefined) {
      httpParams = httpParams.set('maxConsumption', params.maxConsumption.toString());
    }

    return httpParams;
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
