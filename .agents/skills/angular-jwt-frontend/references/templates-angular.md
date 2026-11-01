# Templates Angular (standalone + Material)

Exemplo de recurso: `products` (controle de estoque). Adapte nomes, campos e rótulos ao tema. Templates inline por brevidade: pode separar em `.html`/`.scss` se preferir. Não assuma que compila só por ter copiado: rode `ng build`.

Sumário: 1 Modelos e ambiente · 2 Autenticação · 3 Utilitários de erro · 4 Notificação e confirmação · 5 Config e rotas · 6 Layout · 7 Login · 8 Serviço do recurso · 9 Formulário compartilhado · 10 Páginas · 11 Estilos · 12 Testes

---

## 1. Modelos e ambiente

`src/environments/environment.ts`
```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
};
```

`core/models/auth.model.ts`
```ts
export interface LoginRequest { username: string; password: string; }

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: string;
  username: string;
  role: string;
}

export interface SessionUser { username: string; role: string; }
```

`core/models/api-error.model.ts`
```ts
export interface FieldErrorDetail { field: string; message: string; }

export interface ApiError {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  fieldErrors: FieldErrorDetail[];
}
```

---

## 2. Autenticação

`core/auth/auth.service.ts`
```ts
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
    } catch { /* armazenamento indisponível */ }
    this.tokenState.set(null);
    this.userState.set(null);
    if (navigate) void this.router.navigate(['/login']);
  }

  /** Verdadeiro só se há token E ele ainda não expirou (confere o claim exp do JWT). */
  isAuthenticated(): boolean {
    const token = this.tokenState();
    return !!token && !this.isExpired(token);
  }

  private saveSession(res: LoginResponse): void {
    const user: SessionUser = { username: res.username, role: res.role };
    try {
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* continua só em memória */ }
    this.tokenState.set(res.token);
    this.userState.set(user);
  }

  private isExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const { exp } = JSON.parse(atob(payload)) as { exp?: number };
      return !exp || Date.now() >= exp * 1000;
    } catch {
      return true; // token ilegível = inválido
    }
  }

  private readStorage(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private readUser(): SessionUser | null {
    const raw = this.readStorage(USER_KEY);
    try { return raw ? (JSON.parse(raw) as SessionUser) : null; } catch { return null; }
  }
}
```

`core/auth/auth.guard.ts`
```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  auth.logout(false); // limpa token vencido, se houver
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Impede usuário já autenticado de ver a tela de login. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/products']) : true;
};
```

`core/auth/auth.interceptor.ts`
```ts
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
      // Só reage se ainda há token: várias respostas 401 simultâneas geram um único aviso.
      if (error.status === 401 && isApiCall && !isLogin && auth.token()) {
        const expired = error.error?.code === 'TOKEN_EXPIRED';
        auth.logout(false);
        notify.error(expired ? 'Sua sessão expirou. Entre novamente.' : 'Sessão inválida. Entre novamente.');
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
```

---

## 3. Utilitários de erro

`shared/utils/error-utils.ts`
```ts
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';
import { ApiError } from '../../core/models/api-error.model';

/** Texto amigável para qualquer erro vindo do HttpClient. */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    const body = err.error as Partial<ApiError> | null;
    if (body?.message) return body.message;
    if (err.status >= 500) return 'Erro interno do servidor. Tente novamente em instantes.';
  }
  return 'Ocorreu um erro inesperado.';
}

/** Mapeia fieldErrors (HTTP 400) para os controles do formulário. Retorna true se algum campo foi marcado. */
export function applyServerFieldErrors(form: FormGroup, err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse) || err.status !== 400) return false;
  const fields = (err.error as Partial<ApiError> | null)?.fieldErrors ?? [];
  let applied = false;
  for (const f of fields) {
    const control = form.get(f.field);
    if (control) {
      control.setErrors({ server: f.message });
      control.markAsTouched();
      applied = true;
    }
  }
  return applied;
}

/** Mensagem de erro de um campo, em português. Retorna null quando não há o que mostrar. */
export function controlErrorMessage(control: AbstractControl | null, label: string): string | null {
  if (!control?.errors || !(control.touched || control.dirty)) return null;
  const e = control.errors;
  if (e['server']) return String(e['server']);
  if (e['required']) return `O campo "${label}" é obrigatório.`;
  if (e['minlength']) return `${label} deve ter pelo menos ${e['minlength'].requiredLength} caracteres.`;
  if (e['maxlength']) return `${label} deve ter no máximo ${e['maxlength'].requiredLength} caracteres.`;
  if (e['min']) return `${label} deve ser no mínimo ${e['min'].min}.`;
  if (e['max']) return `${label} deve ser no máximo ${e['max'].max}.`;
  if (e['email']) return 'Informe um e-mail válido.';
  if (e['pattern']) return `${label} está em formato inválido.`;
  return `${label} é inválido.`;
}
```

---

## 4. Notificação e confirmação

`core/services/notification.service.ts`
```ts
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'Fechar', { duration: 4000, panelClass: ['snack-success'] });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Fechar', { duration: 7000, panelClass: ['snack-error'] });
  }
}
```

`shared/components/confirm-dialog.component.ts`
```ts
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">{{ data.cancelText ?? 'Cancelar' }}</button>
      <button mat-flat-button [mat-dialog-close]="true" cdkFocusInitial>{{ data.confirmText ?? 'Confirmar' }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
}
```

`core/services/confirm.service.ts`
```ts
import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { ConfirmData, ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  ask(data: ConfirmData): Observable<boolean> {
    return this.dialog
      .open(ConfirmDialogComponent, { data, width: '420px', autoFocus: 'dialog' })
      .afterClosed()
      .pipe(map((result) => result === true));
  }
}
```

---

## 5. Configuração e rotas

`app.config.ts` (mantenha o que o CLI gerou e garanta estes providers)
```ts
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
```
Se o Material reclamar de animações na versão instalada, adicione `provideAnimationsAsync()`.

`app.routes.ts`
```ts
import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      {
        path: 'products',
        title: 'Produtos',
        loadComponent: () => import('./features/products/product-list.component').then((m) => m.ProductListComponent),
      },
      {
        path: 'products/new', // ANTES de products/:id
        title: 'Novo produto',
        loadComponent: () => import('./features/products/product-create.component').then((m) => m.ProductCreateComponent),
      },
      {
        path: 'products/:id',
        title: 'Detalhes do produto',
        loadComponent: () => import('./features/products/product-detail.component').then((m) => m.ProductDetailComponent),
      },
      {
        path: 'products/:id/edit',
        title: 'Editar produto',
        loadComponent: () => import('./features/products/product-edit.component').then((m) => m.ProductEditComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
```

---

## 6. Layout (com "Sair")

`layout/main-layout.component.ts`
```ts
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar>
      <span class="brand">Controle de Estoque</span>
      <a mat-button routerLink="/products" routerLinkActive="active">Produtos</a>
      <span class="spacer"></span>
      <span class="user">Olá, {{ auth.user()?.username }}</span>
      <button mat-button type="button" (click)="auth.logout()">
        <mat-icon>logout</mat-icon> Sair
      </button>
    </mat-toolbar>
    <main class="content"><router-outlet /></main>
  `,
  styles: `
    .spacer { flex: 1 1 auto; }
    .brand { font-weight: 600; margin-right: 1rem; }
    .user { margin-right: .5rem; }
    .content { max-width: 1100px; margin: 1.5rem auto; padding: 0 1rem; }
    .active { font-weight: 700; }
  `,
})
export class MainLayoutComponent {
  protected readonly auth = inject(AuthService);
}
```

---

## 7. Login

`features/login/login.component.ts`
```ts
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { controlErrorMessage, extractErrorMessage } from '../../shared/utils/error-utils';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule],
  template: `
    <div class="wrapper">
      <mat-card class="card">
        <mat-card-header><mat-card-title>Entrar</mat-card-title></mat-card-header>
        @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Usuário</mat-label>
              <input matInput formControlName="username" autocomplete="username" />
              @if (error('username'); as msg) { <mat-error>{{ msg }}</mat-error> }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Senha</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password" />
              @if (error('password'); as msg) { <mat-error>{{ msg }}</mat-error> }
            </mat-form-field>

            @if (loginError()) { <p class="login-error" role="alert">{{ loginError() }}</p> }

            <button mat-flat-button type="submit" class="full" [disabled]="loading()">Entrar</button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .wrapper { display: grid; place-items: center; min-height: 100vh; padding: 1rem; }
    .card { width: 100%; max-width: 380px; padding: 1rem; }
    .full { width: 100%; }
    .login-error { color: #b3261e; margin: 0 0 .75rem; }
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly loginError = signal<string | null>(null);

  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected error(name: 'username' | 'password'): string | null {
    return controlErrorMessage(this.form.controls[name], name === 'username' ? 'Usuário' : 'Senha');
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.loginError.set(null);
    this.auth.login(this.form.getRawValue()).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // só aceita caminhos internos (evita open redirect)
        void this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/products');
      },
      error: (err) => this.loginError.set(extractErrorMessage(err)),
    });
  }
}
```

---

## 8. Serviço e modelo do recurso

`features/products/product.model.ts`
```ts
export type ProductCategory = 'ALIMENTOS' | 'BEBIDAS' | 'LIMPEZA' | 'HIGIENE' | 'PAPELARIA' | 'OUTROS';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  ALIMENTOS: 'Alimentos', BEBIDAS: 'Bebidas', LIMPEZA: 'Limpeza',
  HIGIENE: 'Higiene', PAPELARIA: 'Papelaria', OUTROS: 'Outros',
};
export const CATEGORIES = Object.keys(CATEGORY_LABELS) as ProductCategory[];

export interface Product {
  id: number; name: string; sku: string; category: ProductCategory;
  quantity: number; minQuantity: number; unitPrice: number;
  expirationDate: string | null; description: string | null; active: boolean;
  lowStock: boolean; createdAt: string; updatedAt: string;
}

/** Corpo de POST/PUT: espelha ProductRequest do backend. */
export interface ProductPayload {
  name: string; sku: string; category: ProductCategory; quantity: number; minQuantity: number;
  unitPrice: number; expirationDate: string | null; description: string | null; active: boolean;
}
```

`features/products/product.service.ts`
```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product, ProductPayload } from './product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/products`;

  list(query?: string): Observable<Product[]> {
    let params = new HttpParams();
    if (query?.trim()) params = params.set('q', query.trim());
    return this.http.get<Product[]>(this.baseUrl, { params });
  }
  get(id: number): Observable<Product> { return this.http.get<Product>(`${this.baseUrl}/${id}`); }
  create(payload: ProductPayload): Observable<Product> { return this.http.post<Product>(this.baseUrl, payload); }
  update(id: number, payload: ProductPayload): Observable<Product> { return this.http.put<Product>(`${this.baseUrl}/${id}`, payload); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}`); }
}
```

---

## 9. Formulário compartilhado (cadastro e edição)

`features/products/product-form.component.ts`
```ts
import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { applyServerFieldErrors, controlErrorMessage } from '../../shared/utils/error-utils';
import { CATEGORIES, CATEGORY_LABELS, Product, ProductCategory, ProductPayload } from './product.model';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatButtonModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="grid">
      <mat-form-field appearance="outline">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="name" />
        @if (error('name'); as msg) { <mat-error>{{ msg }}</mat-error> }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>SKU</mat-label>
        <input matInput formControlName="sku" />
        @if (error('sku'); as msg) { <mat-error>{{ msg }}</mat-error> }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Categoria</mat-label>
        <mat-select formControlName="category">
          @for (c of categories; track c) { <mat-option [value]="c">{{ labels[c] }}</mat-option> }
        </mat-select>
        @if (error('category'); as msg) { <mat-error>{{ msg }}</mat-error> }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Preço unitário (R$)</mat-label>
        <input matInput type="number" step="0.01" formControlName="unitPrice" />
        @if (error('unitPrice'); as msg) { <mat-error>{{ msg }}</mat-error> }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Quantidade em estoque</mat-label>
        <input matInput type="number" formControlName="quantity" />
        @if (error('quantity'); as msg) { <mat-error>{{ msg }}</mat-error> }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Quantidade mínima</mat-label>
        <input matInput type="number" formControlName="minQuantity" />
        @if (error('minQuantity'); as msg) { <mat-error>{{ msg }}</mat-error> }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Validade (opcional)</mat-label>
        <input matInput type="date" formControlName="expirationDate" />
      </mat-form-field>

      <mat-slide-toggle formControlName="active">Produto ativo</mat-slide-toggle>

      <mat-form-field appearance="outline" class="wide">
        <mat-label>Descrição (opcional)</mat-label>
        <textarea matInput rows="3" formControlName="description"></textarea>
        @if (error('description'); as msg) { <mat-error>{{ msg }}</mat-error> }
      </mat-form-field>

      <div class="actions wide">
        <a mat-button routerLink="/products">Cancelar</a>
        <button mat-flat-button type="submit" [disabled]="saving()">{{ saving() ? 'Salvando...' : 'Salvar' }}</button>
      </div>
    </form>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 1rem; align-items: start; }
    .wide { grid-column: 1 / -1; }
    .actions { display: flex; justify-content: flex-end; gap: .5rem; }
  `,
})
export class ProductFormComponent {
  readonly initial = input<Product | null>(null);
  readonly saving = input(false);
  readonly save = output<ProductPayload>();

  protected readonly categories = CATEGORIES;
  protected readonly labels = CATEGORY_LABELS;

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(120)] }),
    sku: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(40)] }),
    category: new FormControl<ProductCategory | null>(null, [Validators.required]),
    quantity: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    minQuantity: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    unitPrice: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    expirationDate: new FormControl<string>('', { nonNullable: true }),
    description: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    active: new FormControl(true, { nonNullable: true }),
  });

  private static readonly labelOf: Record<string, string> = {
    name: 'Nome', sku: 'SKU', category: 'Categoria', quantity: 'Quantidade',
    minQuantity: 'Quantidade mínima', unitPrice: 'Preço unitário', description: 'Descrição',
  };

  constructor() {
    // Preenche o formulário quando o registro (edição) chega.
    effect(() => {
      const p = this.initial();
      if (p) {
        this.form.patchValue({ ...p, expirationDate: p.expirationDate ?? '', description: p.description ?? '' });
      }
    });
  }

  protected error(name: keyof typeof ProductFormComponent.labelOf): string | null {
    return controlErrorMessage(this.form.get(name), ProductFormComponent.labelOf[name]);
  }

  /** Chamado pelo pai quando a API devolve 400 com fieldErrors. */
  showServerErrors(err: unknown): boolean {
    return applyServerFieldErrors(this.form, err);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.save.emit({
      name: v.name.trim(), sku: v.sku.trim(), category: v.category!, quantity: v.quantity!,
      minQuantity: v.minQuantity!, unitPrice: v.unitPrice!,
      expirationDate: v.expirationDate || null,
      description: v.description.trim() || null,
      active: v.active,
    });
  }
}
```

---

## 10. Páginas

`features/products/product-create.component.ts`
```ts
import { Component, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../shared/utils/error-utils';
import { ProductFormComponent } from './product-form.component';
import { ProductPayload } from './product.model';
import { ProductService } from './product.service';

@Component({
  selector: 'app-product-create',
  imports: [ProductFormComponent],
  template: `
    <h1>Novo produto</h1>
    <app-product-form [saving]="saving()" (save)="create($event)" />
  `,
})
export class ProductCreateComponent {
  private readonly service = inject(ProductService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly form = viewChild.required(ProductFormComponent);
  protected readonly saving = signal(false);

  protected create(payload: ProductPayload): void {
    this.saving.set(true);
    this.service.create(payload).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (p) => {
        this.notify.success(`Produto "${p.name}" cadastrado com sucesso.`);
        void this.router.navigate(['/products', p.id]);
      },
      error: (err) =>
        this.notify.error(this.form().showServerErrors(err) ? 'Corrija os campos destacados.' : extractErrorMessage(err)),
    });
  }
}
```

`features/products/product-edit.component.ts`
```ts
import { Component, inject, signal, viewChild, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../shared/utils/error-utils';
import { ProductFormComponent } from './product-form.component';
import { Product, ProductPayload } from './product.model';
import { ProductService } from './product.service';

@Component({
  selector: 'app-product-edit',
  imports: [ProductFormComponent],
  template: `
    <h1>Editar produto</h1>
    @if (product(); as p) {
      <app-product-form [initial]="p" [saving]="saving()" (save)="update($event)" />
    }
  `,
})
export class ProductEditComponent implements OnInit {
  private readonly service = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly form = viewChild(ProductFormComponent);

  protected readonly product = signal<Product | null>(null);
  protected readonly saving = signal(false);
  private id = 0;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.get(this.id).subscribe({
      next: (p) => this.product.set(p),
      error: (err) => {
        this.notify.error(err.status === 404 ? 'Produto não encontrado.' : extractErrorMessage(err));
        void this.router.navigate(['/products']);
      },
    });
  }

  protected update(payload: ProductPayload): void {
    this.saving.set(true);
    this.service.update(this.id, payload).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (p) => {
        this.notify.success(`Produto "${p.name}" atualizado com sucesso.`);
        void this.router.navigate(['/products', p.id]);
      },
      error: (err) =>
        this.notify.error(this.form()?.showServerErrors(err) ? 'Corrija os campos destacados.' : extractErrorMessage(err)),
    });
  }
}
```

`features/products/product-detail.component.ts`
```ts
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { filter, switchMap } from 'rxjs';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../shared/utils/error-utils';
import { CATEGORY_LABELS, Product } from './product.model';
import { ProductService } from './product.service';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, MatCardModule, MatButtonModule, CurrencyPipe, DatePipe],
  template: `
    @if (product(); as p) {
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ p.name }}</mat-card-title>
          <mat-card-subtitle>SKU {{ p.sku }} · {{ labels[p.category] }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <dl>
            <dt>Preço unitário</dt><dd>{{ p.unitPrice | currency: 'BRL' }}</dd>
            <dt>Quantidade em estoque</dt>
            <dd>{{ p.quantity }} @if (p.lowStock) { <strong class="warn">(abaixo do mínimo de {{ p.minQuantity }})</strong> }</dd>
            <dt>Validade</dt><dd>{{ p.expirationDate ? (p.expirationDate | date: 'dd/MM/yyyy') : 'Não informada' }}</dd>
            <dt>Situação</dt><dd>{{ p.active ? 'Ativo' : 'Inativo' }}</dd>
            <dt>Descrição</dt><dd>{{ p.description || '—' }}</dd>
            <dt>Atualizado em</dt><dd>{{ p.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
          </dl>
        </mat-card-content>
        <mat-card-actions align="end">
          <a mat-button routerLink="/products">Voltar</a>
          <a mat-stroked-button [routerLink]="['/products', p.id, 'edit']">Editar</a>
          <button mat-flat-button type="button" (click)="remove(p)">Excluir</button>
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: `
    dl { display: grid; grid-template-columns: max-content 1fr; gap: .5rem 1.5rem; }
    dt { font-weight: 600; }
    dd { margin: 0; }
    .warn { color: #b3261e; }
  `,
})
export class ProductDetailComponent implements OnInit {
  private readonly service = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly product = signal<Product | null>(null);
  protected readonly labels = CATEGORY_LABELS;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.get(id).subscribe({
      next: (p) => this.product.set(p),
      error: (err) => {
        this.notify.error(err.status === 404 ? 'Produto não encontrado.' : extractErrorMessage(err));
        void this.router.navigate(['/products']);
      },
    });
  }

  protected remove(p: Product): void {
    this.confirm
      .ask({ title: 'Excluir produto', message: `Deseja realmente excluir "${p.name}"? Esta ação não pode ser desfeita.`, confirmText: 'Excluir' })
      .pipe(filter(Boolean), switchMap(() => this.service.delete(p.id)))
      .subscribe({
        next: () => {
          this.notify.success(`Produto "${p.name}" excluído com sucesso.`);
          void this.router.navigate(['/products']);
        },
        error: (err) => this.notify.error(extractErrorMessage(err)),
      });
  }
}
```

`features/products/product-list.component.ts`
```ts
import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { BehaviorSubject, catchError, debounceTime, distinctUntilChanged, filter, of, switchMap, tap } from 'rxjs';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../shared/utils/error-utils';
import { CATEGORY_LABELS, Product } from './product.model';
import { ProductService } from './product.service';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, ReactiveFormsModule, CurrencyPipe, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  template: `
    <div class="header">
      <h1>Produtos</h1>
      <a mat-flat-button routerLink="/products/new"><mat-icon>add</mat-icon> Novo produto</a>
    </div>

    <mat-form-field appearance="outline" class="search">
      <mat-label>Buscar por nome ou SKU</mat-label>
      <input matInput [formControl]="search" />
    </mat-form-field>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    @if (failed()) {
      <p role="alert">Não foi possível carregar os produtos. <button mat-button type="button" (click)="reload()">Tentar novamente</button></p>
    } @else if (!loading() && products().length === 0) {
      <p>Nenhum produto encontrado.</p>
    } @else {
      <div class="table-wrap">
        <table mat-table [dataSource]="products()">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let p"><a [routerLink]="['/products', p.id]">{{ p.name }}</a></td>
          </ng-container>
          <ng-container matColumnDef="sku">
            <th mat-header-cell *matHeaderCellDef>SKU</th>
            <td mat-cell *matCellDef="let p">{{ p.sku }}</td>
          </ng-container>
          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Categoria</th>
            <td mat-cell *matCellDef="let p">{{ labels[p.category] }}</td>
          </ng-container>
          <ng-container matColumnDef="quantity">
            <th mat-header-cell *matHeaderCellDef>Estoque</th>
            <td mat-cell *matCellDef="let p" [class.warn]="p.lowStock">{{ p.quantity }}</td>
          </ng-container>
          <ng-container matColumnDef="unitPrice">
            <th mat-header-cell *matHeaderCellDef>Preço</th>
            <td mat-cell *matCellDef="let p">{{ p.unitPrice | currency: 'BRL' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Ações</th>
            <td mat-cell *matCellDef="let p">
              <a mat-icon-button [routerLink]="['/products', p.id]" aria-label="Ver detalhes"><mat-icon>visibility</mat-icon></a>
              <a mat-icon-button [routerLink]="['/products', p.id, 'edit']" aria-label="Editar"><mat-icon>edit</mat-icon></a>
              <button mat-icon-button type="button" (click)="remove(p)" aria-label="Excluir"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </div>
    }
  `,
  styles: `
    .header { display: flex; justify-content: space-between; align-items: center; }
    .search { width: 100%; max-width: 420px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; }
    .warn { color: #b3261e; font-weight: 600; }
  `,
})
export class ProductListComponent implements OnInit {
  private readonly service = inject(ProductService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = ['name', 'sku', 'category', 'quantity', 'unitPrice', 'actions'];
  protected readonly labels = CATEGORY_LABELS;
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  private readonly query$ = new BehaviorSubject<string>('');

  ngOnInit(): void {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.query$.next(q));

    this.query$
      .pipe(
        tap(() => { this.loading.set(true); this.failed.set(false); }),
        switchMap((q) =>
          this.service.list(q).pipe(
            catchError((err) => {
              this.failed.set(true);
              this.notify.error(extractErrorMessage(err));
              return of([] as Product[]);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => { this.products.set(list); this.loading.set(false); });
  }

  protected reload(): void { this.query$.next(this.query$.value); }

  protected remove(p: Product): void {
    this.confirm
      .ask({ title: 'Excluir produto', message: `Deseja realmente excluir "${p.name}"? Esta ação não pode ser desfeita.`, confirmText: 'Excluir' })
      .pipe(filter(Boolean), switchMap(() => this.service.delete(p.id)))
      .subscribe({
        next: () => { this.notify.success(`Produto "${p.name}" excluído com sucesso.`); this.reload(); },
        error: (err) => this.notify.error(extractErrorMessage(err)),
      });
  }
}
```

---

## 11. Estilos globais (`src/styles.scss`)

```scss
body { margin: 0; font-family: Roboto, "Helvetica Neue", sans-serif; }

// Cores das notificações. O nome dos tokens CSS varia entre versões do Material:
// confira no navegador e ajuste se necessário.
.snack-success {
  --mdc-snackbar-container-color: #2e7d32;
  --mat-snack-bar-container-color: #2e7d32;
  --mdc-snackbar-supporting-text-color: #fff;
  --mat-snack-bar-supporting-text-color: #fff;
  --mat-snack-bar-button-color: #fff;
}
.snack-error {
  --mdc-snackbar-container-color: #b3261e;
  --mat-snack-bar-container-color: #b3261e;
  --mdc-snackbar-supporting-text-color: #fff;
  --mat-snack-bar-supporting-text-color: #fff;
  --mat-snack-bar-button-color: #fff;
}
```

---

## 12. Testes (esqueletos)

`core/auth/auth.interceptor.spec.ts`
```ts
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  const fakeAuth = { token: () => 'abc.def.ghi', logout: jasmine.createSpy('logout') };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: fakeAuth },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  it('envia Authorization Bearer nas chamadas protegidas', () => {
    http.get(`${environment.apiUrl}/products`).subscribe();
    const req = ctrl.expectOne(`${environment.apiUrl}/products`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc.def.ghi');
    req.flush([]);
  });

  it('não envia token no login', () => {
    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe();
    const req = ctrl.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
});
```
Se o projeto usar Vitest (Angular mais recente), troque `jasmine.createSpy` por `vi.fn()` e `toBeFalse()` por `toBe(false)`.

Testes recomendados adicionais: `auth.service.spec.ts` (login salva token; token com `exp` no passado → `isAuthenticated()` falso), `auth.guard.spec.ts` (sem token devolve `UrlTree` para `/login`), `product-form.component.spec.ts` (nome vazio → inválido; `submit` com formulário válido emite `save`).
