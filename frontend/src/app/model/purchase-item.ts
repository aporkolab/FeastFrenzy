
export interface PurchaseItem {
  id: number;
  productId: number;
  purchaseId: number;
  quantity: number;
  price: number;
}


export interface CreatePurchaseItemDto {
  productId: number;
  purchaseId: number;
  quantity: number;
  price: number;
}


export interface UpdatePurchaseItemDto {
  quantity?: number;
  price?: number;
}