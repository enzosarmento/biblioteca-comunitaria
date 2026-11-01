import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';
import { ApiError } from '../../core/models/api-error.model';

export function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    }
    const body = err.error as Partial<ApiError> | null;
    if (body?.message) {
      return body.message;
    }
    if (err.status >= 500) {
      return 'Erro interno do servidor. Tente novamente em instantes.';
    }
  }
  return 'Ocorreu um erro inesperado.';
}

export function applyServerFieldErrors(form: FormGroup, err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse) || err.status !== 400) {
    return false;
  }
  const fields = (err.error as Partial<ApiError> | null)?.fieldErrors ?? [];
  let applied = false;
  for (const f of fields) {
    const control = form.get(f.field);
    if (control) {
      control.setErrors({ server: f.message });
      control.markAsTouched();
      applied = true;
    }
  }
  return applied;
}

export function controlErrorMessage(control: AbstractControl | null, label: string): string | null {
  if (!control?.errors || !(control.touched || control.dirty)) {
    return null;
  }
  const e = control.errors;
  if (e['server']) return String(e['server']);
  if (e['required']) return `O campo "${label}" é obrigatório.`;
  if (e['minlength']) return `${label} deve ter pelo menos ${e['minlength'].requiredLength} caracteres.`;
  if (e['maxlength']) return `${label} deve ter no máximo ${e['maxlength'].requiredLength} caracteres.`;
  if (e['min']) return `${label} deve ser no mínimo ${e['min'].min}.`;
  if (e['max']) return `${label} deve ser no máximo ${e['max'].max}.`;
  if (e['copiesExceeded']) return 'A quantidade disponível não pode exceder o total de exemplares.';
  if (e['futureDate']) return 'A data de aquisição não pode ser futura.';
  if (e['pattern']) return `${label} está em formato inválido.`;
  return `${label} é inválido.`;
}

