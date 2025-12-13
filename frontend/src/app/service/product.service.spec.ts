import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductService } from './product.service';
import { Product } from '../model/product';
import { PaginatedResponse } from '../model/pagination';
import { environment } from '../../environments/environment';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/products`;

  
  const createMockPaginatedResponse = (
    data: Product[],
    page = 1,
    limit = 20,
    total = data.length
  ): PaginatedResponse<Product> => ({
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  });

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

  describe('getProducts', () => {
    it('should get paginated products without params', fakeAsync(() => {
      const mockProducts: Product[] = [{ id: 1, name: 'Test', price: 100 }];
      const mockResponse = createMockPaginatedResponse(mockProducts);

      service.getProducts().subscribe((response) => {
        expect(response.data).toEqual(mockProducts);
        expect(response.meta.page).toBe(1);
        expect(response.meta.limit).toBe(20);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      tick();
    }));

    it('should get products with pagination params', fakeAsync(() => {
      const mockProducts: Product[] = [{ id: 1, name: 'Test', price: 100 }];
      const mockResponse = createMockPaginatedResponse(mockProducts, 2, 10, 100);

      service.getProducts({ page: 2, limit: 10 }).subscribe((response) => {
        expect(response.meta.page).toBe(2);
        expect(response.meta.limit).toBe(10);
        expect(response.meta.total).toBe(100);
        expect(response.meta.totalPages).toBe(10);
        expect(response.meta.hasNextPage).toBe(true);
        expect(response.meta.hasPrevPage).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}?page=2&limit=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      tick();
    }));

    it('should get products with sort param', fakeAsync(() => {
      const mockProducts: Product[] = [
        { id: 2, name: 'Expensive', price: 200 },
        { id: 1, name: 'Cheap', price: 100 },
      ];
      const mockResponse = createMockPaginatedResponse(mockProducts);

      service.getProducts({ sort: '-price' }).subscribe((response) => {
        expect(response.data[0].price).toBe(200);
      });

      const req = httpMock.expectOne(`${apiUrl}?sort=-price`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      tick();
    }));

    it('should get products with name filter', fakeAsync(() => {
      const mockProducts: Product[] = [{ id: 1, name: 'Pizza', price: 100 }];
      const mockResponse = createMockPaginatedResponse(mockProducts);

      service.getProducts({ name: 'pizza' }).subscribe((response) => {
        expect(response.data.length).toBe(1);
        expect(response.data[0].name).toBe('Pizza');
      });

      const req = httpMock.expectOne(`${apiUrl}?name=pizza`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      tick();
    }));

    it('should get products with price range filter', fakeAsync(() => {
      const mockProducts: Product[] = [{ id: 1, name: 'Medium', price: 50 }];
      const mockResponse = createMockPaginatedResponse(mockProducts);

      service.getProducts({ minPrice: 10, maxPrice: 100 }).subscribe((response) => {
        expect(response.data.length).toBe(1);
      });

      const req = httpMock.expectOne(`${apiUrl}?minPrice=10&maxPrice=100`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      tick();
    }));

    it('should combine all query params', fakeAsync(() => {
      const mockProducts: Product[] = [{ id: 1, name: 'Pizza', price: 50 }];
      const mockResponse = createMockPaginatedResponse(mockProducts, 1, 10, 50);

      service.getProducts({
        page: 1,
        limit: 10,
        sort: '-price',
        name: 'pizza',
        minPrice: 10,
        maxPrice: 100,
      }).subscribe((response) => {
        expect(response.data).toEqual(mockProducts);
      });

      const req = httpMock.expectOne(
        `${apiUrl}?page=1&limit=10&sort=-price&name=pizza&minPrice=10&maxPrice=100`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      tick();
    }));

    it('should update BehaviorSubject with fetched data', fakeAsync(() => {
      const mockProducts: Product[] = [{ id: 1, name: 'Test', price: 100 }];
      const mockResponse = createMockPaginatedResponse(mockProducts);

      let emittedProducts: Product[] = [];
      service.products$.subscribe(products => {
        emittedProducts = products;
      });

      service.getProducts().subscribe();

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockResponse);
      tick();

      expect(emittedProducts).toEqual(mockProducts);
    }));
  });

  describe('getAllProducts (deprecated)', () => {
    it('should return array of products from paginated response', fakeAsync(() => {
      const mockProducts: Product[] = [
        { id: 1, name: 'Test1', price: 100 },
        { id: 2, name: 'Test2', price: 200 },
      ];
      const mockResponse = createMockPaginatedResponse(mockProducts);

      service.getAllProducts().subscribe((products) => {
        expect(products).toEqual(mockProducts);
        expect(Array.isArray(products)).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}?limit=1000`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      tick();
    }));
  });

  describe('getProduct', () => {
    it('should get one product by ID', fakeAsync(() => {
      const mockProduct: Product = { id: 1, name: 'Test', price: 100 };

      service.getProduct(1).subscribe((product: Product) => {
        expect(product).toEqual(mockProduct);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProduct);
      tick();
    }));
  });

  describe('createProduct', () => {
    it('should create product', fakeAsync(() => {
      const newProduct: Partial<Product> = { name: 'New', price: 50 };
      const createdProduct: Product = { id: 2, name: 'New', price: 50 };

      service.createProduct(newProduct).subscribe((product: Product) => {
        expect(product).toEqual(createdProduct);
      });

      
      const postReq = httpMock.expectOne(apiUrl);
      expect(postReq.request.method).toBe('POST');
      postReq.flush(createdProduct);
      tick();

      
      const getReq = httpMock.expectOne(apiUrl);
      expect(getReq.request.method).toBe('GET');
      getReq.flush(createMockPaginatedResponse([createdProduct]));
      tick();
    }));
  });

  describe('updateProduct', () => {
    it('should update product', fakeAsync(() => {
      const updatedProduct: Product = { id: 1, name: 'Updated', price: 150 };

      service.updateProduct(1, updatedProduct).subscribe((product: Product) => {
        expect(product).toEqual(updatedProduct);
      });

      
      const putReq = httpMock.expectOne(`${apiUrl}/1`);
      expect(putReq.request.method).toBe('PUT');
      putReq.flush(updatedProduct);
      tick();

      
      const getReq = httpMock.expectOne(apiUrl);
      expect(getReq.request.method).toBe('GET');
      getReq.flush(createMockPaginatedResponse([updatedProduct]));
      tick();
    }));
  });

  describe('deleteProduct', () => {
    it('should delete product', fakeAsync(() => {
      service.deleteProduct(1).subscribe();

      
      const deleteReq = httpMock.expectOne(`${apiUrl}/1`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush({});
      tick();

      
      const getReq = httpMock.expectOne(apiUrl);
      expect(getReq.request.method).toBe('GET');
      getReq.flush(createMockPaginatedResponse([]));
      tick();
    }));
  });

  describe('error handling', () => {
    it('should handle HTTP errors', fakeAsync(() => {
      let errorMessage = '';

      service.getProducts().subscribe({
        error: (err) => {
          errorMessage = err.message;
        },
      });

      
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne(apiUrl);
        req.flush(
          { error: { message: 'Server error' } },
          { status: 500, statusText: 'Internal Server Error' }
        );
        tick();
      }

      expect(errorMessage).toContain('Server error');
    }));
  });
});
