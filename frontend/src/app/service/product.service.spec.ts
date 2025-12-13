import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductService } from './product.service';
import { Product } from '../model/product';
import { environment } from '../../environments/environment';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/products`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ProductService
      ]
    });

    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all products', fakeAsync(() => {
    const mockProducts: Product[] = [{ id: 1, name: 'Test', price: 100 }];

    service.getProducts().subscribe((products: Product[]) => {
      expect(products).toEqual(mockProducts);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockProducts);
    tick();
  }));

  it('should get one product', fakeAsync(() => {
    const mockProduct: Product = { id: 1, name: 'Test', price: 100 };

    service.getProduct(1).subscribe((product: Product) => {
      expect(product).toEqual(mockProduct);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProduct);
    tick();
  }));

  it('should create product', fakeAsync(() => {
    const newProduct: Partial<Product> = { name: 'New', price: 50 };
    const createdProduct: Product = { id: 2, name: 'New', price: 50 };

    service.createProduct(newProduct).subscribe((product: Product) => {
      expect(product).toEqual(createdProduct);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    req.flush(createdProduct);
    tick();
  }));

  it('should update product', fakeAsync(() => {
    const updatedProduct: Product = { id: 1, name: 'Updated', price: 150 };

    service.updateProduct(1, updatedProduct).subscribe((product: Product) => {
      expect(product).toEqual(updatedProduct);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updatedProduct);
    tick();
  }));

  it('should delete product', fakeAsync(() => {
    service.deleteProduct(1).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    tick();
  }));
});
