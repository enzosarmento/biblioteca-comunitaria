# Biblioteca Comunitária — Gestão de Acervo (Angular + Spring Boot Kotlin + JWT)

Aplicação web fullstack desenvolvida para o controle de acervo de bibliotecas comunitárias e salas de leitura escolares. O sistema permite autenticar operadores via JWT (HS256 + BCrypt), consultar disponibilidade e localização física nas estantes em tempo real, catalogar novas obras com validação de ISBN único, atualizar registros, excluir com confirmação modal e manter persistência relacional entre reinícios. Construída com **Angular 21** (standalone components, Signals, Reactive Forms, Angular Material) no frontend e **Spring Boot 3.5.6** com **Kotlin 2.1.21** + **Spring Data JPA** + **Spring Security OAuth2 Resource Server** no backend.

## Como Executar

### 1. Banco de dados e Backend (`http://localhost:8080`)
Com Docker (PostgreSQL 16 com volume persistente `pgdata`):
```bash
docker compose up -d
cd backend && ./gradlew bootRun
```
Alternativa local sem Docker (H2 persistente em disco em `backend/data/`):
```bash
cd backend && SPRING_PROFILES_ACTIVE=h2 ./gradlew bootRun
```

### 2. Frontend Angular (`http://localhost:4200`)
```bash
cd frontend && npm ci && npx ng serve
```

## Credenciais de Desenvolvimento (Seed Automático)
- **Usuário:** `admin`
- **Senha:** `admin123`

## Testes Automatizados
```bash
cd backend && ./gradlew test
cd frontend && npx ng test --watch=false && npx ng build
```

## Documentação Técnica Completa
Consulte o memorial descritivo detalhado (arquitetura, modelo de dados, contrato REST, segurança JWT, telas Angular, testes, decisões e matriz de rastreabilidade) em [`docs/DOCUMENTACAO.md`](docs/DOCUMENTACAO.md) e o contrato inicial em [`docs/00-planejamento.md`](docs/00-planejamento.md).

