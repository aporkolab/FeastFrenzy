import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PurchasesComponent } from './purchases.component';
import { PurchaseService } from '../../service/purchase.service';
import { of } from 'rxjs';
import { Purchase } from '../../model/purchase';

describe('PurchasesComponent', () => {
  let component: PurchasesComponent;
  let fixture: ComponentFixture<PurchasesComponent>;

  beforeEach(async () => {
    const mockPurchases: Purchase[] = [];
    
    
    const purchaseSpy = {
      getPurchases: jest.fn().mockReturnValue(of(mockPurchases)),
      getAllPurchases: jest.fn().mockReturnValue(of(mockPurchases)),
      getPurchase: jest.fn(),
      addPurchase: jest.fn(),
      deletePurchase: jest.fn().mockReturnValue(of(void 0))
    };

    await TestBed.configureTestingModule({
      imports: [PurchasesComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PurchaseService, useValue: purchaseSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
