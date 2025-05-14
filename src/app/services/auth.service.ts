import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User, AuthResponse } from '../interfaces/interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenExpirationTimer: any;
  private baseUrls = {
    superadmin: 'https://hoamsapi-v2ia.onrender.com/api/superadmin',
    admin: 'https://hoamsapi-v2ia.onrender.com/api/admin'
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    const userData = localStorage.getItem('currentUser');
    const token = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole');

    if (userData && token) {
      const user = JSON.parse(userData);
      this.currentUserSubject.next(user);

      this.autoLogout(this.getTokenRemainingTime(token));
    }
  }

  login(email: string, password: string, role: 'superadmin' | 'admin' = 'superadmin'): Observable<AuthResponse> {
    const baseUrl = this.baseUrls[role];
    
    return this.http.post<AuthResponse>(`${baseUrl}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(
        tap(response => {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('userRole', role);

          this.currentUserSubject.next(response.user);

          this.autoLogout(15 * 60 * 1000);
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => new Error(error.error?.message || 'Login failed'));
        })
      );
  }

  loginAsSuperAdmin(email: string, password: string): Observable<AuthResponse> {
    return this.login(email, password, 'superadmin');
  }

  loginAsAdmin(email: string, password: string): Observable<AuthResponse> {
    return this.login(email, password, 'admin');
  }

  logout(): void {
    const role = localStorage.getItem('userRole') || 'superadmin';
    const baseUrl = this.baseUrls[role as 'superadmin' | 'admin'];
    
    this.http.post(`${baseUrl}/logout`, {}).subscribe({
      next: () => this.handleLogout(),
      error: () => this.handleLogout()
    });
  }

  public handleLogout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('fullName');
    localStorage.removeItem('userRole');
    this.currentUserSubject.next(null);

    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }

    this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<string> {
    const role = localStorage.getItem('userRole') || 'superadmin';
    const baseUrl = this.baseUrls[role as 'superadmin' | 'admin'];
    
    return this.http.post<{ accessToken: string, user?: User }>(`${baseUrl}/refresh-token`, {}, {
      withCredentials: true
    })
      .pipe(
        map(response => {
          localStorage.setItem('accessToken', response.accessToken);
          
          if (response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
          }
          
          const expirationTime = this.getTokenRemainingTime(response.accessToken);
          this.autoLogout(expirationTime);
          
          return response.accessToken;
        }),
        catchError(error => {
          console.error('Token refresh failed:', error);
          if (error.status === 401 || error.status === 403) {
            this.handleLogout();
          }
          return throwError(() => new Error('Token refresh failed'));
        })
      );
  }

  autoLogout(expirationDuration: number): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }
    
    if (expirationDuration > 0) {
      const refreshTime = expirationDuration > 60000 ? expirationDuration - 60000 : expirationDuration / 2;
      
      this.tokenExpirationTimer = setTimeout(() => {
        this.refreshToken().subscribe({
          next: token => console.log('Token refreshed successfully via timer'),
          error: (err) => {
            console.error('Failed to refresh token via timer:', err);
            this.handleLogout();
          }
        });
      }, refreshTime);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value && !!this.getToken();
  }

  isSuperAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'superadmin';
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }

  getCurrentUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  private getTokenRemainingTime(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const timeRemaining = expiryTime - Date.now();
      return timeRemaining > 0 ? timeRemaining : 0;
    } catch (e) {
      return 0;
    }
  }
}