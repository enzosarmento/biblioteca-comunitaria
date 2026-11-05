import { Component, effect, input, output } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { applyServerFieldErrors, controlErrorMessage } from '../../shared/utils/error-utils';
import { BOOK_GENRES, Book, BookGenre, BookPayload, GENRE_LABELS } from './book.model';

const notFutureDateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  const today = new Date().toISOString().slice(0, 10);
  return value > today ? { futureDate: true } : null;
};

@Component({
  selector: 'app-book-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
  ],
  template: `
    <mat-card class="form-card">
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="grid">
          <mat-form-field appearance="outline" class="span-2">
            <mat-label>Título da obra</mat-label>
            <input matInput formControlName="title" />
            @if (error('title'); as msg) {
              <mat-error>{{ msg }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Autor(a)</mat-label>
            <input matInput formControlName="author" />
            @if (error('author'); as msg) {
              <mat-error>{{ msg }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>ISBN</mat-label>
            <input
              matInput
              formControlName="isbn"
              placeholder="Ex.: 978-85-359-0277-8"
              maxlength="17"
              (keydown)="onIsbnKeyDown($event)"
              (input)="onIsbnInput($event)"
            />
            @if (error('isbn'); as msg) {
              <mat-error>{{ msg }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Editora</mat-label>
            <input matInput formControlName="publisher" />
            @if (error('publisher'); as msg) {
              <mat-error>{{ msg }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Ano de publicação</mat-label>
            <input matInput type="number" formControlName="publicationYear" />
            @if (error('publicationYear'); as msg) {
              <mat-error>{{ msg }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Gênero literário</mat-label>
            <mat-select formControlName="genre">
              @for (g of genres; track g) {
                <mat-option [value]="g">{{ labels[g] }}</mat-option>
              }
            </mat-select>
            @if (error('genre'); as msg) {
              <mat-error>{{ msg }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Total de exemplares</mat-label>
            <input matInput type="number" formControlName="copiesTotal" />
            @if (error('copiesTotal'); as msg) {
              <mat-error>{{ msg }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Exemplares disponíveis</mat-label>
            <input matInput type="number" formControlName="copiesAvailable" />
            @if (error('copiesAvailable'); as msg) {
              <mat-error>{{ msg }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Localização (corredor / estante)</mat-label>
            <input matInput formControlName="location" placeholder="Ex.: Corredor A - Estante 1" />
            @if (error('location'); as msg) {
              <mat-error>{{ msg }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Data de aquisição (opcional)</mat-label>
            <input matInput type="date" formControlName="acquisitionDate" />
            @if (error('acquisitionDate'); as msg) {
              <mat-error>{{ msg }}</mat-error>
            }
          </mat-form-field>

          <div class="toggle-cell">
            <mat-slide-toggle formControlName="active">
              Obra ativa para empréstimo
            </mat-slide-toggle>
          </div>

          <mat-form-field appearance="outline" class="wide">
            <mat-label>Sinopse / observações (opcional)</mat-label>
            <textarea matInput rows="4" formControlName="synopsis"></textarea>
            @if (error('synopsis'); as msg) {
              <mat-error>{{ msg }}</mat-error>
            }
          </mat-form-field>

          <div class="actions wide">
            <a mat-button routerLink="/books">Cancelar</a>
            <button mat-flat-button type="submit" [disabled]="saving()">
              {{ saving() ? 'Salvando...' : 'Salvar livro' }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .form-card {
      padding: 0.75rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.25rem 1rem;
      align-items: start;
    }
    .span-2 {
      grid-column: span 2;
    }
    @media (max-width: 640px) {
      .span-2 {
        grid-column: 1 / -1;
      }
    }
    .wide {
      grid-column: 1 / -1;
    }
    .toggle-cell {
      display: flex;
      align-items: center;
      min-height: 56px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
  `,
})
export class BookFormComponent {
  readonly initial = input<Book | null>(null);
  readonly saving = input(false);
  readonly save = output<BookPayload>();

  protected readonly genres = BOOK_GENRES;
  protected readonly labels = GENRE_LABELS;

  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(150)],
    }),
    author: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(120)],
    }),
    isbn: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(20),
        Validators.pattern(/^[0-9-]{9,19}[0-9Xx]$/),
      ],
    }),
    publisher: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
    publicationYear: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1450),
      Validators.max(2026),
    ]),
    genre: new FormControl<BookGenre | null>(null, [Validators.required]),
    copiesTotal: new FormControl<number | null>(1, [Validators.required, Validators.min(1)]),
    copiesAvailable: new FormControl<number | null>(1, [Validators.required, Validators.min(0)]),
    location: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(60)],
    }),
    acquisitionDate: new FormControl('', {
      nonNullable: true,
      validators: [notFutureDateValidator],
    }),
    synopsis: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
    active: new FormControl(true, { nonNullable: true }),
  });

  private static readonly labelOf: Record<string, string> = {
    title: 'Título',
    author: 'Autor(a)',
    isbn: 'ISBN',
    publisher: 'Editora',
    publicationYear: 'Ano de publicação',
    genre: 'Gênero literário',
    copiesTotal: 'Total de exemplares',
    copiesAvailable: 'Exemplares disponíveis',
    location: 'Localização',
    acquisitionDate: 'Data de aquisição',
    synopsis: 'Sinopse',
  };

  constructor() {
    effect(() => {
      const b = this.initial();
      if (b) {
        this.form.patchValue({
          title: b.title,
          author: b.author,
          isbn: b.isbn,
          publisher: b.publisher,
          publicationYear: b.publicationYear,
          genre: b.genre,
          copiesTotal: b.copiesTotal,
          copiesAvailable: b.copiesAvailable,
          location: b.location,
          acquisitionDate: b.acquisitionDate ?? '',
          synopsis: b.synopsis ?? '',
          active: b.active,
        });
      }
    });
  }

  protected error(name: keyof typeof BookFormComponent.labelOf): string | null {
    return controlErrorMessage(this.form.get(name), BookFormComponent.labelOf[name]);
  }

  showServerErrors(err: unknown): boolean {
    return applyServerFieldErrors(this.form, err);
  }

  protected onIsbnKeyDown(event: KeyboardEvent): void {
    if (
      event.key === 'Backspace' ||
      event.key === 'Delete' ||
      event.key === 'Tab' ||
      event.key === 'Escape' ||
      event.key === 'Enter' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'Home' ||
      event.key === 'End' ||
      event.ctrlKey ||
      event.metaKey
    ) {
      if (event.key === 'Backspace') {
        const input = event.target as HTMLInputElement;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? 0;
        if (start === end && start > 1 && input.value[start - 1] === '-') {
          event.preventDefault();
          const val = input.value;
          const newVal = val.slice(0, start - 2) + val.slice(start);
          const formatted = this.formatIsbn(newVal);
          input.value = formatted;
          this.form.controls.isbn.setValue(formatted);
          const newPos = Math.max(0, start - 2);
          input.setSelectionRange(newPos, newPos);
        }
      }
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  protected onIsbnInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const oldVal = input.value;
    const oldPos = input.selectionEnd ?? oldVal.length;
    const formatted = this.formatIsbn(oldVal);

    if (formatted !== oldVal) {
      input.value = formatted;
      this.form.controls.isbn.setValue(formatted);

      const digitsBefore = oldVal.slice(0, oldPos).replace(/\D/g, '').length;
      let newPos = 0;
      let counted = 0;
      while (newPos < formatted.length && counted < digitsBefore) {
        if (/\d/.test(formatted[newPos])) {
          counted++;
        }
        newPos++;
      }
      input.setSelectionRange(newPos, newPos);
    } else {
      this.form.controls.isbn.setValue(formatted);
    }
  }

  private formatIsbn(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('978') || digits.startsWith('979') || digits.length > 10) {
      const d = digits.slice(0, 13);
      if (d.length <= 3) return d;
      if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
      if (d.length <= 8) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
      if (d.length <= 12) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5, 8)}-${d.slice(8)}`;
      return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5, 8)}-${d.slice(8, 12)}-${d.slice(12, 13)}`;
    }

    if (digits.length <= 3 && ('978'.startsWith(digits) || '979'.startsWith(digits))) {
      return digits;
    }

    const d = digits.slice(0, 10);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5, 9)}-${d.slice(9, 10)}`;
  }

  protected submit(): void {
    const total = this.form.controls.copiesTotal.value;
    const available = this.form.controls.copiesAvailable.value;
    if (total !== null && available !== null && available > total) {
      this.form.controls.copiesAvailable.setErrors({ copiesExceeded: true });
      this.form.controls.copiesAvailable.markAsTouched();
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.save.emit({
      title: v.title.trim(),
      author: v.author.trim(),
      isbn: v.isbn.trim().toUpperCase(),
      publisher: v.publisher.trim(),
      publicationYear: v.publicationYear!,
      genre: v.genre!,
      copiesTotal: v.copiesTotal!,
      copiesAvailable: v.copiesAvailable!,
      location: v.location.trim(),
      acquisitionDate: v.acquisitionDate.trim() || null,
      synopsis: v.synopsis.trim() || null,
      active: v.active,
    });
  }
}

