# Planejamento e Contrato da Aplicação — Biblioteca Comunitária

## 1. Problema, Público-Alvo e Funcionalidades Propostas

### Problema
Bibliotecas comunitárias de bairro, salas de leitura escolares e projetos sociais frequentemente controlam seu acervo por meio de cadernos manuscritos ou planilhas descentralizadas. Na prática, esse controle informal provoca perda de histórico sobre obras doadas, cadastro duplicado de edições com o mesmo ISBN, dificuldade para localizar rapidamente em qual corredor ou estante determinado livro está guardado e desconhecimento imediato sobre quantos exemplares continuam disponíveis para empréstimo no balcão.

Sem um catálogo único autenticado e persistente, voluntários gastam vários minutos procurando livros fisicamente nas prateleiras apenas para descobrir que todos os exemplares já foram retirados ou que a obra foi desativada para restauração. Além disso, planilhas compartilhadas sem validação aceitam anos de publicação inválidos, quantidades negativas ou ISBNs repetidos, degradando a confiabilidade do inventário ao longo do semestre.

### Público-Alvo
- **Bibliotecários voluntários e atendentes de balcão**: responsáveis pela consulta diária de disponibilidade, localização física nas estantes e atualização rápida do número de exemplares disponíveis.
- **Coordenadores pedagógicos e gestores de bibliotecas escolares/comunitárias**: responsáveis pela catalogação de novas aquisições e doações, revisão cadastral de obras e baixa de títulos danificados ou extraviados.

O público possui nível técnico básico a intermediário (uso cotidiano de navegadores web em computadores de secretaria ou notebooks), exigindo interface limpa em português, mensagens de validação claras e proteção contra exclusões acidentais.

### Funcionalidades Implementadas
| ID | Funcionalidade | Descrição | Tela(s) Angular | Endpoint(s) Backend |
|---|---|---|---|---|
| F-01 | Autenticação com JWT | Login com usuário e senha validados com BCrypt e emissão de token JWT com expiração | `/login` | `POST /api/auth/login` |
| F-02 | Listagem e busca do acervo | Exibição tabular dos livros com busca textual por título, autor ou ISBN e indicador visual de disponibilidade | `/books` | `GET /api/books`, `GET /api/books?q=...` |
| F-03 | Catalogação de livro | Formulário reativo validado para cadastrar nova obra verificando unicidade de ISBN e consistência de exemplares | `/books/new` | `POST /api/books` |
| F-04 | Consulta de detalhes da obra | Exibição completa dos metadados catalográficos, localização na estante, sinopse e datas de auditoria | `/books/:id` | `GET /api/books/{id}` |
| F-05 | Atualização cadastral | Edição dos dados da obra e da quantidade disponível/total mantendo validações de domínio | `/books/:id/edit` | `PUT /api/books/{id}` |
| F-06 | Exclusão com confirmação | Remoção definitiva de registro precedida obrigatoriamente por diálogo modal de confirmação | `/books`, `/books/:id` | `DELETE /api/books/{id}` |
| F-07 | Encerramento de sessão e expiração | Logout explícito na barra superior e interceptação automática de respostas HTTP 401 por sessão expirada/inválida | Layout autenticado | — (cliente + `401` da API) |

### Funcionalidades Propostas para Evolução (Fora do Escopo Atual)
- Registro individualizado de empréstimos e devoluções por leitor com cálculo automático de atraso.
- Reserva online de exemplares por leitores externos com perfil de consulta pública.
- Paginação e ordenação parametrizada no servidor para acervos acima de dezenas de milhares de volumes.

---

## 2. Modelo de Dados

### Entidade `AppUser` (tabela `app_users`)
| Campo | Tipo Kotlin | Coluna SQL | Restrições |
|---|---|---|---|
| `id` | `Long?` | `id BIGSERIAL` | PK, auto-incremento |
| `username` | `String` | `username VARCHAR(60)` | `NOT NULL`, `UNIQUE` |
| `passwordHash` | `String` | `password_hash VARCHAR(100)` | `NOT NULL` (hash BCrypt) |
| `role` | `Role` (`ADMIN`, `USER`) | `role VARCHAR(20)` | `NOT NULL` (`EnumType.STRING`) |
| `enabled` | `Boolean` | `enabled BOOLEAN` | `NOT NULL`, padrão `true` |

### Entidade Principal `Book` (tabela `books`)
| Campo | Tipo Kotlin | Coluna SQL | Restrições e Validações |
|---|---|---|---|
| `id` | `Long?` | `id BIGSERIAL` | PK, auto-incremento |
| `title` | `String` | `title VARCHAR(150)` | Obrigatório, 2 a 150 caracteres |
| `author` | `String` | `author VARCHAR(120)` | Obrigatório, 3 a 120 caracteres |
| `isbn` | `String` | `isbn VARCHAR(20)` | Obrigatório, `UNIQUE` (`uk_books_isbn`), 10 a 20 caracteres, formato ISBN (`^[0-9-]{10,20}$` ou final `X`) |
| `publisher` | `String` | `publisher VARCHAR(100)` | Obrigatório, 2 a 100 caracteres |
| `publicationYear` | `Int` | `publication_year INTEGER` | Obrigatório, entre `1450` e `2026` |
| `genre` | `BookGenre` | `genre VARCHAR(30)` | Obrigatório (`ROMANCE`, `FICCAO_CIENTIFICA`, `FANTASIA`, `INFANTIL`, `BIOGRAFIA`, `HISTORIA`, `DIDATICO`, `POESIA`, `TECNICO`, `OUTROS`) |
| `copiesTotal` | `Int` | `copies_total INTEGER` | Obrigatório, `>= 1` |
| `copiesAvailable` | `Int` | `copies_available INTEGER` | Obrigatório, `>= 0` e `<= copiesTotal` (regra de negócio) |
| `location` | `String` | `location VARCHAR(60)` | Obrigatório, 2 a 60 caracteres (ex.: `Corredor A - Estante 1`) |
| `acquisitionDate` | `LocalDate?` | `acquisition_date DATE` | Opcional, não pode ser data futura (`@PastOrPresent`) |
| `synopsis` | `String?` | `synopsis VARCHAR(1000)` | Opcional, até 1000 caracteres |
| `active` | `Boolean` | `active BOOLEAN` | Obrigatório, padrão `true` |
| `createdAt` | `Instant` | `created_at TIMESTAMP` | `NOT NULL`, imutável |
| `updatedAt` | `Instant` | `updated_at TIMESTAMP` | `NOT NULL`, atualizado via `@PreUpdate` |

---

## 3. Contrato da API REST

Base URL: `http://localhost:8080/api`

| Método | Caminho | Autenticação | Request | Response | Códigos HTTP |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | Pública | `LoginRequest` (`username`, `password`) | `LoginResponse` (`token`, `tokenType`, `expiresIn`, `expiresAt`, `username`, `role`) | `200`, `400`, `401` |
| `GET` | `/api/books` | Bearer JWT | Query opcional `?q=termo` | `List<BookResponse>` | `200`, `401` |
| `GET` | `/api/books/{id}` | Bearer JWT | Path `id: Long` | `BookResponse` | `200`, `400`, `401`, `404` |
| `POST` | `/api/books` | Bearer JWT | `BookRequest` | `BookResponse` + Header `Location` | `201`, `400`, `401`, `409` |
| `PUT` | `/api/books/{id}` | Bearer JWT | Path `id` + `BookRequest` | `BookResponse` | `200`, `400`, `401`, `404`, `409` |
| `DELETE` | `/api/books/{id}` | Bearer JWT | Path `id: Long` | Sem corpo | `204`, `400`, `401`, `404` |

### Formato Padronizado de Erro (`ApiError`)
```json
{
  "timestamp": "2026-10-31T23:30:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Há campos inválidos. Corrija e tente novamente.",
  "path": "/api/books",
  "fieldErrors": [
    { "field": "title", "message": "O título é obrigatório" }
  ]
}
```
Códigos de erro padronizados: `VALIDATION_ERROR`, `MALFORMED_REQUEST`, `NOT_FOUND`, `CONFLICT`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `FORBIDDEN`, `METHOD_NOT_ALLOWED`, `INTERNAL_ERROR`.

---

## 4. Mapa de Rotas e Arquitetura do Frontend Angular

| Rota | Componente | Guard | Serviços Consumidos |
|---|---|---|---|
| `/login` | `LoginComponent` | `guestGuard` | `AuthService` |
| `/books` | `BookListComponent` | `authGuard` | `BookService`, `ConfirmService`, `NotificationService` |
| `/books/new` | `BookCreateComponent` (`BookFormComponent`) | `authGuard` | `BookService`, `NotificationService` |
| `/books/:id` | `BookDetailComponent` | `authGuard` | `BookService`, `ConfirmService`, `NotificationService` |
| `/books/:id/edit` | `BookEditComponent` (`BookFormComponent`) | `authGuard` | `BookService`, `NotificationService` |
| `**` | Redireciona para `/books` | — | — |

---

## 5. Diário de Decisões e Suposições

1. **Tema escolhido**: Biblioteca Comunitária (`Book`), conforme seleção na etapa de levantamento de requisitos, sem identificação nominal de equipe/disciplina na capa.
2. **Validação e emissão JWT via Spring Security OAuth2 Resource Server (Nimbus HS256)**: adotado em vez de filtro manual com `jjwt` para delegar verificação criptográfica, parsing e checagem de expiração (`exp`) ao framework oficial, reduzindo superfície de erro.
3. **Persistência dupla (PostgreSQL padrão + perfil `h2` em arquivo local)**: `application.yml` aponta para PostgreSQL via `docker-compose.yml` com volume nomeado `pgdata`. Como o ambiente local atual não possui binário `docker` instalado, foi adicionado também o perfil `h2` com banco persistente em disco (`jdbc:h2:file:./data/bibliotecadb;MODE=PostgreSQL;AUTO_SERVER=TRUE`), permitindo executar e comprovar persistência real entre reinícios sem usar banco em memória.
4. **DTOs Kotlin com campos não-String anuláveis + `@field:NotNull`**: permite que a ausência de campos numéricos ou enums no JSON dispare mensagens específicas por campo via Bean Validation (`VALIDATION_ERROR`), em vez de erro genérico de parsing.
5. **Regras de negócio no `BookService`**: (a) unicidade de ISBN gerando HTTP `409 CONFLICT`; (b) `copiesAvailable <= copiesTotal` e `publicationYear <= Year.now().value` gerando HTTP `400 VALIDATION_ERROR` com `fieldErrors` associado ao campo inválido.
6. **Armazenamento do JWT em `localStorage` sincronizado com Angular `signal`**: simplifica reatividade da interface e integração com `HttpInterceptorFn` stateless, registrando-se na documentação o trade-off frente a cookies `HttpOnly` quanto a XSS/CSRF.

