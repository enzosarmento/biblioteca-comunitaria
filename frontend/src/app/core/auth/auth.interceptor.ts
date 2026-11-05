import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../services/notification.service';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  const isApiCall = req.url.startsWith(environment.apiUrl);
  const isLogin = req.url.startsWith(`${environment.apiUrl}/auth/login`);
  const token = auth.token();

  const authReq =
    token && isApiCall && !isLogin
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isApiCall && !isLogin && auth.token()) {
        const expired = error.error?.code === 'TOKEN_EXPIRED';
        auth.logout(false);
        notify.error(
          expired
            ? 'Sua sessão expirou. Faça login novamente.'
            : 'Sessão inválida. Faça login novamente.',
        );
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }

      if (error.status === 403 && isApiCall) {
        notify.error('Acesso negado: você não possui permissão para este recurso.');
        void router.navigate(['/forbidden']);
      }
      return throwError(() => error);
    }),
  );
};

