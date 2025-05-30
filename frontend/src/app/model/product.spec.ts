import { Product, CreateProductDto, UpdateProductDto } from './product';

describe('Product Interface', () => {
  it('should allow creating valid product object', () => {
    const product: Product = {
      id: 1,
      name: 'Test Product',
      price: 25.99
    };

    expect(product.id).toBe(1);
    expect(product.name).toBe('Test Product');
    expect(product.price).toBe(25.99);
  });

  it('should allow optional purchaseItems', () => {
    const product: Product = {
      id: 1,
      name: 'Test Product',
      price: 10.00,
      purchaseItems: []
    };

    expect(product.purchaseItems).toEqual([]);
  });

  it('should allow creating valid CreateProductDto', () => {
    const dto: CreateProductDto = {
      name: 'New Product',
      price: 15.00
    };

    expect(dto.name).toBe('New Product');
    expect(dto.price).toBe(15.00);
  });

  it('should allow partial UpdateProductDto', () => {
    const dto: UpdateProductDto = {
      price: 20.00
    };

    expect(dto.price).toBe(20.00);
    expect(dto.name).toBeUndefined();
  });
});
