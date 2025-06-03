import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorStateComponent } from './error-state.component';

describe('ErrorStateComponent', () => {
  let component: ErrorStateComponent;
  let fixture: ComponentFixture<ErrorStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should have default type of error', () => {
      expect(component.type).toBe('error');
    });

    it('should have default title', () => {
      expect(component.title).toBe('Something went wrong');
    });

    it('should have default message', () => {
      expect(component.message).toBe('An error occurred while loading data.');
    });

    it('should show retry button by default', () => {
      expect(component.showRetry).toBe(true);
    });

    it('should have default retry text', () => {
      expect(component.retryText).toBe('Try Again');
    });
  });

  describe('getIcon', () => {
    it('should return correct icon for error type', () => {
      component.type = 'error';
      expect(component.getIcon()).toBe('⚠️');
    });

    it('should return correct icon for warning type', () => {
      component.type = 'warning';
      expect(component.getIcon()).toBe('⚡');
    });

    it('should return correct icon for info type', () => {
      component.type = 'info';
      expect(component.getIcon()).toBe('ℹ️');
    });

    it('should return correct icon for empty type', () => {
      component.type = 'empty';
      expect(component.getIcon()).toBe('📭');
    });
  });

  describe('retry functionality', () => {
    it('should emit retry event when onRetry is called', () => {
      const retrySpy = jest.spyOn(component.retry, 'emit');
      component.onRetry();
      expect(retrySpy).toHaveBeenCalled();
    });

    it('should emit retry event when retry button is clicked', () => {
      const retrySpy = jest.spyOn(component.retry, 'emit');
      const button = fixture.nativeElement.querySelector('.btn-primary');
      button.click();
      expect(retrySpy).toHaveBeenCalled();
    });

    it('should hide retry button when showRetry is false', () => {
      component.showRetry = false;
      fixture.detectChanges();
      const retryButton = fixture.nativeElement.querySelector('.btn-primary');
      expect(retryButton).toBeFalsy();
    });

    it('should show loading spinner when retrying', () => {
      component.retrying = true;
      fixture.detectChanges();
      const spinner = fixture.nativeElement.querySelector('.spinner-border');
      expect(spinner).toBeTruthy();
    });

    it('should disable retry button when retrying', () => {
      component.retrying = true;
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('.btn-primary');
      expect(button.disabled).toBe(true);
    });
  });

  describe('custom action', () => {
    it('should show action button when actionText is provided', () => {
      component.actionText = 'Custom Action';
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const actionButton = Array.from(buttons).find(
        (b: any) => b.textContent.trim() === 'Custom Action'
      );
      expect(actionButton).toBeTruthy();
    });

    it('should emit action event when action button is clicked', () => {
      component.actionText = 'Custom Action';
      component.showRetry = false;
      fixture.detectChanges();
      
      const actionSpy = jest.spyOn(component.action, 'emit');
      const button = fixture.nativeElement.querySelector('.btn-primary');
      button.click();
      expect(actionSpy).toHaveBeenCalled();
    });
  });

  describe('details section', () => {
    it('should show details section when details is provided', () => {
      component.details = 'Error stack trace here';
      fixture.detectChanges();
      const details = fixture.nativeElement.querySelector('.error-details');
      expect(details).toBeTruthy();
    });

    it('should hide details section when details is not provided', () => {
      const details = fixture.nativeElement.querySelector('.error-details');
      expect(details).toBeFalsy();
    });
  });

  describe('type styling', () => {
    it('should apply error class for error type', () => {
      component.type = 'error';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.error-state');
      expect(container.classList.contains('error-state-error')).toBe(true);
    });

    it('should apply warning class for warning type', () => {
      component.type = 'warning';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.error-state');
      expect(container.classList.contains('error-state-warning')).toBe(true);
    });

    it('should apply info class for info type', () => {
      component.type = 'info';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.error-state');
      expect(container.classList.contains('error-state-info')).toBe(true);
    });

    it('should apply empty class for empty type', () => {
      component.type = 'empty';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.error-state');
      expect(container.classList.contains('error-state-empty')).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have alert role', () => {
      const container = fixture.nativeElement.querySelector('.error-state');
      expect(container.getAttribute('role')).toBe('alert');
    });

    it('should have assertive aria-live for error type', () => {
      component.type = 'error';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.error-state');
      expect(container.getAttribute('aria-live')).toBe('assertive');
    });

    it('should have polite aria-live for non-error types', () => {
      component.type = 'info';
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.error-state');
      expect(container.getAttribute('aria-live')).toBe('polite');
    });
  });
});
