import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  it('redireciona para /forbidden com returnUrl quando não autenticado', () => {
    const logoutSpy = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => false,
            logout: logoutSpy,
          },
        },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/books/new' } as RouterStateSnapshot),
    );

    expect(logoutSpy).toHaveBeenCalledWith(false);
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toContain('/forbidden');
  });

  it('permite navegação quando autenticado', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            logout: vi.fn(),
          },
        },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/books' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });
});

