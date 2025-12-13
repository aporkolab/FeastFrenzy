import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmployeeService } from './employee.service';
import { Employee } from '../model/employee';
import { environment } from '../../environments/environment';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/employees`;

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

  it('should get all employees', fakeAsync(() => {
    const mockEmployees: Employee[] = [{ 
      id: 1, 
      employee_number: 'EMP001',
      name: 'Test',
      monthlyConsumptionValue: 50000
    }];

    service.getEmployees().subscribe((employees: Employee[]) => {
      expect(employees).toEqual(mockEmployees);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockEmployees);
    tick();
  }));

  it('should get one employee', fakeAsync(() => {
    const mockEmployee: Employee = { 
      id: 1, 
      employee_number: 'EMP001',
      name: 'Test',
      monthlyConsumptionValue: 50000
    };

    service.getEmployee(1).subscribe((employee: Employee) => {
      expect(employee).toEqual(mockEmployee);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEmployee);
    tick();
  }));
});
