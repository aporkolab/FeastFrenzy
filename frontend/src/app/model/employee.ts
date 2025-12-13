
export interface Employee {
  id: number;
  name: string;
  employee_number: string;
  monthlyConsumptionValue: number;
}


export interface CreateEmployeeDto {
  name: string;
  employee_number: string;
  monthlyConsumptionValue: number;
}


export interface UpdateEmployeeDto {
  name?: string;
  employee_number?: string;
  monthlyConsumptionValue?: number;
}