import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from './service/auth.service';
import { User } from './model/auth';
import { ToastContainerComponent, LoadingSpinnerComponent } from './shared/components';
import { SkipLinkComponent } from './shared/accessibility/skip-link.component';
import { FocusService } from './shared/accessibility/focus.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink,
    RouterLinkActive,
    ToastContainerComponent,
    LoadingSpinnerComponent,
    SkipLinkComponent
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private focusService = inject(FocusService);
  private authService = inject(AuthService);

  title = 'feastfrenzy';
  currentUser: User | null = null;
  private userSubscription?: Subscription;

  ngOnInit(): void {
    // Initialize focus management for route changes
    this.focusService.init();
    
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  canManageEmployees(): boolean {
    return this.authService.hasRole('admin', 'manager');
  }

  logout(): void {
    this.authService.logout();
  }

  /**
   * Check if a route is currently active
   * Used for aria-current attribute
   */
  isRouteActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '/');
  }
}
