export type BookGenre =
  | 'ROMANCE'
  | 'FICCAO_CIENTIFICA'
  | 'FANTASIA'
  | 'INFANTIL'
  | 'BIOGRAFIA'
  | 'HISTORIA'
  | 'DIDATICO'
  | 'POESIA'
  | 'TECNICO'
  | 'OUTROS';

export const GENRE_LABELS: Record<BookGenre, string> = {
  ROMANCE: 'Romance',
  FICCAO_CIENTIFICA: 'Ficção Científica',
  FANTASIA: 'Fantasia',
  INFANTIL: 'Infantil e Juvenil',
  BIOGRAFIA: 'Biografia e Memórias',
  HISTORIA: 'História e Sociedade',
  DIDATICO: 'Didático',
  POESIA: 'Poesia',
  TECNICO: 'Técnico e Científico',
  OUTROS: 'Outros',
};

export const BOOK_GENRES = Object.keys(GENRE_LABELS) as BookGenre[];

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publicationYear: number;
  genre: BookGenre;
  copiesTotal: number;
  copiesAvailable: number;
  location: string;
  acquisitionDate: string | null;
  synopsis: string | null;
  active: boolean;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookPayload {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publicationYear: number;
  genre: BookGenre;
  copiesTotal: number;
  copiesAvailable: number;
  location: string;
  acquisitionDate: string | null;
  synopsis: string | null;
  active: boolean;
}

