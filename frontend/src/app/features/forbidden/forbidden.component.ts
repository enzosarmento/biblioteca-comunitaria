import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="forbidden-wrapper">
      <mat-card class="forbidden-card">
        <div class="icon-circle">
          <mat-icon>
            <svg viewBox="0 0 24 24" width="44" height="44" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/>
            </svg>
          </mat-icon>
        </div>

        <span class="code-badge">Erro 403</span>

        <h1 class="title">Acesso Não Autorizado</h1>

        <p class="description">
          Você não possui permissão para acessar esta página ou executar esta operação no sistema da biblioteca.
        </p>

        <div class="help-box">
          <p>
            Caso acredite que deveria ter acesso a este recurso, solicite permissão ao administrador ou realize login com credenciais autorizadas.
          </p>
        </div>

        <div class="actions">
          <a mat-flat-button [routerLink]="auth.isAuthenticated() ? '/books' : '/login'" class="btn-home">
            <mat-icon>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </mat-icon>
            Voltar para a página principal
          </a>

          @if (auth.isAuthenticated()) {
            <button mat-stroked-button type="button" (click)="auth.logout()">
              <mat-icon>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
              </mat-icon>
              Entrar com outra conta
            </button>
          } @else {
            <a mat-stroked-button routerLink="/login">
              <mat-icon>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
                </svg>
              </mat-icon>
              Fazer login
            </a>
          }
        </div>
      </mat-card>
    </div>
  `,
  styles: `
    .forbidden-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: linear-gradient(135deg, #f0f4f9 0%, #e2e8f0 100%);
    }
    .forbidden-card {
      max-width: 500px;
      width: 100%;
      text-align: center;
      padding: 2.5rem 2rem;
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
      background: #ffffff;
    }
    .icon-circle {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background-color: #fce8e6;
      color: #d93025;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }
    .code-badge {
      display: inline-block;
      font-weight: 700;
      font-size: 0.82rem;
      letter-spacing: 0.05em;
      color: #c5221f;
      background: #fce8e6;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      margin-bottom: 0.75rem;
    }
    .title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f1f1f;
      margin: 0 0 0.75rem 0;
    }
    .description {
      color: #5f6368;
      font-size: 0.98rem;
      line-height: 1.5;
      margin: 0 0 1.25rem 0;
    }
    .help-box {
      background: #f8f9fa;
      border-left: 4px solid #d93025;
      padding: 0.75rem 1rem;
      text-align: left;
      border-radius: 4px;
      margin-bottom: 1.75rem;
      font-size: 0.88rem;
      color: #444746;
    }
    .help-box p {
      margin: 0;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .btn-home {
      background-color: #0b57d0 !important;
      color: #ffffff !important;
      height: 42px !important;
      font-weight: 500;
      font-size: 0.92rem;
    }
    .actions a mat-icon,
    .actions button mat-icon {
      margin-right: 6px;
      font-size: 18px;
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `,
})
export class ForbiddenComponent {
  protected readonly auth = inject(AuthService);
}

