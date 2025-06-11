import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { EmployeeDetailComponent } from './employee-detail.component';
import { EmployeeService } from '../../service/employee.service';
import { of } from 'rxjs';
import { Employee } from '../../model/employee';

describe('EmployeeDetailComponent', () => {
  let component: EmployeeDetailComponent;
  let fixture: ComponentFixture<EmployeeDetailComponent>;

  beforeEach(async () => {
    const mockEmployee: Employee = { 
      id: 1, 
      employee_number: 'EMP001',
      name: 'Test',
      monthlyConsumptionValue: 50000
    };
    
    
    const employeeSpy = {
      getEmployee: jest.fn().mockReturnValue(of(mockEmployee)),
      getEmployees: jest.fn().mockReturnValue(of([mockEmployee])),
      updateEmployee: jest.fn(),
      deleteEmployee: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [EmployeeDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EmployeeService, useValue: employeeSpy },
        { provide: ActivatedRoute, useValue: {
          paramMap: of({ get: (key: string) => '1' }),
          params: of({ id: 1 }),
          snapshot: {
            paramMap: { get: (key: string) => '1' },
            params: { id: 1 }
          }
        } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
