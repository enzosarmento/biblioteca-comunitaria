import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ForbiddenComponent } from './forbidden.component';

describe('ForbiddenComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForbiddenComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('deve ser instanciado e exibir o botão para voltar a pagina principal', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.title')?.textContent).toContain('Acesso Não Autorizado');
    const homeBtn = compiled.querySelector('.btn-home') as HTMLAnchorElement;
    expect(homeBtn).toBeTruthy();
    expect(homeBtn.textContent).toContain('Voltar para a página principal');
  });
});

