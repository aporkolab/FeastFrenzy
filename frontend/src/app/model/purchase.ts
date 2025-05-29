import { PurchaseItem } from './purchase-item';
import { Employee } from './employee';

export interface Purchase {
  id: number;
  date: string;
  closed: boolean;
  employeeId: number;
  userId?: number;
  total: number;
  purchaseItems?: PurchaseItem[];
  employee?: Employee; // Populated by backend with eager loading
}


export interface CreatePurchaseDto {
  date: string;
  employeeId: number;
  total?: number;
  closed?: boolean;
}


export interface UpdatePurchaseDto {
  date?: string;
  employeeId?: number;
  closed?: boolean;
  total?: number;
}

/**
 * Aggregated employee spending summary from optimized backend endpoint
 */
export interface EmployeeSummary {
  employeeId: number;
  totalSpending: number;
  purchaseCount: number;
}
