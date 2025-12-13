import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { EmployeesComponent } from './employees.component';
import { EmployeeService } from '../../service/employee.service';
import { of } from 'rxjs';
import { Employee } from '../../model/employee';

describe('EmployeesComponent', () => {
  let component: EmployeesComponent;
  let fixture: ComponentFixture<EmployeesComponent>;

  beforeEach(async () => {
    const mockEmployees: Employee[] = [{ 
      id: 1, 
      employee_number: 'EMP001',
      name: 'Test',
      monthlyConsumptionValue: 50000
    }];
    
    
    const employeeSpy = {
      getEmployees: jest.fn().mockReturnValue(of(mockEmployees)),
      getEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      deleteEmployee: jest.fn().mockReturnValue(of(void 0))
    };

    await TestBed.configureTestingModule({
      imports: [EmployeesComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EmployeeService, useValue: employeeSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
