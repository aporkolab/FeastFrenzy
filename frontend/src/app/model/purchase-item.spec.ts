import { PurchaseItem, CreatePurchaseItemDto, UpdatePurchaseItemDto } from './purchase-item';

describe('PurchaseItem Interface', () => {
  it('should allow creating valid purchase item object', () => {
    const item: PurchaseItem = {
      id: 1,
      productId: 10,
      purchaseId: 5,
      quantity: 2,
      price: 25.00
    };

    expect(item.id).toBe(1);
    expect(item.productId).toBe(10);
    expect(item.purchaseId).toBe(5);
    expect(item.quantity).toBe(2);
    expect(item.price).toBe(25.00);
  });

  it('should allow creating valid CreatePurchaseItemDto', () => {
    const dto: CreatePurchaseItemDto = {
      productId: 10,
      purchaseId: 5,
      quantity: 3,
      price: 30.00
    };

    expect(dto.productId).toBe(10);
    expect(dto.purchaseId).toBe(5);
    expect(dto.quantity).toBe(3);
    expect(dto.price).toBe(30.00);
  });

  it('should allow partial UpdatePurchaseItemDto', () => {
    const dto: UpdatePurchaseItemDto = {
      quantity: 5
    };

    expect(dto.quantity).toBe(5);
    expect(dto.price).toBeUndefined();
  });
});
