import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../service/auth.service';
import { UserRole } from '../model/auth';


@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    const requiredRoles = route.data['roles'] as UserRole[] | undefined;

    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    
    if (this.authService.hasRole(...requiredRoles)) {
      return true;
    }

    
    return this.router.createUrlTree(['/unauthorized']);
  }
}


export const roleGuardFn: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  
  const requiredRoles = route.data['roles'] as UserRole[] | undefined;

  
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  
  if (authService.hasRole(...requiredRoles)) {
    return true;
  }

  
  return router.createUrlTree(['/unauthorized']);
};
