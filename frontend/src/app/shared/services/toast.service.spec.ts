import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService, ToastType, Toast } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.dismissAll();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('success', () => {
    it('should add a success toast', (done) => {
      service.success('Test success message');
      
      service.toasts$.subscribe(toasts => {
        expect(toasts.length).toBe(1);
        expect(toasts[0].type).toBe('success');
        expect(toasts[0].message).toBe('Test success message');
        done();
      });
    });

    it('should use default duration of 3000ms', fakeAsync(() => {
      service.success('Test message');
      
      let toasts: Toast[] = [];
      service.toasts$.subscribe(t => toasts = t);
      
      expect(toasts.length).toBe(1);
      
      tick(3000);
      expect(toasts.length).toBe(0);
    }));
  });

  describe('error', () => {
    it('should add an error toast', (done) => {
      service.error('Test error message');
      
      service.toasts$.subscribe(toasts => {
        expect(toasts.length).toBe(1);
        expect(toasts[0].type).toBe('error');
        expect(toasts[0].message).toBe('Test error message');
        done();
      });
    });

    it('should use default duration of 5000ms', fakeAsync(() => {
      service.error('Test message');
      
      let toasts: Toast[] = [];
      service.toasts$.subscribe(t => toasts = t);
      
      expect(toasts.length).toBe(1);
      
      tick(4999);
      expect(toasts.length).toBe(1);
      
      tick(1);
      expect(toasts.length).toBe(0);
    }));
  });

  describe('warning', () => {
    it('should add a warning toast', (done) => {
      service.warning('Test warning message');
      
      service.toasts$.subscribe(toasts => {
        expect(toasts.length).toBe(1);
        expect(toasts[0].type).toBe('warning');
        expect(toasts[0].message).toBe('Test warning message');
        done();
      });
    });
  });

  describe('info', () => {
    it('should add an info toast', (done) => {
      service.info('Test info message');
      
      service.toasts$.subscribe(toasts => {
        expect(toasts.length).toBe(1);
        expect(toasts[0].type).toBe('info');
        expect(toasts[0].message).toBe('Test info message');
        done();
      });
    });
  });

  describe('custom duration', () => {
    it('should allow custom duration', fakeAsync(() => {
      service.success('Test message', 1000);
      
      let toasts: Toast[] = [];
      service.toasts$.subscribe(t => toasts = t);
      
      expect(toasts.length).toBe(1);
      
      tick(999);
      expect(toasts.length).toBe(1);
      
      tick(1);
      expect(toasts.length).toBe(0);
    }));
  });

  describe('dismiss', () => {
    it('should dismiss a toast by ID', (done) => {
      service.success('Test message');
      
      let toastId: string;
      service.toasts$.subscribe(toasts => {
        if (toasts.length === 1 && !toastId) {
          toastId = toasts[0].id;
          service.dismiss(toastId);
        } else if (toastId && toasts.length === 0) {
          expect(toasts.length).toBe(0);
          done();
        }
      });
    });
  });

  describe('dismissAll', () => {
    it('should dismiss all toasts', (done) => {
      service.success('Message 1');
      service.error('Message 2');
      service.warning('Message 3');
      
      let callCount = 0;
      service.toasts$.subscribe(toasts => {
        callCount++;
        if (callCount === 3) {
          expect(toasts.length).toBe(3);
          service.dismissAll();
        } else if (callCount === 4) {
          expect(toasts.length).toBe(0);
          done();
        }
      });
    });
  });

  describe('max toasts limit', () => {
    it('should limit toasts to 5', (done) => {
      for (let i = 0; i < 7; i++) {
        service.info(`Message ${i}`);
      }
      
      service.toasts$.subscribe(toasts => {
        expect(toasts.length).toBeLessThanOrEqual(5);
        done();
      });
    });
  });

  describe('unique IDs', () => {
    it('should generate unique IDs for each toast', (done) => {
      service.success('Message 1');
      service.success('Message 2');
      
      service.toasts$.subscribe(toasts => {
        if (toasts.length === 2) {
          expect(toasts[0].id).not.toBe(toasts[1].id);
          done();
        }
      });
    });
  });
});
