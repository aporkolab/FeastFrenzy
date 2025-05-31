import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmployeeService } from './employee.service';
import { Employee } from '../model/employee';
import { PaginatedResponse } from '../model/pagination';
import { environment } from '../../environments/environment';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/employees`;

  const mockEmployee: Employee = { 
    id: 1, 
    employee_number: 'EMP001',
    name: 'Test',
    monthlyConsumptionValue: 50000
  };

  const mockPaginatedResponse: PaginatedResponse<Employee> = {
    data: [mockEmployee],
    meta: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EmployeeService
      ]
    });

    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get paginated employees', fakeAsync(() => {
    service.getEmployees().subscribe((response) => {
      expect(response.data).toEqual([mockEmployee]);
      expect(response.meta.total).toBe(1);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockPaginatedResponse);
    tick();
  }));

  it('should get all employees with deprecated method', fakeAsync(() => {
    service.getAllEmployees().subscribe((employees: Employee[]) => {
      expect(employees).toEqual([mockEmployee]);
    });

    const req = httpMock.expectOne(`${apiUrl}?limit=1000`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPaginatedResponse);
    tick();
  }));

  it('should get one employee', fakeAsync(() => {
    service.getEmployee(1).subscribe((employee: Employee) => {
      expect(employee).toEqual(mockEmployee);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEmployee);
    tick();
  }));
});
