import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ProductsComponent } from './products.component';
import { ProductService } from '../../service/product.service';
import { ToastService } from '../../shared/services';
import { of, throwError } from 'rxjs';
import { Product, CreateProductDto, UpdateProductDto } from '../../model/product';
import { PaginatedResponse } from '../../model/pagination';

describe('ProductsComponent', () => {
  let component: ProductsComponent;
  let fixture: ComponentFixture<ProductsComponent>;
  let productService: jest.Mocked<ProductService>;
  let toastService: jest.Mocked<ToastService>;

  const mockProducts: Product[] = [
    { id: 1, name: 'Coffee', price: 2.50 },
    { id: 2, name: 'Tea', price: 1.50 },
    { id: 3, name: 'Sandwich', price: 5.00 }
  ];

  const mockPaginatedResponse: PaginatedResponse<Product> = {
    data: mockProducts,
    meta: {
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    }
  };

  beforeEach(async () => {
    const productSpy = {
      getProducts: jest.fn().mockReturnValue(of(mockPaginatedResponse)),
      getProduct: jest.fn(),
      createProduct: jest.fn().mockReturnValue(of({ id: 4, name: 'New Product', price: 3.00 })),
      updateProduct: jest.fn().mockReturnValue(of({ id: 1, name: 'Updated Coffee', price: 3.00 })),
      deleteProduct: jest.fn().mockReturnValue(of(void 0))
    };

    const toastSpy = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProductService, useValue: productSpy },
        { provide: ToastService, useValue: toastSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    productService = TestBed.inject(ProductService) as jest.Mocked<ProductService>;
    toastService = TestBed.inject(ToastService) as jest.Mocked<ToastService>;
    fixture.detectChanges();
  });

  // ==================== BASIC TESTS ====================

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load products on init', () => {
    expect(productService.getProducts).toHaveBeenCalled();
    expect(component.products).toEqual(mockProducts);
    expect(component.isLoading).toBe(false);
  });

  it('should display correct number of products', () => {
    expect(component.products.length).toBe(3);
  });

  // ==================== MODAL TESTS ====================

  describe('Modal Operations', () => {
    it('should open create modal with correct state', () => {
      component.openCreateModal();

      expect(component.showModal).toBe(true);
      expect(component.modalMode).toBe('create');
      expect(component.selectedProduct).toBeNull();
    });

    it('should open edit modal with selected product', () => {
      const product = mockProducts[0];
      component.openEditModal(product);

      expect(component.showModal).toBe(true);
      expect(component.modalMode).toBe('edit');
      expect(component.selectedProduct).toEqual(product);
    });

    it('should close modal and reset state', () => {
      component.showModal = true;
      component.selectedProduct = mockProducts[0];
      component.isSaving = true;

      component.closeModal();

      expect(component.showModal).toBe(false);
      expect(component.selectedProduct).toBeNull();
      expect(component.isSaving).toBe(false);
    });

    it('should return correct modal title for create mode', () => {
      component.modalMode = 'create';
      expect(component.modalTitle).toBe('Add New Product');
    });

    it('should return correct modal title for edit mode', () => {
      component.modalMode = 'edit';
      component.selectedProduct = { id: 1, name: 'Coffee', price: 2.50 };
      expect(component.modalTitle).toBe('Edit Product: Coffee');
    });
  });

  // ==================== CRUD TESTS ====================

  describe('CRUD Operations', () => {
    it('should create product successfully', fakeAsync(() => {
      const newProduct: CreateProductDto = { name: 'New Product', price: 3.00 };
      component.modalMode = 'create';
      component.showModal = true;

      component.onSave(newProduct);
      tick();

      expect(productService.createProduct).toHaveBeenCalledWith(newProduct);
      expect(toastService.success).toHaveBeenCalledWith('Product "New Product" created successfully');
      expect(component.showModal).toBe(false);
    }));

    it('should update product successfully', fakeAsync(() => {
      const updateDto: UpdateProductDto = { name: 'Updated Coffee', price: 3.00 };
      component.modalMode = 'edit';
      component.selectedProduct = mockProducts[0];
      component.showModal = true;

      component.onSave(updateDto);
      tick();

      expect(productService.updateProduct).toHaveBeenCalledWith(1, updateDto);
      expect(toastService.success).toHaveBeenCalledWith('Product "Updated Coffee" updated successfully');
      expect(component.showModal).toBe(false);
    }));

    it('should handle create error', fakeAsync(() => {
      productService.createProduct.mockReturnValue(throwError(() => new Error('Create failed')));
      const newProduct: CreateProductDto = { name: 'New Product', price: 3.00 };
      component.modalMode = 'create';

      component.onSave(newProduct);
      tick();

      expect(toastService.error).toHaveBeenCalledWith('Create failed');
      expect(component.isSaving).toBe(false);
    }));

    it('should delete product after confirmation', fakeAsync(() => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      const product = mockProducts[0];

      component.deleteProduct(product);
      tick();

      expect(productService.deleteProduct).toHaveBeenCalledWith(1);
      expect(toastService.success).toHaveBeenCalledWith('Product "Coffee" deleted successfully');
    }));

    it('should not delete product if not confirmed', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      const product = mockProducts[0];

      component.deleteProduct(product);

      expect(productService.deleteProduct).not.toHaveBeenCalled();
    });
  });

  // ==================== FILTERING TESTS ====================

  describe('Filtering', () => {
    it('should trigger filter change on name input', fakeAsync(() => {
      productService.getProducts.mockClear();

      component.filters.name = 'coffee';
      component.onFilterChange();
      tick(300); // debounce time

      expect(productService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'coffee' })
      );
    }));

    it('should trigger filter change on price input', fakeAsync(() => {
      productService.getProducts.mockClear();

      component.filters.minPrice = 2;
      component.filters.maxPrice = 10;
      component.onFilterChange();
      tick(300);

      expect(productService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ minPrice: 2, maxPrice: 10 })
      );
    }));

    it('should debounce filter changes', fakeAsync(() => {
      productService.getProducts.mockClear();

      component.filters.name = 'c';
      component.onFilterChange();
      tick(100);

      component.filters.name = 'co';
      component.onFilterChange();
      tick(100);

      component.filters.name = 'cof';
      component.onFilterChange();
      tick(300);

      // Should only call once after debounce
      expect(productService.getProducts).toHaveBeenCalledTimes(1);
      expect(productService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'cof' })
      );
    }));

    it('should clear filters', fakeAsync(() => {
      component.filters = { name: 'test', minPrice: 5, maxPrice: 10 };
      productService.getProducts.mockClear();

      component.clearFilters();
      tick();

      expect(component.filters.name).toBe('');
      expect(component.filters.minPrice).toBeNull();
      expect(component.filters.maxPrice).toBeNull();
      expect(productService.getProducts).toHaveBeenCalled();
    }));

    it('should reset page to 1 when filter changes', fakeAsync(() => {
      component.meta.page = 3;

      component.filters.name = 'test';
      component.onFilterChange();
      tick(300);

      expect(component.meta.page).toBe(1);
    }));
  });

  // ==================== SORTING TESTS ====================

  describe('Sorting', () => {
    it('should sort by field ascending on first click', () => {
      productService.getProducts.mockClear();

      component.sortBy('name');

      expect(component.sortField).toBe('name');
      expect(component.sortDirection).toBe('asc');
      expect(productService.getProducts).toHaveBeenCalled();
    });

    it('should toggle sort direction on same field click', () => {
      component.sortField = 'name';
      component.sortDirection = 'asc';

      component.sortBy('name');

      expect(component.sortDirection).toBe('desc');
    });

    it('should reset to ascending when changing sort field', () => {
      component.sortField = 'name';
      component.sortDirection = 'desc';

      component.sortBy('price');

      expect(component.sortField).toBe('price');
      expect(component.sortDirection).toBe('asc');
    });

    it('should return correct sort icon for active field', () => {
      component.sortField = 'name';
      component.sortDirection = 'asc';

      expect(component.getSortIcon('name')).toBe('↑');

      component.sortDirection = 'desc';
      expect(component.getSortIcon('name')).toBe('↓');
    });

    it('should return neutral icon for inactive field', () => {
      component.sortField = 'name';
      expect(component.getSortIcon('price')).toBe('↕');
    });
  });

  // ==================== PAGINATION TESTS ====================

  describe('Pagination', () => {
    beforeEach(() => {
      // Set up component meta for pagination tests
      component.meta = {
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true
      };

      // Mock to return response with requested page
      productService.getProducts.mockImplementation((params: any) => {
        return of({
          data: mockProducts,
          meta: {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: 50,
            totalPages: 3,
            hasNextPage: params?.page < 3,
            hasPrevPage: params?.page > 1
          }
        });
      });
    });

    it('should go to specific page', fakeAsync(() => {
      productService.getProducts.mockClear();

      component.goToPage(3);
      tick();

      expect(component.meta.page).toBe(3);
      expect(productService.getProducts).toHaveBeenCalled();
    }));

    it('should not go to invalid page', () => {
      productService.getProducts.mockClear();

      component.goToPage(0);
      component.goToPage(10);

      expect(productService.getProducts).not.toHaveBeenCalled();
    });

    it('should go to previous page', fakeAsync(() => {
      productService.getProducts.mockClear();

      component.previousPage();
      tick();

      expect(component.meta.page).toBe(1);
    }));

    it('should go to next page', fakeAsync(() => {
      productService.getProducts.mockClear();

      component.nextPage();
      tick();

      expect(component.meta.page).toBe(3);
    }));

    it('should change page size and reset to page 1', fakeAsync(() => {
      productService.getProducts.mockClear();

      component.onPageSizeChange(50);
      tick();

      expect(component.meta.limit).toBe(50);
      expect(component.meta.page).toBe(1);
      expect(productService.getProducts).toHaveBeenCalled();
    }));

    it('should generate correct page numbers', () => {
      component.meta.page = 5;
      component.meta.totalPages = 10;

      const pages = component.getPageNumbers();

      expect(pages).toEqual([3, 4, 5, 6, 7]);
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should handle load error', fakeAsync(() => {
      productService.getProducts.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      component.loadProducts();
      tick();

      expect(component.error).toBe('Network error');
      expect(component.isLoading).toBe(false);
    }));

    it('should handle delete error', fakeAsync(() => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      productService.deleteProduct.mockReturnValue(
        throwError(() => new Error('Delete failed'))
      );

      component.deleteProduct(mockProducts[0]);
      tick();

      expect(component.error).toBe('Delete failed');
      expect(toastService.error).toHaveBeenCalledWith('Delete failed');
    }));
  });

  // ==================== HELPER TESTS ====================

  describe('Helper Methods', () => {
    it('should track products by id', () => {
      const product = mockProducts[0];
      expect(component.trackByProductId(0, product)).toBe(1);
    });
  });
});
