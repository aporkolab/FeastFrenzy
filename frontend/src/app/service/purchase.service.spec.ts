import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PurchaseService } from './purchase.service';
import { Purchase } from '../model/purchase';
import { PaginatedResponse } from '../model/pagination';
import { environment } from '../../environments/environment';

describe('PurchaseService', () => {
  let service: PurchaseService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/purchases`;

  const mockPurchases: Purchase[] = [
    { id: 1, date: '2024-01-15T10:00:00Z', closed: false, employeeId: 1, total: 25.50 },
    { id: 2, date: '2024-01-16T11:00:00Z', closed: true, employeeId: 1, total: 50.00 },
    { id: 3, date: '2024-01-17T12:00:00Z', closed: false, employeeId: 2, total: 75.00 },
  ];

  const mockPaginatedResponse: PaginatedResponse<Purchase> = {
    data: mockPurchases,
    meta: {
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PurchaseService]
    });
    service = TestBed.inject(PurchaseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPurchases', () => {
    it('should return paginated purchases', fakeAsync(() => {
      service.getPurchases().subscribe(response => {
        expect(response.data).toEqual(mockPurchases);
        expect(response.meta.total).toBe(3);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginatedResponse);
      tick();
    }));

    it('should return empty data when no purchases', fakeAsync(() => {
      const emptyResponse: PaginatedResponse<Purchase> = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false }
      };

      service.getPurchases().subscribe(response => {
        expect(response.data).toEqual([]);
        expect(response.meta.total).toBe(0);
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(emptyResponse);
      tick();
    }));

    it('should update purchases$ observable', fakeAsync(() => {
      let emittedPurchases: Purchase[] = [];
      service.purchases$.subscribe(purchases => {
        emittedPurchases = purchases;
      });

      service.getPurchases().subscribe();

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockPaginatedResponse);
      tick();

      expect(emittedPurchases).toEqual(mockPurchases);
    }));
  });

  describe('getAllPurchases', () => {
    it('should return all purchases array', fakeAsync(() => {
      service.getAllPurchases().subscribe(purchases => {
        expect(purchases).toEqual(mockPurchases);
        expect(purchases.length).toBe(3);
      });

      const req = httpMock.expectOne(`${apiUrl}?limit=1000`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginatedResponse);
      tick();
    }));
  });

  describe('getPurchase', () => {
    it('should return single purchase by ID', fakeAsync(() => {
      const expectedPurchase = mockPurchases[0];

      service.getPurchase(1).subscribe(purchase => {
        expect(purchase).toEqual(expectedPurchase);
        expect(purchase.total).toBe(25.50);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedPurchase);
      tick();
    }));
  });

  describe('addPurchase', () => {
    it('should create a new purchase', fakeAsync(() => {
      const newPurchase = {
        date: '2024-01-20T10:00:00Z',
        employeeId: 1,
        total: 100.00,
        closed: false
      };
      const createdPurchase: Purchase = { id: 4, ...newPurchase };

      service.addPurchase(newPurchase).subscribe(purchase => {
        expect(purchase).toEqual(createdPurchase);
        expect(purchase.id).toBe(4);
      });

      
      const postReq = httpMock.expectOne(apiUrl);
      expect(postReq.request.method).toBe('POST');
      expect(postReq.request.body).toEqual(newPurchase);
      postReq.flush(createdPurchase);
      tick();

      
      const refreshReq = httpMock.expectOne(apiUrl);
      expect(refreshReq.request.method).toBe('GET');
      refreshReq.flush(mockPaginatedResponse);
      tick();
    }));
  });

  describe('updatePurchase', () => {
    it('should update an existing purchase', fakeAsync(() => {
      const updates = { total: 150.00, closed: true };
      const updatedPurchase: Purchase = { ...mockPurchases[0], ...updates };

      service.updatePurchase(1, updates).subscribe(purchase => {
        expect(purchase.total).toBe(150.00);
        expect(purchase.closed).toBe(true);
      });

      const putReq = httpMock.expectOne(`${apiUrl}/1`);
      expect(putReq.request.method).toBe('PUT');
      putReq.flush(updatedPurchase);
      tick();

      
      const refreshReq = httpMock.expectOne(apiUrl);
      refreshReq.flush(mockPaginatedResponse);
      tick();
    }));
  });

  describe('deletePurchase', () => {
    it('should delete a purchase by ID number', fakeAsync(() => {
      service.deletePurchase(1).subscribe(() => {
        expect(true).toBe(true);
      });

      const deleteReq = httpMock.expectOne(`${apiUrl}/1`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush({ deleted: true, id: 1 });
      tick();

      
      const refreshReq = httpMock.expectOne(apiUrl);
      refreshReq.flush(mockPaginatedResponse);
      tick();
    }));

    it('should delete a purchase by Purchase object', fakeAsync(() => {
      service.deletePurchase(mockPurchases[0]).subscribe(() => {
        expect(true).toBe(true);
      });

      const deleteReq = httpMock.expectOne(`${apiUrl}/1`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush({ deleted: true, id: 1 });
      tick();

      
      const refreshReq = httpMock.expectOne(apiUrl);
      refreshReq.flush(mockPaginatedResponse);
      tick();
    }));
  });

  describe('getPurchasesByEmployee', () => {
    it('should fetch purchases for a specific employee', fakeAsync(() => {
      const employeeId = 1;
      const employeePurchases = mockPurchases.filter(p => p.employeeId === employeeId);
      const filteredResponse: PaginatedResponse<Purchase> = {
        data: employeePurchases,
        meta: { page: 1, limit: 20, total: 2, totalPages: 1, hasNextPage: false, hasPrevPage: false }
      };

      service.getPurchasesByEmployee(employeeId).subscribe(purchases => {
        expect(purchases).toEqual(employeePurchases);
      });

      const req = httpMock.expectOne(`${apiUrl}?employeeId=${employeeId}`);
      expect(req.request.method).toBe('GET');
      req.flush(filteredResponse);
      tick();
    }));
  });
});
