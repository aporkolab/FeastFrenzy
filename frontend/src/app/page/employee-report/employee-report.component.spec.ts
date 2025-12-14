import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { EmployeeReportComponent } from './employee-report.component';
import { EmployeeService } from '../../service/employee.service';
import { PurchaseService } from '../../service/purchase.service';
import { of } from 'rxjs';

describe('EmployeeReportComponent', () => {
  let component: EmployeeReportComponent;
  let fixture: ComponentFixture<EmployeeReportComponent>;

  beforeEach(async () => {
    const employeeSpy = {
      getEmployees: jest.fn().mockReturnValue(of([])),
      getAllEmployees: jest.fn().mockReturnValue(of([]))
    };

    const purchaseSpy = {
      getPurchases: jest.fn().mockReturnValue(of([])),
      getAllPurchases: jest.fn().mockReturnValue(of([]))
    };

    await TestBed.configureTestingModule({
      imports: [EmployeeReportComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EmployeeService, useValue: employeeSpy },
        { provide: PurchaseService, useValue: purchaseSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
