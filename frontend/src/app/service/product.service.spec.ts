import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductService } from './product.service';
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
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all products', fakeAsync(() => {
    const mockProducts = [{ id: 1, name: 'Test', price: 100, category: 'Test', active: true }];

    service.getAll().subscribe(products => {
      expect(products).toEqual(mockProducts);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockProducts);
    tick();
  }));

  it('should get one product', fakeAsync(() => {
    const mockProduct = { id: 1, name: 'Test', price: 100, category: 'Test', active: true };

    service.getOne(1).subscribe(product => {
      expect(product).toEqual(mockProduct);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProduct);
    tick();
  }));

  it('should create product', fakeAsync(() => {
    const newProduct = { name: 'New', price: 50, category: 'New', active: true };
    const createdProduct = { id: 2, ...newProduct };

    service.create(newProduct).subscribe(product => {
      expect(product).toEqual(createdProduct);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    req.flush(createdProduct);
    tick();
  }));

  it('should update product', fakeAsync(() => {
    const updatedProduct = { id: 1, name: 'Updated', price: 150, category: 'Test', active: true };

    service.update(updatedProduct).subscribe(product => {
      expect(product).toEqual(updatedProduct);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updatedProduct);
    tick();
  }));

  it('should delete product', fakeAsync(() => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    tick();
  }));
});
