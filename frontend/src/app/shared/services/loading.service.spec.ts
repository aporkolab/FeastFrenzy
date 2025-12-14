import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    service.forceReset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('show/hide', () => {
    it('should show loading when show() is called', fakeAsync(() => {
      let isLoading = false;
      service.loading$.subscribe(loading => isLoading = loading);
      
      service.show();
      tick(100); // Account for debounce
      
      expect(isLoading).toBe(true);
    }));

    it('should hide loading when hide() is called after show()', fakeAsync(() => {
      let isLoading = false;
      service.loading$.subscribe(loading => isLoading = loading);
      
      service.show();
      tick(100);
      expect(isLoading).toBe(true);
      
      service.hide();
      tick(100);
      expect(isLoading).toBe(false);
    }));
  });

  describe('request counting', () => {
    it('should track multiple concurrent requests', fakeAsync(() => {
      let isLoading = false;
      service.loading$.subscribe(loading => isLoading = loading);
      
      // Start 3 requests
      service.show();
      service.show();
      service.show();
      tick(100);
      
      expect(isLoading).toBe(true);
      expect(service.getRequestCount()).toBe(3);
      
      // Complete first request
      service.hide();
      tick(100);
      expect(isLoading).toBe(true);
      expect(service.getRequestCount()).toBe(2);
      
      // Complete second request
      service.hide();
      tick(100);
      expect(isLoading).toBe(true);
      expect(service.getRequestCount()).toBe(1);
      
      // Complete third request
      service.hide();
      tick(100);
      expect(isLoading).toBe(false);
      expect(service.getRequestCount()).toBe(0);
    }));

    it('should not go below zero', fakeAsync(() => {
      // Call hide without show
      service.hide();
      service.hide();
      service.hide();
      
      expect(service.getRequestCount()).toBe(0);
    }));
  });

  describe('forceReset', () => {
    it('should reset all state', fakeAsync(() => {
      let isLoading = false;
      service.loading$.subscribe(loading => isLoading = loading);
      
      service.show();
      service.show();
      service.show();
      tick(100);
      
      expect(isLoading).toBe(true);
      expect(service.getRequestCount()).toBe(3);
      
      service.forceReset();
      tick(100);
      
      expect(isLoading).toBe(false);
      expect(service.getRequestCount()).toBe(0);
    }));
  });

  describe('isLoading', () => {
    it('should return current loading state synchronously', () => {
      expect(service.isLoading()).toBe(false);
      
      service.show();
      expect(service.isLoading()).toBe(true);
      
      service.hide();
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('loadingImmediate$', () => {
    it('should emit immediately without debounce', () => {
      const emissions: boolean[] = [];
      service.loadingImmediate$.subscribe(loading => emissions.push(loading));
      
      service.show();
      service.hide();
      
      // Should have immediate emissions (false, true, false)
      expect(emissions.length).toBe(3);
      expect(emissions[0]).toBe(false); // Initial
      expect(emissions[1]).toBe(true);  // After show
      expect(emissions[2]).toBe(false); // After hide
    });
  });

  describe('debounce', () => {
    it('should debounce rapid show/hide cycles', fakeAsync(() => {
      const emissions: boolean[] = [];
      service.loading$.subscribe(loading => emissions.push(loading));
      
      // Rapid show/hide within debounce window
      service.show();
      service.hide();
      service.show();
      service.hide();
      
      tick(100);
      
      // Should only emit the final state
      expect(emissions[emissions.length - 1]).toBe(false);
    }));
  });
});
