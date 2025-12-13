import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { PurchaseDetailComponent } from './purchase-detail.component';

describe('PurchaseDetailComponent', () => {
  let component: PurchaseDetailComponent;
  let fixture: ComponentFixture<PurchaseDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ PurchaseDetailComponent, HttpClientTestingModule, RouterTestingModule ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseDetailComponent);
    component = fixture.componentInstance;
    
    
    component.purchase = {
      id: 1,
      employeeId: 1,
      date: new Date().toISOString(),
      total: 100,
      closed: false,
      purchaseItems: []
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
