import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Book, BookPayload } from './book.model';

@Injectable({ providedIn: 'root' })
export class BookService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/books`;

  list(query?: string): Observable<Book[]> {
    let params = new HttpParams();
    if (query?.trim()) {
      params = params.set('q', query.trim());
    }
    return this.http.get<Book[]>(this.baseUrl, { params });
  }

  get(id: number): Observable<Book> {
    return this.http.get<Book>(`${this.baseUrl}/${id}`);
  }

  create(payload: BookPayload): Observable<Book> {
    return this.http.post<Book>(this.baseUrl, payload);
  }

  update(id: number, payload: BookPayload): Observable<Book> {
    return this.http.put<Book>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

