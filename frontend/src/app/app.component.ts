import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from './service/auth.service';
import { User } from './model/auth';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'feastfrenzy';
  currentUser: User | null = null;
  private userSubscription?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
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
}
