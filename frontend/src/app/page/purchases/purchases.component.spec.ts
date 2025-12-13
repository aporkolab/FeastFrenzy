import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PurchasesComponent } from './purchases.component';
import { PurchaseService } from '../../service/purchase.service';
import { of } from 'rxjs';

describe('PurchasesComponent', () => {
  let component: PurchasesComponent;
  let fixture: ComponentFixture<PurchasesComponent>;

  beforeEach(async () => {
    const purchaseSpy = jasmine.createSpyObj('PurchaseService', ['getAll']);
    purchaseSpy.getAll.and.returnValue(of([]));

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
