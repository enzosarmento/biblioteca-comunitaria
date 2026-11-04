# Biblioteca Comunitária — Gestão de Acervo (Angular + Spring Boot Kotlin + JWT)

Aplicação web fullstack desenvolvida para o controle de acervo de bibliotecas comunitárias e salas de leitura escolares. O sistema permite autenticar operadores via JWT (HS256 + BCrypt), consultar disponibilidade e localização física nas estantes em tempo real, catalogar novas obras com validação de ISBN único, atualizar registros, excluir com confirmação modal e manter persistência relacional entre reinícios. Construída com **Angular 21** (standalone components, Signals, Reactive Forms, Angular Material) no frontend e **Spring Boot 3.5.6** com **Kotlin 2.1.21** + **Spring Data JPA** + **Spring Security OAuth2 Resource Server** no backend.

---

## Integrantes do Grupo

- **André Pardinho**
- **Cauan Valadão**
- **Enzo Sarmento**
- **Pedro Magalhães**
- **Ronaldo Porto**

---

## Tecnologias Utilizadas

### Backend
- **Linguagem & Framework:** Kotlin 2.1.21 / Java 21 / Spring Boot 3.5.6
- **Segurança:** Spring Security 6.5, Stateless OAuth2 Resource Server com JWT (HS256) e BCrypt (força 10)
- **Persistência:** Spring Data JPA / Hibernate 6.6
- **Bancos de Dados:** PostgreSQL 16 (padrão via Docker) / H2 Database (modo arquivo persistente para execução sem Docker)
- **Validação & Tratamento de Erros:** Jakarta Bean Validation (@Valid + use-site targets `@field:`) e `@RestControllerAdvice`
- **Build & Automação:** Gradle 8.14.3 (Wrapper Kotlin DSL)

### Frontend
- **Framework & Arquitetura:** Angular 21.2.25 (Standalone Components, Signals, Router com guards)
- **Interface & Componentes:** Angular Material 21.2.14 / Angular CDK
- **Formulários:** Reactive Forms com validações síncronas customizadas e mensagens em PT-BR
- **Comunicação HTTP:** HttpClient com `authInterceptor` funcional (injeção de token `Authorization: Bearer` e tratamento centralizado de 401)
- **Testes & Build:** Vitest 4.1.12 + JSDOM / Angular CLI 21.2.29

---

## Arquitetura e Estrutura do Projeto

```text
projeto-biblioteca/
├── backend/                  # API REST em Spring Boot + Kotlin
│   ├── src/main/kotlin/com/biblioteca/
│   │   ├── auth/             # Login, DTOs e emissão de token JWT
│   │   ├── book/             # Entidade Book, Controller CRUD, Service, Repository, DTOs
│   │   ├── common/           # ApiError, GlobalExceptionHandler e Exceções de negócio
│   │   ├── config/           # SecurityConfig, CorsConfig, JwtProperties, DataInitializer
│   │   ├── security/         # RestAuthenticationEntryPoint e RestAccessDeniedHandler
│   │   └── user/             # Entidade AppUser, Repository e UserDetailsService
│   └── src/test/kotlin/      # Testes de integração de Auth e Book com MockMvc
├── frontend/                 # Aplicação SPA Angular 21 (Standalone)
│   ├── src/app/
│   │   ├── core/             # Auth (Service, Guard, Interceptor) e Notificações (Snackbar)
│   │   ├── features/
│   │   │   ├── login/        # Tela de autenticação com formulário reativo
│   │   │   └── books/        # Telas de CRUD (Listagem, Cadastro, Edição, Detalhes)
│   │   ├── layout/           # Toolbar, Menu e navegação responsiva
│   │   └── shared/           # Modal de confirmação de exclusão e utilitários
│   └── src/environments/     # Configuração de URLs da API REST
├── docs/                     # Documentação técnica e planejamento
│   ├── 00-planejamento.md    # Contrato inicial e definição do domínio
│   └── DOCUMENTACAO.md       # Memorial descritivo completo (13k+ palavras, diagramas, ADRs)
├── docker-compose.yml        # PostgreSQL 16 (porta 5433 mapeada para o host)
└── README.md
```

---

## Como Executar

### Pré-requisitos
- **Java 21** instalado
- **Node.js 22** e **npm 10** instalados
- **Docker & Docker Compose** (ou utilize a opção local com H2)

---

### Opção A: Execução com Docker (PostgreSQL 16)

1. **Suba o contêiner do PostgreSQL:**
   ```bash
   docker compose up -d
   ```
   *(Nota: o banco é exposto na porta `localhost:5433` com credenciais `app`/`app` no banco `bibliotecadb`)*

2. **Inicie o Backend (Spring Boot):**
   ```bash
   cd backend
   ./gradlew bootRun
   ```
   *A API estará disponível em `http://localhost:8080/api`.*

3. **Inicie o Frontend (Angular):**
   ```bash
   cd frontend
   npm ci
   npx ng serve
   ```
   *Acesse no navegador: `http://localhost:4200`.*

---

### Opção B: Execução Sem Docker (H2 Persistente em Arquivo)

Caso não tenha o Docker configurado, execute o backend com o perfil `h2`. Os dados serão persistidos em arquivo no diretório `backend/data/bibliotecadb`:

```bash
cd backend
SPRING_PROFILES_ACTIVE=h2 ./gradlew bootRun
```
*(Console web do H2 acessível em `http://localhost:8080/h2-console` com JDBC URL `jdbc:h2:file:./data/bibliotecadb` e usuário `sa`)*

---

## Credenciais de Acesso (Seed Automático)

Ao iniciar a aplicação pela primeira vez, o sistema cria automaticamente o usuário administrador e 10 obras de demonstração no acervo:

- **Usuário:** `admin`
- **Senha:** `admin123`

---

## Endpoints Principais da API REST

Todas as rotas sob `/api/books` exigem o cabeçalho `Authorization: Bearer <TOKEN>`.

| Método | Endpoint | Descrição | Status HTTP |
|---|---|---|---|
| `POST` | `/api/auth/login` | Autenticação com username e senha | `200 OK` / `401 Unauthorized` |
| `GET` | `/api/books` | Listagem com busca opcional (`?q=termo`) | `200 OK` |
| `GET` | `/api/books/{id}` | Detalhes completos da obra | `200 OK` / `404 Not Found` |
| `POST` | `/api/books` | Cadastro de nova obra (validação de ISBN) | `201 Created` (`Location`) / `400` / `409` |
| `PUT` | `/api/books/{id}` | Atualização integral dos dados do livro | `200 OK` / `400` / `404` / `409` |
| `DELETE` | `/api/books/{id}` | Exclusão definitiva da obra | `204 No Content` / `404 Not Found` |

---

## Testes Automatizados e Validação

### Testes do Backend (MockMvc + JUnit 5)
```bash
cd backend
./gradlew test
```
*Executa 14 testes cobrindo autenticação, emissão e expiração de JWT, validações DTO, conflito de ISBN e operações CRUD.*

### Testes do Frontend (Vitest + JSDOM) e Build de Produção
```bash
cd frontend
npx ng test --watch=false
npx ng build
```
*Executa 11 testes unitários (guards, interceptor, serviços, formulários reativos) e compila o bundle de produção otimizado.*

### Auditoria Estática dos Requisitos
```bash
python3 .agents/skills/fullstack-requirements-verification/scripts/verify_requirements.py .
python3 .agents/skills/project-technical-documentation/scripts/check_docs.py docs/DOCUMENTACAO.md --project .
```
*Validação automatizada de 48 regras arquiteturais e conformidade estrita da documentação técnica.*

---

## Documentação Técnica Completa

Para detalhes aprofundados sobre decisões de arquitetura (ADRs), modelo entidade-relacionamento (DER), fluxos de autenticação, tratamento de erros RFC 7807 e matriz de rastreabilidade completa (36 requisitos), consulte:
- [`docs/DOCUMENTACAO.md`](docs/DOCUMENTACAO.md) — Memorial descritivo técnico completo.
- [`docs/00-planejamento.md`](docs/00-planejamento.md) — Documento de planejamento e contrato de dados.
