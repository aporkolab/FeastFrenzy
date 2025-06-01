import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Route } from '@angular/router';
import { of } from 'rxjs';
import { CustomPreloadingStrategy } from './custom-preloading.strategy';

describe('CustomPreloadingStrategy', () => {
  let strategy: CustomPreloadingStrategy;
  let loadFn: jest.Mock;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CustomPreloadingStrategy],
    });

    strategy = TestBed.inject(CustomPreloadingStrategy);
    loadFn = jest.fn().mockReturnValue(of('loaded'));
  });

  it('should not preload routes without preload data', (done) => {
    const route: Route = { path: 'test' };

    strategy.preload(route, loadFn).subscribe((result) => {
      expect(result).toBeNull();
      expect(loadFn).not.toHaveBeenCalled();
      done();
    });
  });

  it('should not preload routes with preload: false', (done) => {
    const route: Route = { path: 'test', data: { preload: false } };

    strategy.preload(route, loadFn).subscribe((result) => {
      expect(result).toBeNull();
      expect(loadFn).not.toHaveBeenCalled();
      done();
    });
  });

  it('should immediately preload routes with preload: true', (done) => {
    const route: Route = { path: 'test', data: { preload: true } };

    strategy.preload(route, loadFn).subscribe((result) => {
      expect(result).toBe('loaded');
      expect(loadFn).toHaveBeenCalled();
      done();
    });
  });

  it('should delay preload when preloadDelay is specified', fakeAsync(() => {
    const route: Route = { 
      path: 'test', 
      data: { preload: true, preloadDelay: 1000 } 
    };

    let result: unknown;
    strategy.preload(route, loadFn).subscribe((r) => {
      result = r;
    });

    // Before delay
    expect(loadFn).not.toHaveBeenCalled();

    // After delay
    tick(1000);
    expect(loadFn).toHaveBeenCalled();
    expect(result).toBe('loaded');
  }));

  it('should use correct delay value', fakeAsync(() => {
    const route: Route = { 
      path: 'test', 
      data: { preload: true, preloadDelay: 2500 } 
    };

    strategy.preload(route, loadFn).subscribe();

    tick(2000);
    expect(loadFn).not.toHaveBeenCalled();

    tick(500);
    expect(loadFn).toHaveBeenCalled();
  }));
});
