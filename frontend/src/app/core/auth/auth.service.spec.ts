import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

function fakeJwtWithExp(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'bibliotecario', exp: expSeconds }));
  return `${header}.${payload}.assinatura`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
    localStorage.clear();
  });

  it('autentica na API real e persiste token válido', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = fakeJwtWithExp(futureExp);

    service.login({ username: 'bibliotecario', password: 'secret' }).subscribe();

    const req = httpCtrl.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({
      token,
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(futureExp * 1000).toISOString(),
      username: 'bibliotecario',
      role: 'ADMIN',
    });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.username).toBe('bibliotecario');
    expect(localStorage.getItem('auth.token')).toBe(token);
  });

  it('retorna falso em isAuthenticated quando o claim exp já expirou', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 120;
    localStorage.setItem('auth.token', fakeJwtWithExp(pastExp));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const freshService = TestBed.inject(AuthService);
    expect(freshService.isAuthenticated()).toBe(false);
  });

  it('limpa token e dados do usuário ao executar logout', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    service.login({ username: 'bibliotecario', password: 'secret' }).subscribe();
    httpCtrl.expectOne(`${environment.apiUrl}/auth/login`).flush({
      token: fakeJwtWithExp(futureExp),
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(futureExp * 1000).toISOString(),
      username: 'bibliotecario',
      role: 'ADMIN',
    });

    service.logout(false);
    expect(service.token()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('auth.token')).toBeNull();
  });
});

