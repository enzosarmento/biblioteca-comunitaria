import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, SessionUser } from '../models/auth.model';

const TOKEN_KEY = 'auth.token';
const USER_KEY = 'auth.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenState = signal<string | null>(this.readStorage(TOKEN_KEY));
  private readonly userState = signal<SessionUser | null>(this.readUser());

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(tap((res) => this.saveSession(res)));
  }

  logout(navigate = true): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* localStorage indisponível */
    }
    this.tokenState.set(null);
    this.userState.set(null);
    if (navigate) {
      void this.router.navigate(['/login']);
    }
  }

  isAuthenticated(): boolean {
    const currentToken = this.tokenState();
    return !!currentToken && !this.isExpired(currentToken);
  }

  private saveSession(res: LoginResponse): void {
    const sessionUser: SessionUser = { username: res.username, role: res.role };
    try {
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
    } catch {
      /* mantém apenas em memória se o navegador bloquear storage */
    }
    this.tokenState.set(res.token);
    this.userState.set(sessionUser);
  }

  private isExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const payload = JSON.parse(atob(padded)) as { exp?: number };
      return !payload.exp || Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  private readStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private readUser(): SessionUser | null {
    const raw = this.readStorage(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  }
}

