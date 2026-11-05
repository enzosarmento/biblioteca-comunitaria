import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../shared/utils/error-utils';
import { Book, GENRE_LABELS } from './book.model';
import { BookService } from './book.service';

@Component({
  selector: 'app-book-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Acervo da Biblioteca</h1>
        <p class="subtitle">Consulte obras catalogadas, disponibilidade e localização física</p>
      </div>
      <a mat-flat-button routerLink="/books/new">
        <mat-icon>add</mat-icon>
        Catalogar livro
      </a>
    </div>

    <mat-form-field appearance="outline" class="search-field">
      <mat-label>Buscar por título, autor ou ISBN</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput [formControl]="search" placeholder="Ex.: Machado de Assis ou 978-85" />
    </mat-form-field>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (failed()) {
      <mat-card class="state-card">
        <p role="alert">
          Não foi possível carregar o acervo no momento.
          <button mat-stroked-button type="button" (click)="reload()">Tentar novamente</button>
        </p>
      </mat-card>
    } @else if (!loading() && items().length === 0) {
      <mat-card class="state-card">
        <p>Nenhum livro encontrado para a consulta informada.</p>
      </mat-card>
    } @else {
      <mat-card class="table-card">
        <div class="table-wrap">
          <table mat-table [dataSource]="items()">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Título</th>
              <td mat-cell *matCellDef="let b">
                <a class="book-link" [routerLink]="['/books', b.id]">{{ b.title }}</a>
                <div class="meta-line">{{ b.author }} · {{ b.publicationYear }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="isbn">
              <th mat-header-cell *matHeaderCellDef>ISBN</th>
              <td mat-cell *matCellDef="let b" class="mono">{{ b.isbn }}</td>
            </ng-container>

            <ng-container matColumnDef="genre">
              <th mat-header-cell *matHeaderCellDef>Gênero</th>
              <td mat-cell *matCellDef="let b">{{ genreLabel(b.genre) }}</td>
            </ng-container>

            <ng-container matColumnDef="location">
              <th mat-header-cell *matHeaderCellDef>Localização</th>
              <td mat-cell *matCellDef="let b">{{ b.location }}</td>
            </ng-container>

            <ng-container matColumnDef="availability">
              <th mat-header-cell *matHeaderCellDef>Exemplares</th>
              <td mat-cell *matCellDef="let b">
                <span class="badge" [class.badge-ok]="b.available" [class.badge-out]="!b.available">
                  {{ b.copiesAvailable }} / {{ b.copiesTotal }}
                  ({{ b.available ? 'Disponível' : b.active ? 'Esgotado' : 'Inativo' }})
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="actions-header">Ações</th>
              <td mat-cell *matCellDef="let b" class="actions-cell">
                <div class="actions-group">
                  <a
                    mat-stroked-button
                    class="btn-action btn-view"
                    [routerLink]="['/books', b.id]"
                    matTooltip="Visualizar detalhes da obra"
                    aria-label="Visualizar detalhes"
                  >
                    <mat-icon>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    </mat-icon>
                    <span>Ver</span>
                  </a>
                  <a
                    mat-stroked-button
                    class="btn-action btn-edit"
                    [routerLink]="['/books', b.id, 'edit']"
                    matTooltip="Editar dados da obra"
                    aria-label="Editar livro"
                  >
                    <mat-icon>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </mat-icon>
                    <span>Editar</span>
                  </a>
                  <button
                    mat-flat-button
                    class="btn-action btn-delete"
                    type="button"
                    (click)="remove(b)"
                    matTooltip="Excluir obra do acervo"
                    aria-label="Excluir livro"
                  >
                    <mat-icon>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </mat-icon>
                    <span>Excluir</span>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </div>
      </mat-card>
    }
  `,
  styles: `
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.25rem;
    }
    h1 {
      margin: 0;
      font-size: 1.75rem;
    }
    .subtitle {
      margin: 0.25rem 0 0;
      color: #5f6368;
    }
    .search-field {
      width: 100%;
      max-width: 460px;
    }
    .table-card {
      overflow: hidden;
    }
    .table-wrap {
      overflow-x: auto;
    }
    table {
      width: 100%;
    }
    .book-link {
      font-weight: 600;
      color: #0b57d0;
      text-decoration: none;
    }
    .book-link:hover {
      text-decoration: underline;
    }
    .meta-line {
      font-size: 0.82rem;
      color: #5f6368;
    }
    .mono {
      font-family: monospace;
      font-size: 0.9rem;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .badge-ok {
      background: #e6f4ea;
      color: #137333;
    }
    .badge-out {
      background: #fce8e6;
      color: #b3261e;
    }
    .actions-cell {
      white-space: nowrap;
    }
    .actions-group {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-action {
      font-size: 0.8rem;
      padding: 0 0.65rem !important;
      height: 32px !important;
      line-height: 32px !important;
      border-radius: 6px !important;
      font-weight: 500;
      transition: background-color 0.15s ease, transform 0.1s ease;
    }
    .btn-action mat-icon {
      margin-right: 4px;
      font-size: 18px;
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-view {
      color: #0b57d0 !important;
      border-color: #c2e7ff !important;
    }
    .btn-view:hover {
      background-color: #e8f0fe !important;
    }
    .btn-edit {
      color: #444746 !important;
      border-color: #dadce0 !important;
    }
    .btn-edit:hover {
      color: #1f1f1f !important;
      background-color: #f1f3f4 !important;
    }
    .btn-delete {
      background-color: #d93025 !important;
      color: #ffffff !important;
    }
    .btn-delete:hover {
      background-color: #b3261e !important;
    }
    .state-card {
      padding: 1.5rem;
    }
  `,
})
export class BookListComponent implements OnInit {
  private readonly service = inject(BookService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = ['title', 'isbn', 'genre', 'location', 'availability', 'actions'];
  protected readonly search = new FormControl('', { nonNullable: true });

  protected genreLabel(genre: Book['genre']): string {
    return GENRE_LABELS[genre] ?? genre;
  }
  protected readonly items = signal<Book[]>([]);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  private readonly query$ = new BehaviorSubject<string>('');

  ngOnInit(): void {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.query$.next(q));

    this.query$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.failed.set(false);
        }),
        switchMap((q) =>
          this.service.list(q).pipe(
            catchError((err) => {
              this.failed.set(true);
              this.notify.error(extractErrorMessage(err));
              return of([] as Book[]);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => {
        this.items.set(list);
        this.loading.set(false);
      });
  }

  protected reload(): void {
    this.query$.next(this.query$.value);
  }

  protected remove(book: Book): void {
    this.confirm
      .ask({
        title: 'Excluir livro do acervo',
        message: `Deseja realmente excluir "${book.title}" (ISBN ${book.isbn})? Esta ação não pode ser desfeita.`,
        confirmText: 'Excluir',
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this.service.delete(book.id)),
      )
      .subscribe({
        next: () => {
          this.notify.success(`Livro "${book.title}" excluído com sucesso.`);
          this.reload();
        },
        error: (err) => this.notify.error(extractErrorMessage(err)),
      });
  }
}
