import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookFormComponent } from './book-form.component';
import { BookPayload } from './book.model';

describe('BookFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookFormComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('inicia inválido quando campos obrigatórios estão vazios', () => {
    const fixture = TestBed.createComponent(BookFormComponent);
    fixture.detectChanges();

    const emitted: BookPayload[] = [];
    fixture.componentInstance.save.subscribe((val) => emitted.push(val));

    const formEl = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formEl.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitted.length).toBe(0);
  });

  it('emite payload normalizado quando todos os campos são válidos', () => {
    const fixture = TestBed.createComponent(BookFormComponent);
    fixture.detectChanges();

    const emitted: BookPayload[] = [];
    fixture.componentInstance.save.subscribe((val) => emitted.push(val));

    const comp = fixture.componentInstance as unknown as {
      form: BookFormComponent['form'];
      submit: () => void;
    };
    comp.form.patchValue({
      title: ' Dom Casmurro ',
      author: 'Machado de Assis',
      isbn: '978-85-359-0277-8',
      publisher: 'Companhia das Letras',
      publicationYear: 1899,
      genre: 'ROMANCE',
      copiesTotal: 3,
      copiesAvailable: 2,
      location: 'Corredor A - Estante 1',
      acquisitionDate: '',
      synopsis: '',
      active: true,
    });
    comp.submit();

    expect(emitted.length).toBe(1);
    expect(emitted[0].title).toBe('Dom Casmurro');
    expect(emitted[0].acquisitionDate).toBeNull();
    expect(emitted[0].synopsis).toBeNull();
  });
});
