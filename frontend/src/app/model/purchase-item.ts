import { Product } from './product';

export interface PurchaseItem {
  id: number;
  productId: number;
  purchaseId: number;
  quantity: number;
  product?: Product; // Populated by backend with eager loading
}


export interface CreatePurchaseItemDto {
  productId: number;
  purchaseId: number;
  quantity: number;
}


export interface UpdatePurchaseItemDto {
  quantity?: number;
}