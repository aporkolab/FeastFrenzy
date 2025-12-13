import { Purchase, CreatePurchaseDto, UpdatePurchaseDto } from './purchase';

describe('Purchase Interface', () => {
  it('should allow creating valid purchase object', () => {
    const purchase: Purchase = {
      id: 1,
      date: '2024-01-15T10:00:00Z',
      closed: false,
      employeeId: 1,
      total: 50.00
    };

    expect(purchase.id).toBe(1);
    expect(purchase.date).toBe('2024-01-15T10:00:00Z');
    expect(purchase.closed).toBe(false);
    expect(purchase.employeeId).toBe(1);
    expect(purchase.total).toBe(50.00);
  });

  it('should allow optional purchaseItems', () => {
    const purchase: Purchase = {
      id: 1,
      date: '2024-01-15T10:00:00Z',
      closed: false,
      employeeId: 1,
      total: 50.00,
      purchaseItems: []
    };

    expect(purchase.purchaseItems).toEqual([]);
  });

  it('should allow creating valid CreatePurchaseDto', () => {
    const dto: CreatePurchaseDto = {
      date: '2024-01-20T10:00:00Z',
      employeeId: 1
    };

    expect(dto.date).toBe('2024-01-20T10:00:00Z');
    expect(dto.employeeId).toBe(1);
    expect(dto.total).toBeUndefined();
    expect(dto.closed).toBeUndefined();
  });

  it('should allow partial UpdatePurchaseDto', () => {
    const dto: UpdatePurchaseDto = {
      closed: true
    };

    expect(dto.closed).toBe(true);
    expect(dto.date).toBeUndefined();
    expect(dto.total).toBeUndefined();
  });
});
