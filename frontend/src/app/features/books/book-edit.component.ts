import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../shared/utils/error-utils';
import { BookFormComponent } from './book-form.component';
import { Book, BookPayload } from './book.model';
import { BookService } from './book.service';

@Component({
  selector: 'app-book-edit',
  imports: [BookFormComponent, MatProgressBarModule],
  template: `
    <h1>Editar livro</h1>
    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (book(); as b) {
      <p class="subtitle">Atualizando cadastro de "{{ b.title }}" (ISBN {{ b.isbn }})</p>
      <app-book-form [initial]="b" [saving]="saving()" (save)="update($event)" />
    }
  `,
  styles: `
    h1 {
      margin: 0 0 0.25rem;
    }
    .subtitle {
      margin: 0 0 1.25rem;
      color: #5f6368;
    }
  `,
})
export class BookEditComponent implements OnInit {
  private readonly service = inject(BookService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly form = viewChild(BookFormComponent);

  protected readonly book = signal<Book | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  private id = 0;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.service
      .get(this.id)
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

  protected update(payload: BookPayload): void {
    this.saving.set(true);
    this.service
      .update(this.id, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.notify.success(`Livro "${updated.title}" atualizado com sucesso.`);
          void this.router.navigate(['/books', updated.id]);
        },
        error: (err) => {
          const mapped = this.form()?.showServerErrors(err) ?? false;
          this.notify.error(mapped ? 'Corrija os campos destacados.' : extractErrorMessage(err));
        },
      });
  }
}

