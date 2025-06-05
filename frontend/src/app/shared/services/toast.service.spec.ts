import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { ToastService, ToastType, Toast } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    // Clear any existing toasts
    service.dismissAll();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('success', () => {
    it('should add a success toast', fakeAsync(() => {
      service.success('Test success message');
      
      let toasts: Toast[] = [];
      service.toasts$.subscribe(t => toasts = t);
      
      expect(toasts.length).toBe(1);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].message).toBe('Test success message');
      
      discardPeriodicTasks();
    }));

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
    it('should add an error toast', fakeAsync(() => {
      service.error('Test error message');
      
      let toasts: Toast[] = [];
      service.toasts$.subscribe(t => toasts = t);
      
      expect(toasts.length).toBe(1);
      expect(toasts[0].type).toBe('error');
      expect(toasts[0].message).toBe('Test error message');
      
      discardPeriodicTasks();
    }));

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
    it('should add a warning toast', fakeAsync(() => {
      service.warning('Test warning message');
      
      let toasts: Toast[] = [];
      service.toasts$.subscribe(t => toasts = t);
      
      expect(toasts.length).toBe(1);
      expect(toasts[0].type).toBe('warning');
      expect(toasts[0].message).toBe('Test warning message');
      
      discardPeriodicTasks();
    }));
  });

  describe('info', () => {
    it('should add an info toast', fakeAsync(() => {
      service.info('Test info message');
      
      let toasts: Toast[] = [];
      service.toasts$.subscribe(t => toasts = t);
      
      expect(toasts.length).toBe(1);
      expect(toasts[0].type).toBe('info');
      expect(toasts[0].message).toBe('Test info message');
      
      discardPeriodicTasks();
    }));
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
    it('should dismiss a toast by ID', fakeAsync(() => {
      service.success('Test message');
      
      let toasts: Toast[] = [];
      service.toasts$.subscribe(t => toasts = t);
      
      expect(toasts.length).toBe(1);
      const toastId = toasts[0].id;
      
      service.dismiss(toastId);
      
      expect(toasts.length).toBe(0);
    }));
  });

  describe('dismissAll', () => {
    it('should dismiss all toasts', fakeAsync(() => {
      service.success('Message 1');
      service.error('Message 2');
      service.warning('Message 3');
      
      let toasts: Toast[] = [];
      service.toasts$.subscribe(t => toasts = t);
      
      expect(toasts.length).toBe(3);
      
      service.dismissAll();
      
      expect(toasts.length).toBe(0);
    }));
  });

  describe('max toasts limit', () => {
    it('should limit toasts to 5', fakeAsync(() => {
      for (let i = 0; i < 7; i++) {
        service.info(`Message ${i}`);
      }
      
      let toasts: Toast[] = [];
      service.toasts$.subscribe(t => toasts = t);
      
      expect(toasts.length).toBe(5);
      
      discardPeriodicTasks();
    }));
  });

  describe('unique IDs', () => {
    it('should generate unique IDs for each toast', fakeAsync(() => {
      service.success('Message 1');
      service.success('Message 2');
      
      let toasts: Toast[] = [];
      service.toasts$.subscribe(t => toasts = t);
      
      expect(toasts.length).toBe(2);
      expect(toasts[0].id).not.toBe(toasts[1].id);
      
      discardPeriodicTasks();
    }));
  });
});
