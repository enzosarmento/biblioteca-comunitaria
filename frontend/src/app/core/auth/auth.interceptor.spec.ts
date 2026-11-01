import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../services/notification.service';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

@Component({ template: '' })
class DummyLoginComponent {}

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let currentToken: string | null;
  let logoutSpy: ReturnType<typeof vi.fn>;
  let errorNotifySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    currentToken = 'cabecalho.payload.assinatura';
    logoutSpy = vi.fn(() => {
      currentToken = null;
    });
    errorNotifySpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', component: DummyLoginComponent }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            token: () => currentToken,
            logout: logoutSpy,
          },
        },
        {
          provide: NotificationService,
          useValue: {
            success: vi.fn(),
            error: errorNotifySpy,
          },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    ctrl.verify();
  });

  it('adiciona cabeçalho Authorization Bearer nas requisições à API', () => {
    http.get(`${environment.apiUrl}/books`).subscribe();
    const req = ctrl.expectOne(`${environment.apiUrl}/books`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer cabecalho.payload.assinatura');
    req.flush([]);
  });

  it('não adiciona Authorization Bearer na chamada pública de login', () => {
    http.post(`${environment.apiUrl}/auth/login`, { username: 'u', password: 'p' }).subscribe();
    const req = ctrl.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('limpa sessão e exibe mensagem ao receber 401 TOKEN_EXPIRED', () => {
    let statusReceived = 0;
    http.get(`${environment.apiUrl}/books`).subscribe({
      error: (err) => {
        statusReceived = err.status;
      },
    });
    const req = ctrl.expectOne(`${environment.apiUrl}/books`);
    req.flush(
      { code: 'TOKEN_EXPIRED', message: 'Expirado' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(statusReceived).toBe(401);
    expect(logoutSpy).toHaveBeenCalledWith(false);
    expect(errorNotifySpy).toHaveBeenCalled();
  });
});
