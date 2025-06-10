import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../service/auth.service';
import { User } from '../../model/auth';

interface NavigationCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink]
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  navigationCards: NavigationCard[] = [
    {
      title: 'Employees',
      description: 'Manage employee records and information',
      icon: '👥',
      route: '/employees'
    },
    {
      title: 'Products',
      description: 'View and manage product catalog',
      icon: '📦',
      route: '/products'
    },
    {
      title: 'Purchases',
      description: 'Track and manage purchases',
      icon: '🛒',
      route: '/purchases'
    },
    {
      title: 'Reports',
      description: 'View analytics and reports',
      icon: '📊',
      route: '/purchase-report'
    }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  canAccessCard(card: NavigationCard): boolean {
    if (!card.roles || card.roles.length === 0) {
      return true;
    }
    return this.authService.hasRole(...card.roles as any);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }
}
