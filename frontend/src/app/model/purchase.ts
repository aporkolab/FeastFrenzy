import { PurchaseItem } from './purchase-item';


export interface Purchase {
  id: number;
  date: string; 
  closed: boolean;
  employeeId: number;
  total: number;
  purchaseItems?: PurchaseItem[];
}


export interface CreatePurchaseDto {
  date: string;
  employeeId: number;
  total?: number;
  closed?: boolean;
}


export interface UpdatePurchaseDto {
  date?: string;
  closed?: boolean;
  total?: number;
}