import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { filter, finalize, switchMap } from 'rxjs';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../shared/utils/error-utils';
import { Book, GENRE_LABELS } from './book.model';
import { BookService } from './book.service';

@Component({
  selector: 'app-book-detail',
  imports: [
    RouterLink,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (book(); as b) {
      <mat-card class="detail-card">
        <mat-card-header>
          <mat-card-title>{{ b.title }}</mat-card-title>
          <mat-card-subtitle>
            {{ b.author }} · {{ b.publisher }} ({{ b.publicationYear }})
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content class="detail-content">
          <dl class="detail-grid">
            <dt>ISBN</dt>
            <dd class="mono">{{ b.isbn }}</dd>

            <dt>Gênero literário</dt>
            <dd>{{ labels[b.genre] }}</dd>

            <dt>Localização na estante</dt>
            <dd>{{ b.location }}</dd>

            <dt>Disponibilidade</dt>
            <dd>
              {{ b.copiesAvailable }} de {{ b.copiesTotal }} exemplar(es) disponível(is)
              @if (!b.available) {
                <strong class="warn">
                  — {{ b.active ? 'Todos os exemplares estão emprestados' : 'Obra inativa para circulação' }}
                </strong>
              }
            </dd>

            <dt>Situação cadastral</dt>
            <dd>{{ b.active ? 'Ativa no acervo' : 'Inativa' }}</dd>

            <dt>Data de aquisição</dt>
            <dd>{{ b.acquisitionDate ? (b.acquisitionDate | date: 'dd/MM/yyyy') : 'Não informada' }}</dd>

            <dt>Sinopse / observações</dt>
            <dd>{{ b.synopsis || 'Nenhuma sinopse registrada.' }}</dd>

            <dt>Cadastrado em</dt>
            <dd>{{ b.createdAt | date: 'dd/MM/yyyy HH:mm' }}</dd>

            <dt>Última atualização</dt>
            <dd>{{ b.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
          </dl>
        </mat-card-content>

        <mat-card-actions align="end" class="detail-actions">
          <a mat-button routerLink="/books">
            <mat-icon>arrow_back</mat-icon>
            Voltar ao acervo
          </a>
          <a mat-stroked-button [routerLink]="['/books', b.id, 'edit']">
            <mat-icon>edit</mat-icon>
            Editar
          </a>
          <button mat-flat-button type="button" (click)="remove(b)">
            <mat-icon>delete</mat-icon>
            Excluir
          </button>
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: `
    .detail-card {
      padding: 0.75rem;
    }
    .detail-content {
      margin-top: 1rem;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.65rem 1.75rem;
      margin: 0;
    }
    @media (max-width: 600px) {
      .detail-grid {
        grid-template-columns: 1fr;
        gap: 0.25rem;
      }
      dt {
        margin-top: 0.5rem;
      }
    }
    dt {
      font-weight: 600;
      color: #44474f;
    }
    dd {
      margin: 0;
    }
    .mono {
      font-family: monospace;
    }
    .warn {
      color: #b3261e;
    }
    .detail-actions {
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
  `,
})
export class BookDetailComponent implements OnInit {
  private readonly service = inject(BookService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly book = signal<Book | null>(null);
  protected readonly loading = signal(true);
  protected readonly labels = GENRE_LABELS;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (found) => this.book.set(found),
        error: (err) => {
          this.notify.error(
            err.status === 404 ? 'Livro não encontrado no acervo.' : extractErrorMessage(err),
          );
          void this.router.navigate(['/books']);
        },
      });
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
          void this.router.navigate(['/books']);
        },
        error: (err) => this.notify.error(extractErrorMessage(err)),
      });
  }
}

