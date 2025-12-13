import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from './employee';

describe('Employee Interface', () => {
  it('should allow creating valid employee object', () => {
    const employee: Employee = {
      id: 1,
      name: 'John Doe',
      employee_number: 'EMP001',
      monthlyConsumptionValue: 1000
    };

    expect(employee.id).toBe(1);
    expect(employee.name).toBe('John Doe');
    expect(employee.employee_number).toBe('EMP001');
    expect(employee.monthlyConsumptionValue).toBe(1000);
  });

  it('should allow creating valid CreateEmployeeDto', () => {
    const dto: CreateEmployeeDto = {
      name: 'New Employee',
      employee_number: 'EMP002',
      monthlyConsumptionValue: 500
    };

    expect(dto.name).toBe('New Employee');
    expect(dto.employee_number).toBe('EMP002');
    expect(dto.monthlyConsumptionValue).toBe(500);
  });

  it('should allow partial UpdateEmployeeDto', () => {
    const dto: UpdateEmployeeDto = {
      name: 'Updated Name'
    };

    expect(dto.name).toBe('Updated Name');
    expect(dto.employee_number).toBeUndefined();
    expect(dto.monthlyConsumptionValue).toBeUndefined();
  });
});
