import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { controlErrorMessage, extractErrorMessage } from '../../shared/utils/error-utils';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="login-wrapper">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="brand-icon">local_library</mat-icon>
          <mat-card-title>Biblioteca Comunitária</mat-card-title>
          <mat-card-subtitle>Acesse o painel de gestão do acervo</mat-card-subtitle>
        </mat-card-header>

        @if (loading()) {
          <mat-progress-bar mode="indeterminate" />
        }

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="login-form">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Usuário</mat-label>
              <input matInput formControlName="username" autocomplete="username" />
              @if (error('username'); as msg) {
                <mat-error>{{ msg }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Senha</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password" />
              @if (error('password'); as msg) {
                <mat-error>{{ msg }}</mat-error>
              }
            </mat-form-field>

            @if (loginError()) {
              <p class="login-error" role="alert">{{ loginError() }}</p>
            }

            <button mat-flat-button type="submit" class="full" [disabled]="loading()">
              {{ loading() ? 'Autenticando...' : 'Entrar' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .login-wrapper {
      display: grid;
      place-items: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 1.25rem;
    }
    .brand-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: #0b57d0;
    }
    .login-form {
      margin-top: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .full {
      width: 100%;
    }
    .login-error {
      color: #b3261e;
      background: #fceeee;
      border-radius: 6px;
      padding: 0.65rem 0.85rem;
      margin: 0 0 0.75rem;
      font-size: 0.92rem;
    }
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
    return controlErrorMessage(
      this.form.controls[name],
      name === 'username' ? 'Usuário' : 'Senha',
    );
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.loginError.set(null);
    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          const safeTarget =
            returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
              ? returnUrl
              : '/books';
          void this.router.navigateByUrl(safeTarget);
        },
        error: (err) => this.loginError.set(extractErrorMessage(err)),
      });
  }
}

