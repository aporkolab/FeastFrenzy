export interface Employee {
  id: number;
  name: string;
  employee_number: string;
  monthlyConsumptionValue: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null; // Soft delete timestamp
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