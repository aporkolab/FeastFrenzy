import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductService } from './product.service';
import { Product } from '../model/product';
import { environment } from '../../environments/environment';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/products`;

  const mockProducts: Product[] = [
    { id: 1, name: 'Product A', price: 10.00 },
    { id: 2, name: 'Product B', price: 20.00 },
    { id: 3, name: 'Product C', price: 30.00 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductService]
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProducts', () => {
    it('should return all products', fakeAsync(() => {
      service.getProducts().subscribe(products => {
        expect(products).toEqual(mockProducts);
        expect(products.length).toBe(3);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockProducts);
      tick();
    }));

    it('should return empty array when no products', fakeAsync(() => {
      service.getProducts().subscribe(products => {
        expect(products).toEqual([]);
        expect(products.length).toBe(0);
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush([]);
      tick();
    }));

    it('should update products$ observable', fakeAsync(() => {
      let emittedProducts: Product[] = [];
      service.products$.subscribe(products => {
        emittedProducts = products;
      });

      service.getProducts().subscribe();

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockProducts);
      tick();

      expect(emittedProducts).toEqual(mockProducts);
    }));
  });

  describe('getProduct', () => {
    it('should return single product by ID', fakeAsync(() => {
      const expectedProduct = mockProducts[0];

      service.getProduct(1).subscribe(product => {
        expect(product).toEqual(expectedProduct);
        expect(product.id).toBe(1);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedProduct);
      tick();
    }));
  });

  describe('createProduct', () => {
    it('should create a new product', fakeAsync(() => {
      const newProduct = { name: 'New Product', price: 25.00 };
      const createdProduct: Product = { id: 4, ...newProduct };

      service.createProduct(newProduct).subscribe(product => {
        expect(product).toEqual(createdProduct);
        expect(product.id).toBe(4);
      });

      
      const postReq = httpMock.expectOne(apiUrl);
      expect(postReq.request.method).toBe('POST');
      expect(postReq.request.body).toEqual(newProduct);
      postReq.flush(createdProduct);
      tick();

      
      const refreshReq = httpMock.expectOne(apiUrl);
      expect(refreshReq.request.method).toBe('GET');
      refreshReq.flush(mockProducts);
      tick();
    }));
  });

  describe('updateProduct', () => {
    it('should update an existing product', fakeAsync(() => {
      const updates = { name: 'Updated Name', price: 35.00 };
      const updatedProduct: Product = { id: 1, ...updates };

      service.updateProduct(1, updates).subscribe(product => {
        expect(product).toEqual(updatedProduct);
        expect(product.name).toBe('Updated Name');
      });

      const putReq = httpMock.expectOne(`${apiUrl}/1`);
      expect(putReq.request.method).toBe('PUT');
      expect(putReq.request.body).toEqual(updates);
      putReq.flush(updatedProduct);
      tick();

      
      const refreshReq = httpMock.expectOne(apiUrl);
      refreshReq.flush(mockProducts);
      tick();
    }));
  });

  describe('deleteProduct', () => {
    it('should delete a product', fakeAsync(() => {
      service.deleteProduct(1).subscribe(() => {
        expect(true).toBe(true);
      });

      const deleteReq = httpMock.expectOne(`${apiUrl}/1`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush({ deleted: true, id: 1 });
      tick();

      
      const refreshReq = httpMock.expectOne(apiUrl);
      refreshReq.flush(mockProducts);
      tick();
    }));
  });

  describe('getProductReport', () => {
    it('should fetch products for a given month', fakeAsync(() => {
      service.getProductReport('2024-01').subscribe(products => {
        expect(products).toEqual(mockProducts);
      });

      const req = httpMock.expectOne(`${apiUrl}?month=2024-01`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProducts);
      tick();
    }));
  });
});
