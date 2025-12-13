import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { PurchaseDetailComponent } from './purchase-detail.component';
import { PurchaseService } from '../../service/purchase.service';
import { of } from 'rxjs';
import { Purchase } from '../../model/purchase';

describe('PurchaseDetailComponent', () => {
  let component: PurchaseDetailComponent;
  let fixture: ComponentFixture<PurchaseDetailComponent>;

  beforeEach(async () => {
    const mockPurchase: Purchase = { 
      id: 1, 
      employeeId: 1,
      total: 1000,
      date: '2024-01-01',
      closed: false
    };
    
    
    const purchaseSpy = {
      getPurchase: jest.fn().mockReturnValue(of(mockPurchase)),
      getPurchases: jest.fn().mockReturnValue(of([mockPurchase])),
      addPurchase: jest.fn(),
      deletePurchase: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PurchaseDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PurchaseService, useValue: purchaseSpy },
        { provide: ActivatedRoute, useValue: { 
          params: of({ id: 1 }), 
          snapshot: { 
            paramMap: { get: (key: string) => '1' },
            params: { id: 1 } 
          } 
        } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
