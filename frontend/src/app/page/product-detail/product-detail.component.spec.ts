import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { ProductDetailComponent } from './product-detail.component';
import { ProductService } from '../../service/product.service';
import { of } from 'rxjs';
import { Product } from '../../model/product';

describe('ProductDetailComponent', () => {
  let component: ProductDetailComponent;
  let fixture: ComponentFixture<ProductDetailComponent>;

  beforeEach(async () => {
    const mockProduct: Product = { id: 1, name: 'Test', price: 100 };
    
    
    const productSpy = {
      getProduct: jest.fn().mockReturnValue(of(mockProduct)),
      getProducts: jest.fn().mockReturnValue(of([mockProduct])),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProductService, useValue: productSpy },
        { provide: ActivatedRoute, useValue: {
          paramMap: of({ get: (key: string) => '1' }),
          params: of({ id: 1 }),
          snapshot: {
            paramMap: { get: (key: string) => '1' },
            params: { id: 1 }
          }
        } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
