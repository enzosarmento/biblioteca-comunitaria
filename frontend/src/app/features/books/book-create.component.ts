import { Component, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { extractErrorMessage } from '../../shared/utils/error-utils';
import { BookFormComponent } from './book-form.component';
import { BookPayload } from './book.model';
import { BookService } from './book.service';

@Component({
  selector: 'app-book-create',
  imports: [BookFormComponent],
  template: `
    <h1>Catalogar novo livro</h1>
    <p class="subtitle">Preencha os metadados bibliográficos e a localização física no acervo.</p>
    <app-book-form [saving]="saving()" (save)="create($event)" />
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
export class BookCreateComponent {
  private readonly service = inject(BookService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly form = viewChild.required(BookFormComponent);

  protected readonly saving = signal(false);

  protected create(payload: BookPayload): void {
    this.saving.set(true);
    this.service
      .create(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (created) => {
          this.notify.success(`Livro "${created.title}" catalogado com sucesso.`);
          void this.router.navigate(['/books', created.id]);
        },
        error: (err) => {
          const mapped = this.form().showServerErrors(err);
          this.notify.error(mapped ? 'Corrija os campos destacados.' : extractErrorMessage(err));
        },
      });
  }
}

