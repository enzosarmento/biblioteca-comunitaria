import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <mat-toolbar class="topbar">
      <a class="brand" routerLink="/books">
        <mat-icon>local_library</mat-icon>
        <span>Biblioteca Comunitária</span>
      </a>
      <a
        mat-button
        routerLink="/books"
        routerLinkActive="active-link"
        [routerLinkActiveOptions]="{ exact: true }"
      >
        Acervo
      </a>
      <a mat-button routerLink="/books/new" routerLinkActive="active-link">
        Catalogar livro
      </a>
      <span class="spacer"></span>
      <span class="user-badge" aria-label="Usuário autenticado">
        <mat-icon>person</mat-icon>
        {{ auth.user()?.username }}
      </span>
      <button mat-stroked-button type="button" (click)="auth.logout()">
        <mat-icon>logout</mat-icon>
        Sair
      </button>
    </mat-toolbar>

    <main class="page-container">
      <router-outlet />
    </main>
  `,
  styles: `
    .topbar {
      background: #ffffff;
      border-bottom: 1px solid #dfe3eb;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      text-decoration: none;
      color: inherit;
      margin-right: 1rem;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .user-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.9rem;
      margin-right: 0.5rem;
      color: #44474f;
    }
    .active-link {
      font-weight: 700;
    }
    .page-container {
      max-width: 1160px;
      margin: 1.75rem auto;
      padding: 0 1.25rem 2.5rem;
    }
  `,
})
export class MainLayoutComponent {
  protected readonly auth = inject(AuthService);
}

