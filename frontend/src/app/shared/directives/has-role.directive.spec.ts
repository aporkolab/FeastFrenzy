import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { HasRoleDirective } from './has-role.directive';
import { AuthService } from '../../service/auth.service';
import { User, UserRole } from '../../model/auth';

// Test host component
@Component({
  standalone: true,
  imports: [HasRoleDirective],
  template: `
    <div *hasRole="roles" data-testid="protected">Protected Content</div>
  `,
})
class TestHostComponent {
  roles: UserRole[] = ['admin'];
}

describe('HasRoleDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let authServiceMock: { currentUser$: any; hasRole: jest.Mock };
  let currentUserSubject: BehaviorSubject<User | null>;

  const mockUser: User = { id: 1, email: 'admin@test.com', name: 'Admin User', role: 'admin' };

  beforeEach(() => {
    currentUserSubject = new BehaviorSubject<User | null>(null);

    authServiceMock = {
      currentUser$: currentUserSubject.asObservable(),
      hasRole: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    });

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    currentUserSubject.complete();
  });

  it('should show content when user has required role', () => {
    authServiceMock.hasRole.mockReturnValue(true);
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('[data-testid="protected"]');
    expect(element).toBeTruthy();
    expect(element.textContent).toContain('Protected Content');
  });

  it('should hide content when user does not have required role', () => {
    authServiceMock.hasRole.mockReturnValue(false);
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('[data-testid="protected"]');
    expect(element).toBeNull();
  });

  it('should update view when user role changes', () => {
    // Initially no role
    authServiceMock.hasRole.mockReturnValue(false);
    fixture.detectChanges();

    let element = fixture.nativeElement.querySelector('[data-testid="protected"]');
    expect(element).toBeNull();

    // User gets the role
    authServiceMock.hasRole.mockReturnValue(true);
    currentUserSubject.next(mockUser);
    fixture.detectChanges();

    element = fixture.nativeElement.querySelector('[data-testid="protected"]');
    expect(element).toBeTruthy();
  });

  it('should show content when roles array is empty', () => {
    component.roles = [];
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('[data-testid="protected"]');
    expect(element).toBeTruthy();
  });

  it('should call hasRole with correct arguments', () => {
    component.roles = ['admin', 'manager'];
    authServiceMock.hasRole.mockReturnValue(true);
    fixture.detectChanges();

    expect(authServiceMock.hasRole).toHaveBeenCalledWith('admin', 'manager');
  });
});
