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
  private baseUrl = 'https://hoamsapi.onrender.com/api/superadmin';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    const userData = localStorage.getItem('currentUser');
    const token = localStorage.getItem('accessToken');

    if (userData && token) {
      const user = JSON.parse(userData);
      this.currentUserSubject.next(user);

      this.autoLogout(this.getTokenRemainingTime(token));
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(
        tap(response => {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('accessToken', response.accessToken);

          this.currentUserSubject.next(response.user);

          this.autoLogout(15 * 60 * 1000);
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => new Error(error.error?.message || 'Login failed'));
        })
      );
  }

  logout(): void {
    this.http.post(`${this.baseUrl}/logout`, {}).subscribe({
      next: () => this.handleLogout(),
      error: () => this.handleLogout()
    });
  }

  private handleLogout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('fullName')
    this.currentUserSubject.next(null);

    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }

    this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<string> {
    return this.http.post<{ accessToken: string }>(`${this.baseUrl}/refresh-token`, {}, {
      withCredentials: true
    })
      .pipe(
        map(response => {
          localStorage.setItem('accessToken', response.accessToken);

          this.autoLogout(15 * 60 * 1000);

          return response.accessToken;
        }),
        catchError(error => {
          console.error('Token refresh failed:', error);
          this.handleLogout();
          return throwError(() => new Error('Token refresh failed'));
        })
      );
  }

  autoLogout(expirationDuration: number): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }

    this.tokenExpirationTimer = setTimeout(() => {
      this.refreshToken().subscribe({
        error: () => this.handleLogout()
      });
    }, expirationDuration - 60000);
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