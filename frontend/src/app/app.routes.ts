import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar — Biblioteca Comunitária',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'books' },
      {
        path: 'books',
        title: 'Acervo — Biblioteca Comunitária',
        loadComponent: () =>
          import('./features/books/book-list.component').then((m) => m.BookListComponent),
      },
      {
        path: 'books/new',
        title: 'Catalogar Livro — Biblioteca Comunitária',
        loadComponent: () =>
          import('./features/books/book-create.component').then((m) => m.BookCreateComponent),
      },
      {
        path: 'books/:id',
        title: 'Detalhes do Livro — Biblioteca Comunitária',
        loadComponent: () =>
          import('./features/books/book-detail.component').then((m) => m.BookDetailComponent),
      },
      {
        path: 'books/:id/edit',
        title: 'Editar Livro — Biblioteca Comunitária',
        loadComponent: () =>
          import('./features/books/book-edit.component').then((m) => m.BookEditComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
