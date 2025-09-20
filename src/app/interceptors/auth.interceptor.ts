import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);

  // Skip authentication for login and refresh-token endpoints
  if (req.url.includes('/auth/login') || req.url.includes('/refresh-token')) {
    return next(req);
  }

  const token = authService.getToken();

  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });

    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          const errorCode = error.error?.code;
          
          console.log('401 error detected:', errorCode);

          // Handle different types of 401 errors
          switch (errorCode) {
            case 'SESSION_INVALIDATED':
              // Session was invalidated by admin - force logout immediately
              console.log('Session invalidated by administrator');
              authService.handleLogout('SESSION_INVALIDATED');
              return throwError(() => new Error('Session invalidated'));
              
            case 'SESSION_EXPIRED':
              // User session expired - force logout
              console.log('User session expired');
              authService.handleLogout();
              return throwError(() => new Error('Session expired'));
              
            case 'ACCOUNT_DEACTIVATED':
              // Account was deactivated - force logout
              console.log('Account deactivated');
              authService.handleLogout();
              return throwError(() => new Error('Account deactivated'));
              
            case 'TOKEN_EXPIRED':
            default:
              // Token expired or generic 401 - attempt refresh
              if (!req.url.includes('/refresh-token')) {
                console.log('Token expired, attempting refresh...');
                
                return authService.refreshToken().pipe(
                  switchMap(newToken => {
                    console.log('Using new token for request');
                    const updatedReq = req.clone({
                      setHeaders: {
                        Authorization: `Bearer ${newToken}`
                      },
                      withCredentials: true
                    });
                    return next(updatedReq);
                  }),
                  catchError(refreshError => {
                    console.error('Refresh token request failed', refreshError);
                    
                    // Check if refresh failed due to session invalidation
                    const refreshErrorCode = refreshError.error?.code;
                    if (refreshErrorCode === 'SESSION_INVALIDATED') {
                      authService.handleLogout('SESSION_INVALIDATED');
                    } else if (refreshError.status === 401 || refreshError.status === 403) {
                      authService.handleLogout();
                    }
                    
                    return throwError(() => refreshError);
                  })
                );
              } else {
                // If refresh endpoint itself returns 401, logout
                authService.handleLogout();
                return throwError(() => new Error('Authentication failed'));
              }
          }
        }
        
        // Handle other HTTP errors
        return throwError(() => error);
      })
    );
  }

  return next(req);
};