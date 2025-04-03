import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const requiredRole = route.data['requiredRole'];

    if (requiredRole) {
      if (requiredRole === 'superadmin' && !authService.isSuperAdmin()) {
        router.navigate(['/auth/login'], {
          queryParams: { role: 'superadmin' }
        });
        return false;
      }

      if (requiredRole === 'admin' && !authService.isAdmin()) {
        router.navigate(['/auth/login'], {
          queryParams: { role: 'admin' }
        });
        return false;
      }
    }

    return true;
  }

  let role = 'superadmin';
  if (state.url.includes('/admin/')) {
    role = 'admin';
  }

  router.navigate(['/auth/login'], {
    queryParams: {
      returnUrl: state.url,
      role: role
    }
  });

  return false;
};