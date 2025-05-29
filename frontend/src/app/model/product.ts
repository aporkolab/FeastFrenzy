import { PurchaseItem } from './purchase-item';


export interface Product {
  id: number;
  name: string;
  price: number;
  purchaseItems?: PurchaseItem[];
}


export interface CreateProductDto {
  name: string;
  price: number;
}


export interface UpdateProductDto {
  name?: string;
  price?: number;
}