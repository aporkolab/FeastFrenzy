import {
  Directive,
  Input,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../service/auth.service';
import { UserRole } from '../../model/auth';

/**
 * Structural directive that conditionally renders content based on user roles.
 *
 * Usage:
 * ```html
 * <button *hasRole="['admin', 'manager']">Edit Employee</button>
 * <div *hasRole="['admin']">Admin-only content</div>
 * ```
 *
 * The directive listens to user changes and updates the view accordingly.
 */
@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRoleDirective implements OnInit, OnDestroy {
  private requiredRoles: UserRole[] = [];
  private isVisible = false;
  private destroy$ = new Subject<void>();

  @Input()
  set hasRole(roles: UserRole | UserRole[]) {
    this.requiredRoles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribe to user changes to update view dynamically
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    const hasRequiredRole =
      this.requiredRoles.length === 0 ||
      this.authService.hasRole(...this.requiredRoles);

    if (hasRequiredRole && !this.isVisible) {
      // User has required role - show content
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.isVisible = true;
    } else if (!hasRequiredRole && this.isVisible) {
      // User doesn't have required role - hide content
      this.viewContainer.clear();
      this.isVisible = false;
    }
  }
}
