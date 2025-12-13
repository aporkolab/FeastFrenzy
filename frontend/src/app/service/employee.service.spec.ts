import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmployeeService } from './employee.service';
import { Employee } from '../model/employee';
import { environment } from '../../environments/environment';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/employees`;

  const mockEmployees: Employee[] = [
    { id: 1, name: 'John Doe', employee_number: 'EMP001', monthlyConsumptionValue: 1000 },
    { id: 2, name: 'Jane Smith', employee_number: 'EMP002', monthlyConsumptionValue: 2000 },
    { id: 3, name: 'Bob Wilson', employee_number: 'EMP003', monthlyConsumptionValue: 1500 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmployeeService]
    });
    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getEmployees', () => {
    it('should return all employees', fakeAsync(() => {
      service.getEmployees().subscribe(employees => {
        expect(employees).toEqual(mockEmployees);
        expect(employees.length).toBe(3);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockEmployees);
      tick();
    }));

    it('should return empty array when no employees', fakeAsync(() => {
      service.getEmployees().subscribe(employees => {
        expect(employees).toEqual([]);
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush([]);
      tick();
    }));

    it('should update employees$ observable', fakeAsync(() => {
      let emittedEmployees: Employee[] = [];
      service.employees$.subscribe(employees => {
        emittedEmployees = employees;
      });

      service.getEmployees().subscribe();

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockEmployees);
      tick();

      expect(emittedEmployees).toEqual(mockEmployees);
    }));
  });

  describe('getEmployee', () => {
    it('should return single employee by ID', fakeAsync(() => {
      const expectedEmployee = mockEmployees[0];

      service.getEmployee(1).subscribe(employee => {
        expect(employee).toEqual(expectedEmployee);
        expect(employee.employee_number).toBe('EMP001');
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedEmployee);
      tick();
    }));
  });

  describe('addEmployee', () => {
    it('should create a new employee', fakeAsync(() => {
      const newEmployee = {
        name: 'New Employee',
        employee_number: 'EMP004',
        monthlyConsumptionValue: 500
      };
      const createdEmployee: Employee = { id: 4, ...newEmployee };

      service.addEmployee(newEmployee).subscribe(employee => {
        expect(employee).toEqual(createdEmployee);
        expect(employee.id).toBe(4);
      });

      
      const postReq = httpMock.expectOne(apiUrl);
      expect(postReq.request.method).toBe('POST');
      expect(postReq.request.body).toEqual(newEmployee);
      postReq.flush(createdEmployee);
      tick();

      
      const refreshReq = httpMock.expectOne(apiUrl);
      expect(refreshReq.request.method).toBe('GET');
      refreshReq.flush(mockEmployees);
      tick();
    }));
  });

  describe('updateEmployee', () => {
    it('should update an existing employee', fakeAsync(() => {
      const updatedEmployee: Employee = {
        ...mockEmployees[0],
        name: 'Updated Name',
        monthlyConsumptionValue: 1500
      };

      service.updateEmployee(updatedEmployee).subscribe(employee => {
        expect(employee).toEqual(updatedEmployee);
        expect(employee.name).toBe('Updated Name');
      });

      const putReq = httpMock.expectOne(`${apiUrl}/1`);
      expect(putReq.request.method).toBe('PUT');
      putReq.flush(updatedEmployee);
      tick();

      
      const refreshReq = httpMock.expectOne(apiUrl);
      refreshReq.flush(mockEmployees);
      tick();
    }));
  });

  describe('deleteEmployee', () => {
    it('should delete an employee', fakeAsync(() => {
      service.deleteEmployee(1).subscribe(() => {
        expect(true).toBe(true);
      });

      const deleteReq = httpMock.expectOne(`${apiUrl}/1`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush({ deleted: true, id: 1 });
      tick();

      
      const refreshReq = httpMock.expectOne(apiUrl);
      refreshReq.flush(mockEmployees);
      tick();
    }));
  });
});
