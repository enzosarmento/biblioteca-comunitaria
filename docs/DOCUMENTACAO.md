# Sistema de Gestão de Acervo — Biblioteca Comunitária

**Tema:** Biblioteca Comunitária — Catalogação, Disponibilidade e Localização Física de Obras  
**Integrantes do Grupo:**
- André Pardinho
- Cauan Valadão
- Enzo Sarmento
- Pedro Magalhães
- Ronaldo Porto

**Data:** 31 de outubro de 2026  
**Versão do documento:** 1.0  
**Repositório / Diretório do projeto:** `projeto-biblioteca` ([README principal](../README.md) · [Planejamento e contrato](00-planejamento.md))

---

## Sumário

1. [Resumo](#1-resumo)
2. [Problema, Público-Alvo e Funcionalidades](#2-problema-público-alvo-e-funcionalidades)
3. [Requisitos e Rastreabilidade](#3-requisitos-e-rastreabilidade)
4. [Arquitetura](#4-arquitetura)
5. [Modelo de Dados](#5-modelo-de-dados)
6. [Backend e API REST](#6-backend-e-api-rest)
7. [Segurança e Autenticação JWT](#7-segurança-e-autenticação-jwt)
8. [Frontend Angular](#8-frontend-angular)
9. [Como Executar](#9-como-executar)
10. [Testes e Validação](#10-testes-e-validação)
11. [Decisões Técnicas](#11-decisões-técnicas)
12. [Limitações e Melhorias Futuras](#12-limitações-e-melhorias-futuras)
13. [Glossário](#13-glossário)
14. [Apêndices](#apêndices)

---

## 1. Resumo

O **Sistema de Gestão de Acervo para Biblioteca Comunitária** é uma aplicação web completa (*fullstack*) projetada para substituir planilhas isoladas e livros de tombo manuscritos utilizados por bibliotecários voluntários, coordenadores pedagógicos e atendentes de salas de leitura comunitárias. A plataforma oferece autenticação *stateless* (sem estado de sessão no servidor) baseada em **JWT** (*JSON Web Token*, padrão RFC 7519) com senhas protegidas por *hash* adaptativo **BCrypt**, além do ciclo completo de operações **CRUD** (*Create, Read, Update, Delete* — criar, consultar, atualizar e excluir) sobre o catálogo bibliográfico (`Book`), incluindo busca textual instantânea, controle de exemplares totais versus disponíveis, localização física por corredor/estante e proteção contra duplicidade de ISBN. O sistema foi construído com **Angular 21.2.25** (*standalone components*, *Signals*, *Reactive Forms* e **Angular Material 21.2.14**) no *frontend* e **Spring Boot 3.5.6** com **Kotlin 2.1.21**, **Spring Data JPA**, **Spring Security OAuth2 Resource Server** e **PostgreSQL 16** (com alternativa local persistente em disco via H2) no *backend*. A solução passou por auditoria estática automatizada, 25 testes automatizados de unidade e integração e 22 cenários reais de verificação ponta a ponta, todos aprovados sem falhas.

---

## 2. Problema, Público-Alvo e Funcionalidades

### 2.1 Problema

Bibliotecas comunitárias de bairro, associações culturais e salas de leitura escolares desempenham papel essencial na democratização do acesso ao livro, mas raramente dispõem de sistemas bibliotecários comerciais devido ao custo de licenciamento e à complexidade operacional. Em consequência, o controle do acervo costuma ser realizado em cadernos de registro físico ou em planilhas eletrônicas editadas manualmente por diferentes voluntários ao longo da semana.

Esse modelo informal gera falhas recorrentes no atendimento cotidiano. Quando um leitor procura uma obra específica no balcão, o atendente não sabe de imediato se o título faz parte do acervo, em qual corredor ou estante o volume está guardado, nem se há exemplares disponíveis para empréstimo naquele momento ou se todas as cópias estão emprestadas. Doações recebidas pela comunidade frequentemente são catalogadas em duplicidade porque não há verificação automática de código **ISBN** (*International Standard Book Number*), enquanto erros de digitação inserem anos de publicação incoerentes, quantidades negativas ou registros incompletos sem editora ou autor.

Além da perda de tempo operacional, a ausência de controle de acesso e de persistência transacional expõe a planilha de inventário a exclusões acidentais — um único clique ou sobrescrita de arquivo apaga dezenas de obras sem confirmação nem rastreabilidade. Resolver esse problema exige uma aplicação web centralizada, protegida por autenticação real, com validação rigorosa tanto no navegador quanto no servidor e armazenamento relacional durável.

### 2.2 Público-Alvo

O sistema foi concebido para equipes enxutas que operam espaços de leitura presenciais e precisam de uma ferramenta direta, legível e em língua portuguesa. A tabela a seguir sintetiza os perfis de usuário atendidos, seu contexto de trabalho e o suporte oferecido pela aplicação.

| Perfil de Usuário | Contexto de Uso e Nível Técnico | Necessidade Principal | Como o Sistema Ajuda |
|---|---|---|---|
| **Bibliotecário voluntário / Atendente de balcão** | Utiliza computador ou notebook na recepção durante turnos rotativos; familiaridade básica com navegadores web. | Descobrir em segundos se um livro existe no acervo, quantas cópias estão livres e em qual estante buscá-lo. | Oferece busca reativa por título, autor ou ISBN em `/books`, indicador visual imediato de disponibilidade (`Disponível` / `Esgotado`) e localização física clara. |
| **Coordenador pedagógico / Gestor do acervo** | Responsável pela triagem de doações, inventário semestral e manutenção cadastral; nível técnico básico a intermediário. | Catalogar novos livros sem duplicar ISBNs, atualizar saldos de exemplares e dar baixa segura em volumes extraviados. | Valida todos os campos em português, bloqueia ISBNs repetidos com erro claro (`409 Conflict`) e exige confirmação modal explícita antes de qualquer exclusão. |

### 2.3 Funcionalidades Propostas e Escopo

As funcionalidades foram divididas entre aquelas integralmente entregues nesta versão (cobrindo todos os critérios de aceite acadêmicos e operacionais) e evoluções planejadas para ciclos futuros.

#### Funcionalidades Implementadas

| ID | Funcionalidade | Descrição Detalhada | Tela(s) Angular | Endpoint(s) da API |
|---|---|---|---|---|
| **F-01** | Autenticação de operador via JWT | Valida credenciais no banco com BCrypt, emite token JWT assinado com HS256 contendo expiração (`exp`) e perfil (`roles`) e inicia sessão autenticada no navegador. | `/login` | `POST /api/auth/login` |
| **F-02** | Listagem e busca textual do acervo | Lista todas as obras ordenadas alfabeticamente por título e permite filtrar em tempo real (com *debounce* de 300 ms) por título, autor ou ISBN, destacando obras esgotadas ou inativas. | `/books` | `GET /api/books` |
| **F-03** | Catalogação de novo livro | Permite cadastrar obra com validação de obrigatoriedade, limites de tamanho, formato de ISBN, intervalo histórico de publicação (1450–2026), data de aquisição não futura e consistência entre exemplares disponíveis e totais. | `/books/new` | `POST /api/books` |
| **F-04** | Consulta detalhada da obra | Exibe ficha catalográfica completa da obra selecionada, incluindo editora, gênero traduzido, localização na estante, data de aquisição formatada, sinopse e carimbos de criação/atualização. | `/books/:id` | `GET /api/books/{id}` |
| **F-05** | Edição cadastral e atualização de exemplares | Carrega os dados atuais da obra no formulário compartilhado e grava alterações mantendo a verificação de unicidade de ISBN contra os demais registros do banco. | `/books/:id/edit` | `PUT /api/books/{id}` |
| **F-06** | Exclusão protegida por confirmação | Solicita confirmação explícita em caixa de diálogo modal identificando título e ISBN do livro antes de disparar a remoção definitiva no banco relacional. | `/books`, `/books/:id` | `DELETE /api/books/{id}` |
| **F-07** | Gestão de sessão, *logout* e expiração | Disponibiliza botão "Sair" permanente na barra superior, protege rotas privadas com *guard* e intercepta respostas `401 Unauthorized` limpando a sessão e redirecionando ao login com aviso. | Layout principal e todas as rotas privadas | Cadeia de filtros JWT (`401`) |

#### Funcionalidades Propostas para Evolução (Fora do Escopo desta Versão)

Para manter foco na qualidade arquitetural, cobertura de testes e profundidade da entidade principal, os seguintes módulos foram deliberadamente deixados fora do escopo desta entrega:
- **Histórico nominal de empréstimos por leitor**: atualmente o balcão controla o saldo agregado (`copiesAvailable` de `copiesTotal`), sem vincular cada exemplar retirado ao CPF ou matrícula de um leitor específico.
- **Catálogo público aberto sem login**: todas as rotas de acervo exigem autenticação de operador; uma vitrine pública somente-leitura para consulta domiciliar por moradores do bairro constitui evolução futura.
- **Gestão administrativa de múltiplos operadores pela interface**: o sistema suporta múltiplos usuários e perfis (`ADMIN` e `USER`) no modelo relacional, porém o provisionamento inicial é feito via carga automática (*seed*) configurável por variáveis de ambiente, conforme diretriz do enunciado de que CRUD de usuários não substitui a entidade principal de domínio.
- **renovação silenciosa de sessão (*refresh token*) e recuperação de senha por e-mail**.

---

## 3. Requisitos e Rastreabilidade

### 3.1 Requisitos Funcionais e Não Funcionais do Domínio

No contexto da Biblioteca Comunitária, os requisitos do sistema organizam-se em dois eixos complementares:

- **Requisitos Funcionais (RF)**:
  1. Permitir que operadores autenticados cadastrem, listem, pesquisem por texto livre, visualizem detalhes, editem e excluam livros do acervo (`Book`).
  2. Garantir unicidade cadastral do código ISBN (desconsiderando diferenças entre letras maiúsculas e minúsculas no dígito verificador `X`), impedindo duplicatas tanto na inclusão quanto na edição.
  3. Impedir estados fisicamente impossíveis no inventário, assegurando que `copiesTotal >= 1`, `copiesAvailable >= 0` e `copiesAvailable <= copiesTotal`, além de ano de publicação entre `1450` e o ano corrente (`2026`) e data de aquisição não futura.
  4. Exigir confirmação explícita do operador antes de remover qualquer livro e apresentar *feedback* visual imediato (*snackbar* verde de sucesso ou vermelho de erro) após cada operação.

- **Requisitos Não Funcionais (RNF)**:
  1. **Segurança *stateless***: nenhuma sessão HTTP em memória é mantida no servidor; toda requisição a `/api/books/**` exige cabeçalho `Authorization: Bearer <token>` assinado com HMAC-SHA256 e dentro do prazo de validade.
  2. **Confidencialidade de credenciais**: senhas são armazenadas exclusivamente como *hashes* BCrypt na tabela `app_users` e jamais trafegam em respostas JSON ou logs.
  3. **Durabilidade relacional**: dados de usuários e livros persistem em banco relacional gerenciado por **ORM** (*Object-Relational Mapping* — mapeamento objeto-relacional via Hibernate/JPA) com `ddl-auto=update`, sobrevivendo ao encerramento e reinício do processo da aplicação.
  4. **Separação estrita de responsabilidades**: *controllers* lidam apenas com **DTOs** (*Data Transfer Objects* — objetos de transferência de dados) e códigos HTTP; *services* concentram transações e regras de negócio; *repositories* encapsulam consultas JPA; no Angular, componentes nunca invocam `HttpClient` diretamente.

### 3.2 Matriz de Rastreabilidade Completa

A tabela abaixo relaciona cada requisito normativo do trabalho (`R-GE-01` a `R-DO-05`) aos artefatos concretos que o implementam e às evidências objetivas obtidas na verificação.

| ID | Requisito | Onde Foi Implementado (Arquivo / Classe / Rota) | Como Foi Verificado (Teste / Comando / Roteiro) | Situação |
|---|---|---|---|---|
| **R-GE-01** | Tema representa uma necessidade concreta | Domínio Biblioteca Comunitária (`Book`), `docs/00-planejamento.md` e Seção 2.1 deste documento | Revisão documental e validação com `check_docs.py` | Atendido |
| **R-GE-02** | Descrição do problema, público-alvo e funcionalidades propostas | `docs/DOCUMENTACAO.md` (Seção 2) e `docs/00-planejamento.md` | Validador `check_docs.py` (seções Problema, Público-alvo e Funcionalidades aprovadas) | Atendido |
| **R-GE-03** | Frontend Angular integrado a API REST Spring Boot | `frontend/src/app/features/books/book.service.ts` ↔ `backend/.../book/BookController.kt` + `CorsConfig.kt` | Auditoria `verify_requirements.py` (`B01`, `B23`, `F05`), `ng build`, `./gradlew test` e roteiro E2E (22/22) | Atendido |
| **R-GE-04** | Dados exibidos no frontend vêm da API e do banco | Seed em `backend/.../config/DataInitializer.kt`; busca via `BookService.list()` em `book-list.component.ts` | Auditoria estática `F14` (`Sem lista de registros fixa no Angular`) e passo 06 do roteiro E2E (10 obras vindas do banco) | Atendido |
| **R-FE-01** | Login + pelo menos 4 páginas funcionais distintas com navegação | `frontend/src/app/app.routes.ts`: `/login`, `/books`, `/books/new`, `/books/:id`, `/books/:id/edit` | Auditoria estática `F01` (`6 rotas com componente`) e `F17` + compilação de *chunks* lazy no `ng build` | Atendido |
| **R-FE-02** | Login autentica de verdade no backend (sem simulação) | `frontend/src/app/core/auth/auth.service.ts` (`AuthService.login` faz `POST ${apiUrl}/auth/login`) | Auditoria `F07`, teste unitário `auth.service.spec.ts` e passo 01 do roteiro E2E | Atendido |
| **R-FE-03** | Usa Angular Router | `app.config.ts` (`provideRouter(routes)`), `routerLink`, `Router.navigate` e `Router.navigateByUrl` | Auditoria `F02` e testes unitários com `provideRouter` | Atendido |
| **R-FE-04** | Consome a API por serviços Angular | `AuthService` (`auth.service.ts`) e `BookService` (`book.service.ts`); URL centralizada em `environment.ts` | Auditoria `F05`, `F06` (`4 serviços; componentes não usam HttpClient`) e `F15` | Atendido |
| **R-FE-05** | Valida formulários com mensagens de erro compreensíveis | `book-form.component.ts`, `login.component.ts` e `shared/utils/error-utils.ts` (`controlErrorMessage`, `applyServerFieldErrors`) | Auditoria `F08`, `F16` e testes em `book-form.component.spec.ts` (2 testes aprovados) | Atendido |
| **R-FE-06** | Exibe mensagens de sucesso ou falha nas operações | `NotificationService` (`notification.service.ts` com `MatSnackBar`) chamado em criar, editar, excluir e falhas HTTP | Auditoria `F09` e inspeção das chamadas `notify.success` / `notify.error` nas telas | Atendido |
| **R-FE-07** | Pede confirmação antes de excluir | `ConfirmService` (`confirm.service.ts`) + `ConfirmDialogComponent` usado em `book-list` e `book-detail` | Auditoria `F10` e `F11` (`Componentes que excluem passam por confirmação`) | Atendido |
| **R-FE-08** | Protege rotas que exigem autenticação | `authGuard` (`core/auth/auth.guard.ts`) aplicado na rota-pai `path: ''` em `app.routes.ts`, validando presença e `exp` do JWT | Auditoria `F03`, `F18` e testes automatizados em `auth.guard.spec.ts` e `auth.service.spec.ts` | Atendido |
| **R-FE-09** | Opção de sair do sistema | Botão `Sair` em `layout/main-layout.component.ts` acionando `auth.logout()` | Auditoria `F12` e teste de limpeza de `localStorage` em `auth.service.spec.ts` | Atendido |
| **R-FE-10** | Envia `Authorization: Bearer <token>` nas requisições protegidas | `authInterceptor` (`core/auth/auth.interceptor.ts`) registrado via `withInterceptors([authInterceptor])` | Auditoria `F04` e testes em `auth.interceptor.spec.ts` (verifica inclusão em `/books` e omissão em `/auth/login`) | Atendido |
| **R-FE-11** | Trata token expirado/inválido e credenciais incorretas | `authInterceptor` trata `401` limpando sessão e exibindo aviso; `login.component.ts` exibe mensagem da API em `role="alert"` | Auditoria `F13`, teste de `401 TOKEN_EXPIRED` em `auth.interceptor.spec.ts` e passos 02a/02b/16 do E2E | Atendido |
| **R-BE-01** | CRUD completo da entidade principal (criar, listar, buscar por id, atualizar, excluir) | `BookController.kt` (`GET`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`) + `BookService.kt` | Auditoria `B08`, `B27`, `BookControllerTest` e passos 06, 07, 08a, 11a, 15a do E2E | Atendido |
| **R-BE-02** | CRUD de usuários isolado não conta como principal | Entidade principal é `Book` (`/api/books`); `AppUser` serve exclusivamente à autenticação | Inspeção de `Book.kt` e `AuthController.kt` (não há CRUD de usuários exposto) | Atendido |
| **R-BE-03** | Separação em controllers, services e repositories | Pacotes `auth/`, `book/` e `user/` com `Controller`, `Service` e `Repository` distintos | Auditoria `B06` (`2 repositories`) e `B07` (`3 controllers/advice, 3 services`) | Atendido |
| **R-BE-04** | DTOs em entradas e saídas | `LoginRequest`, `LoginResponse` (`AuthDtos.kt`), `BookRequest`, `BookResponse` (`BookDtos.kt`) + `BookMapper.kt` | Auditoria `B09` e `B10` (`Controllers não expõem entidades JPA`) | Atendido |
| **R-BE-05** | Validação dos dados recebidos | Anotações `@field:NotBlank`, `@field:NotNull`, `@field:Size`, `@field:Min`, `@field:Max`, `@field:Pattern`, `@field:PastOrPresent` + `@Valid` + regras em `BookService` | Auditoria `B11`, `B12`, `BookControllerTest` e passos 03, 10a, 10b do roteiro E2E | Atendido |
| **R-BE-06** | Códigos HTTP adequados | `201 Created` + `Location` no `POST`, `200 OK` em `GET`/`PUT`, `204 No Content` no `DELETE`, `400`, `401`, `403`, `404`, `409` | Auditoria `B14`, suíte MockMvc (14 testes) e roteiro E2E (22 cenários) | Atendido |
| **R-BE-07** | Trata dados inválidos e registros não encontrados | `GlobalExceptionHandler.kt` (`@RestControllerAdvice`) devolvendo `ApiError` padronizado | Auditoria `B13` e passos 10a, 10b, 10c, 11b, 12 e 15b do roteiro E2E | Atendido |
| **R-BE-08** | Banco relacional com Spring Data JPA | `AppUser.kt` e `Book.kt` (`@Entity`), `AppUserRepository` e `BookRepository` (`JpaRepository`), plugins `kotlin.jpa` e `kotlin.spring` | Auditoria `B02`, `B03`, `B04`, `B05`, `B06` e `./gradlew test` | Atendido |
| **R-BE-09** | Persiste usuários e registros da aplicação | Tabelas relacionais `app_users` e `books` populadas na inicialização (`DataInitializer.kt`) | Auditoria `B02` e verificação de login + listagem de 10 livros semeados no E2E | Atendido |
| **R-BE-10** | Dados sobrevivem a reinício do backend | `docker-compose.yml` (PostgreSQL 16 + volume `pgdata`), `application.yml` e `application-h2.yml` (`jdbc:h2:file:...`) com `ddl-auto: update` | Auditoria `B24`, `B28` e passo 14 do roteiro E2E (livro criado permaneceu gravado após encerrar e reiniciar o processo JVM) | Atendido |
| **R-BE-11** | Spring Security + JWT com expiração | `SecurityConfig.kt`, `JwtProperties.kt` e `AuthService.kt` emitindo claim `exp` (`expiration-seconds: 3600`) | Auditoria `B18`, `B25`, `B26`, `AuthControllerTest` e passos 01 e 16 do E2E | Atendido |
| **R-BE-12** | Backend valida o token antes de liberar recursos | `SecurityConfig.kt`: `SessionCreationPolicy.STATELESS`, `oauth2ResourceServer { jwt }` com `NimbusJwtDecoder` e `anyRequest().authenticated()` | Auditoria `B19`, `B20` e passos 04, 05 e 16 do roteiro E2E | Atendido |
| **R-BE-13** | Senhas com hash BCrypt | `BCryptPasswordEncoder` em `SecurityConfig.kt` aplicado em `DataInitializer.kt` na coluna `password_hash` | Auditoria `B15`, `B16` e asserção `passwordHash.startsWith("$2")` em `AuthControllerTest` | Atendido |
| **R-BE-14** | Senha nunca devolvida pela API | `LoginResponse` contém apenas metadados não sensíveis; nenhum endpoint expõe `AppUser` | Auditoria `B17`, asserção `assertFalse(body.contains("password"))` em `AuthControllerTest` e passo 01 do E2E | Atendido |
| **R-BE-15** | Trata credenciais incorretas e token inválido/expirado | `GlobalExceptionHandler` (`INVALID_CREDENTIALS`) e `RestAuthenticationEntryPoint` (`UNAUTHENTICATED`, `TOKEN_INVALID`, `TOKEN_EXPIRED`) | Auditoria `B21`, `B22`, `AuthControllerTest` e passos 02a, 02b, 04, 05 e 16 do E2E | Atendido |
| **R-BE-16** | CORS permitindo o frontend | `CorsConfig.kt` liberando `http://localhost:4200`, métodos CRUD + `OPTIONS`, cabeçalhos `Authorization`/`Content-Type` e expondo `Location` | Auditoria `B23`, teste de *preflight* em `AuthControllerTest` e passo 13 do E2E | Atendido |
| **R-DO-01** | Documento detalhado explicando tudo | `docs/DOCUMENTACAO.md` cobrindo todas as 13 seções obrigatórias e apêndices | Execução de `check_docs.py` sem `[ERRO]` e `verify_requirements.py` (`D01` OK) | Atendido |
| **R-DO-02** | Problema, público-alvo e funcionalidades | Seção 2 de `docs/DOCUMENTACAO.md` | Validação automática por `check_docs.py` | Atendido |
| **R-DO-03** | Arquitetura, modelo de dados, API, segurança, frontend | Seções 4, 5, 6, 7 e 8 de `docs/DOCUMENTACAO.md` com 6 diagramas Mermaid e trechos reais do código | Validação automática por `check_docs.py` (cruzamento de entidades, controllers e rotas) | Atendido |
| **R-DO-04** | Como executar e testar | Seções 9 e 10 de `docs/DOCUMENTACAO.md` + `README.md` na raiz | Validação automática por `check_docs.py` e `verify_requirements.py` (`D02` OK) | Atendido |
| **R-DO-05** | Rastreabilidade requisito → implementação | Matriz completa nesta Seção 3.2 cobrindo todos os 36 IDs (`R-GE-*`, `R-FE-*`, `R-BE-*`, `R-DO-*`) | Verificação automática de presença dos 36 IDs em `check_docs.py` | Atendido |

---

## 4. Arquitetura

### 4.1 Visão Geral em Três Camadas

A aplicação adota uma arquitetura cliente-servidor desacoplada em três camadas físicas e lógicas:

1. **Camada de Apresentação (*Single-Page Application* em Angular)**: executada no navegador do operador (`http://localhost:4200`), é responsável pela renderização das páginas, navegação local sem recarregamento completo de documento, validação imediata de formulários para boa experiência de uso, anexação transparente do cabeçalho `Authorization: Bearer <token>` e exibição de notificações visuais.
2. **Camada de Aplicação e Negócio (API REST em Spring Boot + Kotlin)**: executada na JVM (`http://localhost:8080`), atua como única autoridade de segurança e integridade das regras de negócio. Valida criptograficamente cada token JWT antes que a requisição alcance qualquer *controller*, aplica Bean Validation sobre os DTOs recebidos, coordena transações ACID nos *services* e traduz falhas em respostas JSON padronizadas (`ApiError`).
3. **Camada de Persistência Relacional (PostgreSQL / H2 em arquivo)**: armazena de maneira durável as tabelas `app_users` e `books`, impondo restrições estruturais de última linha (`NOT NULL`, tamanhos máximos de `VARCHAR` e chave única `uk_books_isbn`).

Essa separação foi escolhida porque isola responsabilidades com ciclos de evolução distintos: o *frontend* pode ser reconstruído ou substituído por um aplicativo móvel consumindo exatamente o mesmo contrato JSON, enquanto o *backend* permanece protegido mesmo que alguém ignore a interface gráfica e envie requisições maliciosas diretamente com `curl` ou Postman.

```mermaid
flowchart LR
    U["Operador da Biblioteca<br/>Navegador Web"] -->|HTTPS / HTTP| SPA["Frontend Angular 21 SPA<br/>localhost:4200"]
    subgraph Angular["Camada de Apresentação - Angular"]
        RT["Router + Guards<br/>authGuard / guestGuard"]
        PG["Páginas Standalone<br/>Reactive Forms + Signals"]
        SV["BookService / AuthService"]
        IC["authInterceptor<br/>Bearer JWT + Tratamento 401"]
        RT --> PG --> SV --> IC
    end
    SPA --- RT
    IC -->|"REST JSON + CORS<br/>Authorization: Bearer JWT"| SEC["Spring Security Filter Chain<br/>NimbusJwtDecoder HS256"]
    subgraph Spring["Camada de Aplicação - Spring Boot 3.5 + Kotlin"]
        SEC --> CTL["Controllers<br/>AuthController / BookController"]
        CTL --> BSV["Services Transacionais<br/>AuthService / BookService"]
        BSV --> REP["Repositories JPA<br/>AppUserRepository / BookRepository"]
        ADV["GlobalExceptionHandler<br/>ApiError JSON"]
        CTL -.->|"Exceções 400/404/409"| ADV
        BSV -.->|"Exceções de Domínio"| ADV
    end
    REP -->|"JDBC / Hibernate ORM"| DB[("PostgreSQL 16<br/>Volume pgdata<br/>ou H2 em Arquivo")]
```

### 4.2 Organização Estrutural do Repositório

O repositório segue estrutura *monorepo* simples com separação clara entre infraestrutura de raiz, `backend/`, `frontend/` e `docs/`:

```text
projeto-biblioteca/
├── README.md                  # Guia rápido de subida, credenciais e atalhos de teste
├── docker-compose.yml         # Serviço PostgreSQL 16-alpine com healthcheck e volume pgdata
├── .env.example               # Modelo documentado de variáveis de ambiente sem segredos reais
├── .gitignore                 # Exclusão de artefatos de compilação, node_modules, .env e dados locais
├── backend/                   # API REST Spring Boot 3.5.6 + Kotlin 2.1.21 (Gradle Wrapper 8.14.3)
│   ├── build.gradle.kts       # Plugins Kotlin/Spring/JPA, dependências e configuração JUnit 5
│   └── src/
│       ├── main/kotlin/com/biblioteca/
│       │   ├── config/        # JwtProperties, SecurityConfig, CorsConfig, DataInitializer
│       │   ├── security/      # RestAuthenticationEntryPoint (401), RestAccessDeniedHandler (403)
│       │   ├── auth/          # AuthController, AuthService e DTOs de login
│       │   ├── user/          # Entidade AppUser, Role, AppUserRepository, AppUserDetailsService
│       │   ├── book/          # Entidade Book, BookGenre, Repository, Service, Controller, Mapper, DTOs
│       │   └── common/        # ApiError, exceções de negócio e GlobalExceptionHandler
│       ├── main/resources/    # application.yml (PostgreSQL) e application-h2.yml (arquivo local)
│       └── test/              # AuthControllerTest, BookControllerTest e application-test.yml
├── frontend/                  # SPA Angular 21.2.25 + Angular Material 21.2.14 + Vitest
│   ├── angular.json           # Configuração de build, estilos Material e test runner unit-test
│   ├── package.json           # Dependências e scripts npm
│   └── src/
│       ├── environments/      # Centralização de apiUrl (http://localhost:8080/api)
│       └── app/
│           ├── core/          # auth (service, guard, interceptor), models e services (snackbar/dialog)
│           ├── shared/        # ConfirmDialogComponent e utilitários de erro/formulário
│           ├── layout/        # MainLayoutComponent (barra superior + usuário logado + botão Sair)
│           └── features/      # login/ e books/ (list, create, edit, detail, form, service, model)
└── docs/
    ├── 00-planejamento.md     # Planejamento inicial, contrato REST e diário de decisões
    └── DOCUMENTACAO.md        # Este documento técnico completo
```

### 4.3 Tecnologias e Versões Utilizadas

Todas as versões abaixo foram extraídas diretamente dos arquivos de manifesto (`backend/build.gradle.kts`, `backend/gradle/wrapper/gradle-wrapper.properties`, `frontend/package.json`), dos pacotes efetivamente instalados em `frontend/node_modules` e dos logs reais de inicialização da JVM.

| Camada / Escopo | Tecnologia / Biblioteca | Versão Exata | Papel no Projeto |
|---|---|---|---|
| **Ambiente Base** | OpenJDK (Java Runtime / Compiler) | `21.0.12.1` | Plataforma de execução LTS do *backend* configurada via Gradle Java Toolchain |
| **Build Backend** | Gradle Wrapper (Kotlin DSL) | `8.14.3` | Automação de compilação, gestão de dependências Maven Central e execução de testes |
| **Linguagem Backend** | Kotlin (`jvm`, `plugin.spring`, `plugin.jpa`) | `2.1.21` | Linguagem principal da API com nulabilidade explícita no sistema de tipos |
| **Framework Backend** | Spring Boot | `3.5.6` | Autoconfiguração web (Apache Tomcat `10.1.46`), injeção de dependências e ciclo de vida |
| **Segurança e JWT** | Spring Security + OAuth2 Resource Server (Nimbus JOSE+JWT) | `6.5.x` (BOM Boot `3.5.6`) | Autenticação *stateless*, *hashing* BCrypt, emissão (`NimbusJwtEncoder`) e validação (`NimbusJwtDecoder`) HS256 |
| **Persistência ORM** | Spring Data JPA / Hibernate ORM | `6.6.29.Final` | Mapeamento objeto-relacional, transações declarativas e geração incremental de *schema* |
| **Banco Principal** | PostgreSQL (`docker-compose.yml`) | `16-alpine` | Banco relacional de produção/desenvolvimento com volume persistente `pgdata` |
| **Banco Local / Testes** | H2 Database Engine | `2.3.232` | Persistência local em arquivo (`application-h2.yml`) quando sem Docker e banco isolado nos testes (`test`) |
| **Ambiente Frontend** | Node.js / npm | `v22.23.2` / `10.9.8` | Ambiente de compilação TypeScript, empacotamento esbuild e execução do Vitest |
| **Framework Frontend** | Angular (`@angular/core`, `router`, `forms`) | `21.2.25` | SPA com componentes *standalone*, carregamento preguiçoso (*lazy loading*), *Signals* e *Reactive Forms* |
| **CLI e Build Web** | Angular CLI / `@angular/build` | `21.2.29` | Compilação otimizada em *chunks* e *runner* nativo de testes unitários |
| **Componentes de UI** | Angular Material / CDK | `21.2.14` | Tabela, cartões, campos delineados, seletor, diálogos modais e *snackbars* acessíveis |
| **Linguagem / Reatividade** | TypeScript / RxJS | `5.9.3` / `7.8.2` | Tipagem estática estrita e composição de fluxos assíncronos HTTP e busca com *debounce* |
| **Testes Frontend** | Vitest + `jsdom` | `4.1.12` / `28.1.0` | Execução rápida de testes unitários em Node.js sem dependência de navegador gráfico |

### 4.4 Fluxo Completo de uma Requisição Típica

Para ilustrar como as três camadas cooperam em tempo de execução, acompanhe o caminho percorrido quando o operador preenche os dados de um livro na tela `/books/new` e clica em **"Salvar livro"**:

1. **Validação no cliente (`BookFormComponent.submit`)**: o formulário reativo verifica regras síncronas (`required`, `minLength`, `maxLength`, expressão regular de ISBN, limites numéricos, data não futura e `copiesAvailable <= copiesTotal`). Se tudo estiver válido, apara espaços extras (`trim()`), converte campos opcionais vazios em `null` e emite o evento `(save)` com um `BookPayload`.
2. **Coordenação de estado visual (`BookCreateComponent.create`)**: o componente pai ativa o sinal `saving.set(true)` (desabilitando o botão para impedir cliques duplos) e invoca `BookService.create(payload)`.
3. **Interceptação HTTP (`authInterceptor`)**: antes de sair do navegador, o interceptor funcional verifica que a URL começa com `http://localhost:8080/api` e não é a rota de login, lê `auth.token()` e clona a requisição anexando o cabeçalho `Authorization: Bearer <token>`.
4. **Filtro de Segurança (`SecurityFilterChain` + `NimbusJwtDecoder`)**: o backend recebe o `POST /api/books`, valida a política de **CORS** (*Cross-Origin Resource Sharing*) e verifica assinatura HMAC-SHA256, emissor (`iss = biblioteca-api`) e validade temporal (`exp`) do JWT. Se o token for inválido ou expirado, `RestAuthenticationEntryPoint` interrompe o fluxo imediatamente com `401` em JSON.
5. **Desserialização e Bean Validation (`BookController.create`)**: o Jackson converte o JSON em `BookRequest` e o marcador `@Valid` aciona o Jakarta Validation sobre cada propriedade anotada com `@field:...`. Qualquer violação lança `MethodArgumentNotValidException`, convertida pelo `GlobalExceptionHandler` em `400 Bad Request` com lista `fieldErrors`.
6. **Regras de negócio e transação (`BookService.create`)**: dentro de uma transação `@Transactional`, o serviço valida `copiesAvailable <= copiesTotal` e `publicationYear <= Year.now().value`, normaliza o ISBN em maiúsculas e consulta `repository.existsByIsbnIgnoreCase(...)`. Caso já exista, lança `ConflictException` (`409 Conflict`).
7. **Gravação SQL e Resposta (`BookRepository.save`)**: a função de extensão `toEntity()` instancia `Book`, o Hibernate executa `INSERT INTO books ...`, preenche o `id` gerado pelo banco e `toResponse()` produz o `BookResponse` (calculando `available = active && copiesAvailable > 0`). O *controller* devolve `201 Created` com o cabeçalho `Location: http://localhost:8080/api/books/{id}` e o JSON criado.
8. **Atualização da interface**: o `BookCreateComponent` desliga `saving` via operador `finalize`, dispara `notify.success('Livro "..." catalogado com sucesso.')` e navega automaticamente para `/books/{id}` para exibir a ficha recém-cadastrada.

---

## 5. Modelo de Dados

### 5.1 Diagrama Entidade-Relacionamento

O banco de dados possui duas tabelas independentes: `app_users` (credenciais e papéis dos operadores do sistema) e `books` (catálogo de obras da biblioteca). Nesta versão não há chave estrangeira entre `APP_USERS` e `BOOKS` porque o requisito do trabalho não exige auditoria por autor de cadastro e qualquer operador autenticado gerencia o acervo coletivo da biblioteca comunitária; a inclusão de `created_by` / `updated_by` está mapeada como evolução futura na Seção 12.

```mermaid
erDiagram
    APP_USERS {
        bigint id PK
        varchar_60 username UK
        varchar_100 password_hash
        varchar_20 role
        boolean enabled
    }
    BOOKS {
        bigint id PK
        varchar_150 title
        varchar_120 author
        varchar_20 isbn UK
        varchar_100 publisher
        integer publication_year
        varchar_30 genre
        integer copies_total
        integer copies_available
        varchar_60 location
        date acquisition_date
        varchar_1000 synopsis
        boolean active
        timestamp created_at
        timestamp updated_at
    }
```

### 5.2 Dicionário de Dados por Entidade

#### Tabela `app_users` — Entidade `AppUser` (`backend/src/main/kotlin/com/biblioteca/user/AppUser.kt`)

| Propriedade Kotlin | Tipo Kotlin | Coluna e Tipo SQL | Restrições no Banco | Regra de Domínio / Segurança Associada |
|---|---|---|---|---|
| `id` | `Long? = null` | `id BIGSERIAL` | `PRIMARY KEY` | Gerado pelo banco (`GenerationType.IDENTITY`); nunca definido pelo cliente. |
| `username` | `String` | `username VARCHAR(60)` | `NOT NULL`, `UNIQUE` | Identificador único de login; no DTO `LoginRequest` exige `@field:NotBlank`. |
| `passwordHash` | `String` | `password_hash VARCHAR(100)` | `NOT NULL` | Armazena exclusivamente o *hash* BCrypt de 60 caracteres (`$2a$10$...`), jamais a senha em texto puro. |
| `role` | `Role` | `role VARCHAR(20)` | `NOT NULL` | Enum persistido como texto (`ADMIN` ou `USER`), convertido em autoridade `ROLE_ADMIN`/`ROLE_USER`. |
| `enabled` | `Boolean` | `enabled BOOLEAN` | `NOT NULL` | Indica conta ativa (`true` por padrão); contas desabilitadas são recusadas no `AuthenticationManager`. |

#### Tabela `books` — Entidade `Book` (`backend/src/main/kotlin/com/biblioteca/book/Book.kt`)

| Propriedade Kotlin | Tipo Kotlin | Coluna e Tipo SQL | Restrições no Banco | Regra de Validação (`BookRequest` / `BookService`) |
|---|---|---|---|---|
| `id` | `Long? = null` | `id BIGSERIAL` | `PRIMARY KEY` | Identificador sequencial auto-incrementado no banco. |
| `title` | `String` | `title VARCHAR(150)` | `NOT NULL` | Obrigatório (`@NotBlank`), tamanho entre 2 e 150 caracteres. |
| `author` | `String` | `author VARCHAR(120)` | `NOT NULL` | Obrigatório (`@NotBlank`), tamanho entre 3 e 120 caracteres. |
| `isbn` | `String` | `isbn VARCHAR(20)` | `NOT NULL`, `UNIQUE` (`uk_books_isbn`) | Obrigatório, 10 a 20 caracteres, formato `^[0-9\-]{9,19}[0-9Xx]$`, normalizado em maiúsculas e único no serviço (`409`). |
| `publisher` | `String` | `publisher VARCHAR(100)` | `NOT NULL` | Obrigatória (`@NotBlank`), tamanho entre 2 e 100 caracteres. |
| `publicationYear` | `Int` | `publication_year INTEGER` | `NOT NULL` | Obrigatório (`@NotNull`), mínimo `1450` (invenção da prensa móvel) e máximo igual ao ano atual (`2026`). |
| `genre` | `BookGenre` | `genre VARCHAR(30)` | `NOT NULL` | Obrigatório (`@NotNull`); enum com 10 categorias literárias gravado via `EnumType.STRING`. |
| `copiesTotal` | `Int` | `copies_total INTEGER` | `NOT NULL` | Obrigatório (`@NotNull`), valor mínimo `1` exemplar catalogado. |
| `copiesAvailable` | `Int` | `copies_available INTEGER` | `NOT NULL` | Obrigatório (`@NotNull`), mínimo `0` e menor ou igual a `copiesTotal` (validado no formulário e no `BookService`). |
| `location` | `String` | `location VARCHAR(60)` | `NOT NULL` | Obrigatória (`@NotBlank`), 2 a 60 caracteres indicando corredor e estante física. |
| `acquisitionDate` | `LocalDate?` | `acquisition_date DATE` | `NULL` permitido | Opcional; quando preenchida, não pode ser posterior à data atual (`@PastOrPresent`). |
| `synopsis` | `String?` | `synopsis VARCHAR(1000)` | `NULL` permitido | Opcional; até 1.000 caracteres; *strings* em branco são convertidas para `null` no *mapper*. |
| `active` | `Boolean` | `active BOOLEAN` | `NOT NULL` | Padrão `true`; obras inativas permanecem inventariadas, mas aparecem indisponíveis para circulação (`available = false`). |
| `createdAt` | `Instant` | `created_at TIMESTAMP` | `NOT NULL`, `updatable = false` | Preenchido na criação em UTC (`Instant.now()`) e protegido contra alteração em updates. |
| `updatedAt` | `Instant` | `updated_at TIMESTAMP` | `NOT NULL` | Inicializado na criação e atualizado automaticamente pelo gatilho JPA `@PreUpdate`. |

### 5.3 Justificativa das Escolhas de Modelagem e Persistência

Cinco decisões estruturais merecem destaque técnico no modelo relacional:

1. **Classes regulares (`class`) em vez de `data class` nas entidades JPA**: em Kotlin, `data class` gera métodos `equals`, `hashCode` e `toString` baseados em todas as propriedades do construtor primário, o que viola o contrato de identidade mutável de entidades gerenciadas pelo Hibernate e pode quebrar *proxies* gerados em tempo de execução. Por isso `AppUser` e `Book` são classes regulares combinadas com os plugins `kotlin("plugin.jpa")` (construtor sem argumentos sintético) e `allOpen` (abertura das classes para criação de *proxies*).
2. **Tabela nomeada `app_users` em vez de `user`**: `USER` é palavra reservada no padrão SQL e no PostgreSQL. Nomear explicitamente `@Table(name = "app_users")` elimina erros de sintaxe DDL e necessidade de aspas escapadas em consultas nativas.
3. **Enums persistidos como `EnumType.STRING`**: o padrão do JPA (`ORDINAL`, inteiros `0, 1, 2...`) corrompe silenciosamente os dados históricos caso alguém reordene ou insira um novo valor no meio de `BookGenre` ou `Role`. Persistir o nome textual (`ROMANCE`, `HISTORIA`, `ADMIN`) torna o banco autoexplicativo e resiliente a novas categorias.
4. **Senha representada exclusivamente por `passwordHash`**: a classe `AppUser` sequer possui propriedade chamada `password`, tornando estruturalmente impossível persistir texto puro por engano sem passar pelo `PasswordEncoder`.
5. **Criação incremental de *schema* (`ddl-auto: update`) e persistência em volume**: configurar `spring.jpa.hibernate.ddl-auto: update` instrui o Hibernate a criar as tabelas na primeira execução e preservá-las em todas as inicializações seguintes. Com PostgreSQL em `docker-compose.yml`, o volume nomeado `pgdata` mapeado em `/var/lib/postgresql/data` garante que mesmo recriando o contêiner (`docker compose down` seguido de `docker compose up -d`) todos os registros permanecem intactos. No perfil local sem Docker (`application-h2.yml`), o arquivo `./data/bibliotecadb.mv.db` cumpre exatamente o mesmo papel em disco. Em sistemas corporativos de produção, o uso de `ddl-auto: update` deve dar lugar a ferramentas de migração versionada como Flyway ou Liquibase (registrado na Seção 12).

---

## 6. Backend e API REST

### 6.1 Arquitetura em Camadas e Fluxo Interno

O *backend* segue divisão estrita em camadas dentro de `com.biblioteca`, evitando acoplamento entre protocolo HTTP, regras de domínio e persistência SQL:

- **Controller (`AuthController`, `BookController`)**: camada fina de entrada e saída HTTP. Recebe DTOs validados com `@Valid`, delega ao *service* correspondente e formata o status/cabeçalhos HTTP (`201 Created` + `Location`, `200 OK`, `204 No Content`). Não contém `if` de regra de negócio nem manipula entidades JPA.
- **DTOs e Mapper (`AuthDtos.kt`, `BookDtos.kt`, `BookMapper.kt`)**: definem explicitamente o contrato JSON público. `BookMapper.kt` usa funções de extensão idiomáticas de Kotlin (`BookRequest.toEntity()`, `Book.applyChanges()`, `Book.toResponse()`) para higienizar entradas (`trim()`, `uppercase()` no ISBN, conversão de sinopse em branco para `null`) e derivar campos calculados (`available`).
- **Service (`AuthService`, `BookService`, `AppUserDetailsService`)**: concentra regras de negócio e demarcadores transacionais. `BookService` é anotado na classe com `@Transactional(readOnly = true)` — otimizando leituras ao dispensar *dirty checking* do Hibernate — e sobrescreve com `@Transactional` apenas nos métodos mutadores (`create`, `update`, `delete`).
- **Repository (`AppUserRepository`, `BookRepository`)**: interfaces que estendem `JpaRepository`, combinando métodos derivados por convenção (`existsByIsbnIgnoreCase`, `existsByIsbnIgnoreCaseAndIdNot`) e consulta JPQL customizada (`search`) insensível a maiúsculas/minúsculas.

```mermaid
flowchart LR
    REQ["JSON HTTP Request"] --> CTL["BookController<br/>@Valid BookRequest"]
    CTL --> SVC["BookService<br/>@Transactional + Regras"]
    SVC --> MAP["BookMapper<br/>toEntity / applyChanges / toResponse"]
    SVC --> REP["BookRepository<br/>JpaRepository + JPQL search"]
    REP --> DB[(" Tabelas app_users e books ")]
    CTL -.->|"MethodArgumentNotValidException"| GEH["GlobalExceptionHandler<br/>@RestControllerAdvice -> ApiError"]
    SVC -.->|"BusinessValidation / Conflict / NotFound"| GEH
```

Os trechos reais abaixo mostram como uma operação `POST /api/books` atravessa `BookController.kt` e `BookService.kt`:

```kotlin
// Caminho: backend/src/main/kotlin/com/biblioteca/book/BookController.kt
@PostMapping
fun create(@Valid @RequestBody request: BookRequest): ResponseEntity<BookResponse> {
    val created = service.create(request)
    val location = ServletUriComponentsBuilder.fromCurrentRequest()
        .path("/{id}")
        .buildAndExpand(created.id)
        .toUri()
    return ResponseEntity.created(location).body(created)
}
```

```kotlin
// Caminho: backend/src/main/kotlin/com/biblioteca/book/BookService.kt
@Transactional
fun create(request: BookRequest): BookResponse {
    validateBusinessRules(request)
    val normalizedIsbn = request.isbn.trim().uppercase()
    if (repository.existsByIsbnIgnoreCase(normalizedIsbn)) {
        throw ConflictException("Já existe um livro cadastrado com o ISBN '$normalizedIsbn'.")
    }
    return repository.save(request.toEntity()).toResponse()
}
```

### 6.2 Catálogo Completo de Endpoints

Todos os endpoints implementados no código estão listados na tabela abaixo. Não há rotas ocultas nem endpoints não documentados.

| Endpoint | Autenticação | Descrição | Corpo de Entrada (Request) | Corpo de Saída (Response) | Status HTTP Possíveis |
|---|---|---|---|---|---|
| `POST /api/auth/login` | Pública (`permitAll`) | Autentica operador e emite token JWT assinado | `LoginRequest` (`username`, `password`) | `LoginResponse` (`token`, `tokenType`, `expiresIn`, `expiresAt`, `username`, `role`) | `200`, `400`, `401` |
| `GET /api/books` | `Bearer JWT` | Lista livros ordenados por título ou filtrados por `?q=` (título, autor ou ISBN) | Query opcional `q: String?` | `List<BookResponse>` | `200`, `401` |
| `GET /api/books/{id}` | `Bearer JWT` | Retorna os detalhes completos de um livro pelo identificador numérico | Parâmetro de rota `id: Long` | `BookResponse` | `200`, `400`, `401`, `404` |
| `POST /api/books` | `Bearer JWT` | Cataloga novo livro validando campos, exemplares e unicidade de ISBN | `BookRequest` | `BookResponse` + cabeçalho `Location` | `201`, `400`, `401`, `409` |
| `PUT /api/books/{id}` | `Bearer JWT` | Atualiza integralmente um livro existente preservando unicidade de ISBN | Parâmetro `id: Long` + `BookRequest` | `BookResponse` | `200`, `400`, `401`, `404`, `409` |
| `DELETE /api/books/{id}` | `Bearer JWT` | Remove definitivamente um livro existente do acervo | Parâmetro de rota `id: Long` | Sem corpo | `204`, `400`, `401`, `404` |

### 6.3 Exemplos Reais Capturados em Execução

As requisições e respostas abaixo foram capturadas diretamente da execução real do servidor Spring Boot durante a suíte ponta a ponta (os tokens JWT foram truncados por segurança).

#### 1. Autenticação bem-sucedida (`POST /api/auth/login` → `200 OK`)

```bash
curl -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...<truncado>",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "expiresAt": "2026-11-01T00:50:55.926714505Z",
  "username": "admin",
  "role": "ADMIN"
}
```

#### 2. Catalogação de novo livro (`POST /api/books` → `201 Created` + `Location`)

```bash
curl -i -X POST http://localhost:8080/api/books \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...<truncado>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Grande Sertão: Veredas",
    "author": "João Guimarães Rosa",
    "isbn": "978-85-359-3198-3",
    "publisher": "Companhia das Letras",
    "publicationYear": 1956,
    "genre": "ROMANCE",
    "copiesTotal": 3,
    "copiesAvailable": 2,
    "location": "Corredor A - Estante 4",
    "acquisitionDate": "2025-04-10",
    "synopsis": "Travessia épica pelo sertão narrada por Riobaldo.",
    "active": true
  }'
```

Cabeçalho retornado: `Location: http://localhost:8080/api/books/11` e status `201 Created`:

```json
{
  "id": 11,
  "title": "Grande Sertão: Veredas",
  "author": "João Guimarães Rosa",
  "isbn": "978-85-359-3198-3",
  "publisher": "Companhia das Letras",
  "publicationYear": 1956,
  "genre": "ROMANCE",
  "copiesTotal": 3,
  "copiesAvailable": 2,
  "location": "Corredor A - Estante 4",
  "acquisitionDate": "2025-04-10",
  "synopsis": "Travessia épica pelo sertão narrada por Riobaldo.",
  "active": true,
  "available": true,
  "createdAt": "2026-10-31T23:50:56.344175296Z",
  "updatedAt": "2026-10-31T23:50:56.344175626Z"
}
```

#### 3. Erro de validação por campo e regra de negócio (`400 Bad Request`)

Quando `copiesAvailable` supera `copiesTotal` (por exemplo, 5 disponíveis num total de 2 exemplares):

```json
{
  "timestamp": "2026-10-31T23:50:56.430991791Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "A quantidade disponível (5) não pode ser maior que o total de exemplares (2).",
  "path": "/api/books",
  "fieldErrors": [
    {
      "field": "copiesAvailable",
      "message": "A quantidade disponível (5) não pode ser maior que o total de exemplares (2)."
    }
  ]
}
```

#### 4. Conflito de ISBN duplicado (`409 Conflict`) e Registro Inexistente (`404 Not Found`)

```json
{
  "timestamp": "2026-10-31T23:50:56.408390776Z",
  "status": 409,
  "code": "CONFLICT",
  "message": "Já existe um livro cadastrado com o ISBN '978-85-359-3198-3'.",
  "path": "/api/books",
  "fieldErrors": []
}
```

```json
{
  "timestamp": "2026-10-31T23:50:56.462421075Z",
  "status": 404,
  "code": "NOT_FOUND",
  "message": "Livro com id 999999 não encontrado.",
  "path": "/api/books/999999",
  "fieldErrors": []
}
```

### 6.4 Regras de Validação e Particularidades do Kotlin

Em Kotlin, propriedades declaradas no construtor primário possuem três alvos possíveis de compilação bytecode: o parâmetro do construtor, o campo privado (`field`) e o método *getter*. Se uma anotação do Jakarta Validation fosse escrita apenas como `@NotBlank val title: String` sem alvo explícito, ela ficaria presa ao parâmetro do construtor e o validador padrão do Hibernate Validator ignoraria a regra silenciosamente. Por isso, **todas** as anotações em `AuthDtos.kt` e `BookDtos.kt` utilizam o *use-site target* explícito `@field:`.

Além disso, campos obrigatórios que não são `String` (`publicationYear: Int?`, `genre: BookGenre?`, `copiesTotal: Int?`, `copiesAvailable: Int?`) foram deliberadamente declarados anuláveis no DTO e combinados com `@field:NotNull`. Essa técnica evita que um JSON sem o campo `genre` falhe precocemente na desserialização do Jackson com erro genérico de tipo não-nulo, permitindo que o Bean Validation colete todos os campos faltantes de uma só vez e devolva mensagens específicas em `fieldErrors` (como `"O gênero literário é obrigatório"`), convertidas depois com segurança para tipos não-nulos no `BookMapper.kt`.

| Campo (`BookRequest`) | Anotações / Regras | Mensagem Retornada em Português |
|---|---|---|
| `title` | `@field:NotBlank`, `@field:Size(min = 2, max = 150)` | `"O título é obrigatório"` / `"O título deve ter entre 2 e 150 caracteres"` |
| `author` | `@field:NotBlank`, `@field:Size(min = 3, max = 120)` | `"O autor é obrigatório"` / `"O autor deve ter entre 3 e 120 caracteres"` |
| `isbn` | `@field:NotBlank`, `@field:Size(10..20)`, `@field:Pattern`, unicidade no `BookService` | `"O ISBN é obrigatório"` / `"Informe um ISBN válido..."` / `"Já existe um livro cadastrado com o ISBN..."` |
| `publisher` | `@field:NotBlank`, `@field:Size(min = 2, max = 100)` | `"A editora é obrigatória"` / `"A editora deve ter entre 2 e 100 caracteres"` |
| `publicationYear` | `@field:NotNull`, `@field:Min(1450)`, `@field:Max(2026)` + checagem `Year.now()` | `"O ano de publicação é obrigatório"` / `"O ano de publicação deve ser a partir de 1450"` |
| `genre` | `@field:NotNull` (`BookGenre`) | `"O gênero literário é obrigatório"` |
| `copiesTotal` | `@field:NotNull`, `@field:Min(1)` | `"O total de exemplares é obrigatório"` / `"O total de exemplares deve ser pelo menos 1"` |
| `copiesAvailable` | `@field:NotNull`, `@field:Min(0)` + regra `<= copiesTotal` | `"A quantidade disponível não pode ser negativa"` / `"A quantidade disponível (X) não pode ser maior que o total..."` |
| `location` | `@field:NotBlank`, `@field:Size(min = 2, max = 60)` | `"A localização na estante é obrigatória"` / `"A localização deve ter entre 2 e 60 caracteres"` |
| `acquisitionDate` | Opcional, `@field:PastOrPresent` | `"A data de aquisição não pode ser futura"` |
| `synopsis` | Opcional, `@field:Size(max = 1000)` | `"A sinopse deve ter no máximo 1000 caracteres"` |

### 6.5 Tratamento Global de Erros (`ApiError`)

Toda falha HTTP da API obedece exatamente ao mesmo envelope JSON definido em `backend/src/main/kotlin/com/biblioteca/common/ApiError.kt` (`timestamp`, `status`, `code`, `message`, `path`, `fieldErrors`). Há dois pontos complementares que produzem esse formato:

1. **`GlobalExceptionHandler` (`@RestControllerAdvice`)**: captura todas as exceções lançadas a partir do `DispatcherServlet` (validação de argumentos, JSON ilegível, parâmetro de rota inválido, `ResourceNotFoundException`, `ConflictException`, violação de integridade no banco, `AuthenticationException` disparada no login e erros internos inesperados).
2. **`RestAuthenticationEntryPoint` e `RestAccessDeniedHandler`**: falhas de autenticação/autorização em rotas protegidas ocorrem **antes** do `DispatcherServlet`, dentro da cadeia de filtros do Spring Security (`BearerTokenAuthenticationFilter`). Exceções lançadas ali jamais alcançam um `@RestControllerAdvice`; sem handlers dedicados escrevendo o `ApiError` diretamente no `HttpServletResponse`, o Spring devolveria corpo vazio ou página de erro padrão, quebrando o contrato JSON esperado pelo Angular.

| Código (`code`) | Status HTTP | Quando Ocorre | Reação do Frontend Angular |
|---|---|---|---|
| `VALIDATION_ERROR` | `400` | Falha em `@Valid`, regra `BusinessValidationException` ou parâmetro de URL não numérico (`/api/books/abc`) | Associa cada item de `fieldErrors` ao respectivo campo do formulário (`applyServerFieldErrors`) e exibe aviso. |
| `MALFORMED_REQUEST` | `400` | JSON truncado, sintaxe inválida ou tipo incompatível na desserialização Jackson | Exibe `message` em *snackbar* de erro sem perder o estado da tela. |
| `INVALID_CREDENTIALS` | `401` | Usuário inexistente ou senha incorreta em `POST /api/auth/login` | Exibe `"Usuário ou senha inválidos."` em caixa `role="alert"` no formulário de login. |
| `UNAUTHENTICATED` | `401` | Requisição a rota protegida sem cabeçalho `Authorization: Bearer ...` | `authGuard` / `authInterceptor` redireciona para `/login?returnUrl=...`. |
| `TOKEN_EXPIRED` | `401` | Token JWT com claim `exp` vencido rejeitado pelo `NimbusJwtDecoder` | `authInterceptor` limpa `localStorage`, exibe `"Sua sessão expirou. Faça login novamente."` e redireciona ao login. |
| `TOKEN_INVALID` | `401` | Assinatura HS256 adulterada, emissor divergente ou token malformado | `authInterceptor` limpa sessão, exibe `"Sessão inválida. Faça login novamente."` e redireciona ao login. |
| `FORBIDDEN` | `403` | Usuário autenticado sem permissão suficiente (`AccessDeniedException`) | Exibe mensagem `"Você não tem permissão para esta operação."` em *snackbar*. |
| `NOT_FOUND` | `404` | Livro com `id` inexistente em `GET`, `PUT` ou `DELETE` | Nas telas de detalhes/edição, mostra aviso de livro não encontrado e retorna automaticamente a `/books`. |
| `METHOD_NOT_ALLOWED` | `405` | Verbo HTTP não suportado na rota chamada | Exibe mensagem amigável via `extractErrorMessage`. |
| `CONFLICT` | `409` | Tentativa de criar ou editar livro com ISBN já pertencente a outro registro | Exibe a mensagem específica do conflito em *snackbar* preservando todos os dados digitados no formulário. |
| `INTERNAL_ERROR` | `500` | Falha inesperada não prevista (registrada em log de erro no servidor) | Exibe mensagem genérica segura sem vazar *stack trace* interno ao navegador. |

### 6.6 Persistência, Consultas e Carga Inicial (*Seed*)

Em `BookRepository.kt`, além dos métodos herdados de `JpaRepository<Book, Long>`, foram declarados `existsByIsbnIgnoreCase(isbn)` (usado na criação), `existsByIsbnIgnoreCaseAndIdNot(isbn, id)` (usado na edição para permitir salvar um livro mantendo seu próprio ISBN enquanto bloqueia colisão com qualquer outro `id`) e a consulta JPQL `search(q)` que aplica `lower(...) like lower(concat('%', :q, '%'))` simultaneamente sobre `title`, `author` e `isbn`, ordenando o resultado por título. Em `application.yml`, a propriedade `spring.jpa.open-in-view: false` desativa o antipadrão *Open Session in View*, garantindo que toda leitura de banco aconteça dentro da fronteira explícita do `BookService`.

Na subida da aplicação, `DataInitializer.kt` (`ApplicationRunner`) executa uma rotina idempotente dentro de `@Transactional`:
1. Verifica `users.existsByUsername(adminUsername)` e, caso não exista, cria o operador `admin` com `Role.ADMIN` e senha codificada via `BCryptPasswordEncoder`.
2. Se `app.seed.sample-data` for `true` e `books.count() == 0L`, popula o acervo com **10 obras clássicas e técnicas em língua portuguesa** (*Dom Casmurro*, *Quarto de Despejo*, *Vidas Secas*, *A Hora da Estrela*, *Capitães da Areia*, *Meu Pé de Laranja Lima*, *Torto Arado*, *Alguma Poesia*, *Raízes do Brasil* e *Entendendo Algoritmos*), incluindo intencionalmente obras esgotadas (`copiesAvailable = 0`, como *Torto Arado* e *Quarto de Despejo*) para demonstrar na interface o alerta visual de indisponibilidade. Para desativar a carga de livros (como feito em `application-test.yml`), basta definir `SEED_SAMPLE_DATA=false`.

---

## 7. Segurança e Autenticação JWT

### 7.1 Fluxo Completo de Autenticação e Autorização

O diagrama de sequência abaixo detalha o ciclo completo de login, emissão do token, acesso às rotas protegidas e os três ramos de rejeição (`INVALID_CREDENTIALS`, `TOKEN_EXPIRED` e `TOKEN_INVALID`):

```mermaid
sequenceDiagram
    autonumber
    actor U as Operador
    participant SPA as Angular SPA
    participant SEC as Spring Security + NimbusJwtDecoder
    participant AUTH as AuthController / AuthService
    participant BOOK as BookController / BookService
    participant DB as Banco Relacional

    U->>SPA: Preenche usuário e senha em /login
    SPA->>AUTH: POST /api/auth/login (LoginRequest JSON)
    AUTH->>DB: SELECT em app_users por username
    DB-->>AUTH: AppUser (username + password_hash BCrypt)
    alt Credenciais válidas (BCrypt confere)
        AUTH->>AUTH: Gera claims (iss, sub, iat, exp, roles) e assina HS256
        AUTH-->>SPA: 200 OK (LoginResponse sem senha)
        SPA->>SPA: Salva token em localStorage + signal e navega para /books
    else Usuário inexistente ou senha errada
        AUTH-->>SPA: 401 INVALID_CREDENTIALS ("Usuário ou senha inválidos.")
        SPA-->>U: Exibe alerta de erro mantendo na tela de login
    end

    U->>SPA: Consulta ou altera acervo em /books
    SPA->>SEC: GET /api/books com Header Authorization: Bearer <JWT>
    SEC->>SEC: Valida assinatura HMAC-SHA256, iss e claim exp
    alt Token íntegro e dentro da validade
        SEC->>BOOK: Encaminha requisição com Authentication preenchido
        BOOK->>DB: SELECT / INSERT / UPDATE / DELETE em books
        DB-->>BOOK: Registros persistidos
        BOOK-->>SPA: 200 / 201 / 204 (BookResponse DTO)
    else Token vencido (exp no passado)
        SEC-->>SPA: 401 TOKEN_EXPIRED (RestAuthenticationEntryPoint)
        SPA->>SPA: authInterceptor executa logout(false)
        SPA-->>U: Snackbar "Sua sessão expirou..." e redireciona para /login
    else Token ausente ou adulterado
        SEC-->>SPA: 401 UNAUTHENTICATED ou TOKEN_INVALID
        SPA->>SPA: Limpa sessão e redireciona para /login
    end
```

### 7.2 Anatomia do Token JWT Emitido

Um JWT emitido por `AuthService.kt` compõe-se de três segmentos codificados em Base64URL separados por ponto (`header.payload.signature`):

1. **Header**: `{"alg": "HS256", "typ": "JWT"}` — declara o algoritmo simétrico HMAC com SHA-256.
2. **Payload (Claims)**:
   - `iss` (*issuer*): `"biblioteca-api"`, identificando a aplicação emissora;
   - `sub` (*subject*): nome de usuário autenticado (ex.: `"admin"`);
   - `iat` (*issued at*): instante Unix em segundos da emissão;
   - `exp` (*expiration time*): instante Unix de vencimento (`iat + 3600`, isto é, 1 hora por padrão);
   - `roles`: lista de perfis sem prefixo (ex.: `["ADMIN"]`), convertida na entrada pelo `JwtGrantedAuthoritiesConverter` para autoridades `ROLE_ADMIN`.
3. **Signature**: código de autenticação de mensagem calculado sobre `base64Url(header) + "." + base64Url(payload)` usando a chave secreta de pelo menos 256 bits.

É fundamental destacar que **um JWT JWS (RFC 7515) é assinado, mas não criptografado**: qualquer parte que possua o token consegue decodificar o payload em Base64URL (como o próprio `AuthService.isExpired` faz no Angular para ler `exp`). Por essa razão, o payload contém apenas identificadores operacionais (`sub`, `roles`, `exp`) e jamais dados sensíveis, senhas ou segredos internos. O papel da assinatura HS256 é garantir **autenticidade e integridade**: se um atacante alterar `"roles": ["USER"]` para `["ADMIN"]` ou estender o `exp` no navegador, o hash HMAC recalculado pelo servidor não coincidirá com a assinatura e o `NimbusJwtDecoder` rejeitará o token imediatamente com `401 TOKEN_INVALID`.

### 7.3 Configuração do Spring Security (`SecurityConfig.kt`)

Em `backend/src/main/kotlin/com/biblioteca/config/SecurityConfig.kt`, a cadeia de segurança foi configurada seguindo o princípio do menor privilégio:

- **Política de sessão `STATELESS`**: o servidor não cria `HttpSession` nem envia cookie `JSESSIONID`; cada requisição precisa provar sua própria identidade via cabeçalho `Authorization`.
- **Proteção CSRF (*Cross-Site Request Forgery*) desabilitada com justificativa técnica**: ataques CSRF exploram o envio automático de cookies de autenticação pelo navegador em requisições originadas em sites de terceiros. Como esta API é puramente *stateless* e autentica exclusivamente via cabeçalho explícito `Authorization: Bearer` (que o navegador jamais anexa automaticamente entre origens), o vetor clássico de CSRF não se aplica. Caso o transporte do token migrasse para cookie `HttpOnly`, a proteção CSRF teria obrigatoriamente de ser reativada.
- **Rotas públicas mínimas**: apenas `OPTIONS /**` (necessário para o *preflight* CORS do navegador antes de enviar o cabeçalho `Authorization`) e `POST /api/auth/login` possuem `permitAll()`. Todas as demais rotas caem em `.anyRequest().authenticated()`.
- **Validação via OAuth2 Resource Server**: em vez de escrever um `OncePerRequestFilter` artesanal sujeito a falhas sutis de parsing, utilizou-se `oauth2ResourceServer { jwt }` apoiado no `NimbusJwtDecoder` oficial do Spring Security, encadeando `JwtTimestampValidator` e `JwtIssuerValidator` em `DelegatingOAuth2TokenValidator`.

```kotlin
// Caminho: backend/src/main/kotlin/com/biblioteca/config/SecurityConfig.kt
@Bean
fun jwtDecoder(key: SecretKey): JwtDecoder {
    val validator = DelegatingOAuth2TokenValidator(
        JwtTimestampValidator(Duration.ofSeconds(jwtProperties.clockSkewSeconds)),
        JwtIssuerValidator(jwtProperties.issuer),
    )
    return NimbusJwtDecoder.withSecretKey(key)
        .macAlgorithm(MacAlgorithm.HS256)
        .build()
        .apply { setJwtValidator(validator) }
}
```

### 7.4 Proteção de Senhas com BCrypt e Prevenção de Enumeração

As senhas de operadores são processadas com `BCryptPasswordEncoder` (fator de custo padrão 10, equivalente a $2^{10}$ rodadas de derivação Blowfish). O BCrypt incorpora um *salt* criptograficamente aleatório de 128 bits diretamente dentro da *string* resultante (`$2a$10$...`), de modo que dois usuários com a mesma senha geram *hashes* completamente distintos, neutralizando tabelas pré-computadas (*rainbow tables*).

Durante o login, `AppUserDetailsService` lança `UsernameNotFoundException` quando o usuário não existe, mas o `DaoAuthenticationProvider` do Spring Security converte essa exceção internamente em `BadCredentialsException`, que `GlobalExceptionHandler` traduz na mensagem única `"Usuário ou senha inválidos."` (`401 INVALID_CREDENTIALS`). Conforme comprovado no teste automatizado `AuthControllerTest` e nos passos `02a`/`02b` do roteiro E2E, um invasor não consegue distinguir pela mensagem HTTP se acertou o nome de um usuário válido do sistema, mitigando ataques de enumeração de contas.

### 7.5 Expiração, Segredo Criptográfico e Guard-rail de Inicialização

O tempo de vida padrão do token é de `3600` segundos (1 hora), configurável via variável `JWT_EXPIRATION_SECONDS`. Essa janela equilibra usabilidade no turno de atendimento da biblioteca com contenção de danos: como tokens JWT *stateless* não consultam lista de revogação no banco a cada requisição, um prazo curto limita a janela de uso caso um token seja copiado indevidamente.

Para impedir a subida acidental da API com uma chave curta vulnerável a força bruta, a classe `JwtProperties.kt` valida o comprimento em bytes logo no bloco `init`:

```kotlin
// Caminho: backend/src/main/kotlin/com/biblioteca/config/JwtProperties.kt
@ConfigurationProperties(prefix = "app.jwt")
data class JwtProperties(
    val secret: String,
    val expirationSeconds: Long = 3600,
    val clockSkewSeconds: Long = 60,
    val issuer: String = "biblioteca-api",
) {
    init {
        require(secret.toByteArray(Charsets.UTF_8).size >= 32) {
            "app.jwt.secret precisa ter pelo menos 32 bytes. Defina a variável de ambiente JWT_SECRET."
        }
    }
}
```

Em `application.yml`, há um valor substituto exclusivo para facilitar a avaliação local imediata, explicitamente documentado como inseguro fora de desenvolvimento. Em qualquer implantação compartilhada, `JWT_SECRET` deve receber pelo menos 32 bytes aleatórios de alta entropia via variável de ambiente.

### 7.6 Armazenamento no Frontend e Análise de Ameaças

No Angular, `AuthService` armazena o token em `localStorage` (`auth.token`) sincronizado com um `signal<string | null>`. Essa abordagem mantém a sessão ativa se o operador atualizar a aba (`F5`) e simplifica o envio via `HttpInterceptorFn`, mas apresenta um *trade-off* clássico de segurança web frente a cookies `HttpOnly`:

- **`localStorage` + Header `Authorization`**: imune a CSRF, porém legível por código JavaScript executado na mesma origem caso haja uma vulnerabilidade de **XSS** (*Cross-Site Scripting*). O Angular mitiga fortemente XSS escapando automaticamente interpolações HTML (`{{ book.title }}`) e bloqueando URLs `javascript:`, além de não usarmos `innerHTML` nem `bypassSecurityTrustHtml` em nenhum componente.
- **Cookie `HttpOnly; Secure; SameSite=Strict`**: inacessível a scripts maliciosos em caso de XSS, porém exige configuração conjunta de domínio/HTTPS e tokens anti-CSRF no *backend*.

| Ameaça Considerada | Mitigação Implementada no Projeto | Limitação Residual Conhecida |
|---|---|---|
| **Vazamento de banco de dados / leitura de senhas** | Hash adaptativo `BCryptPasswordEncoder` com *salt* individual por registro em `app_users.password_hash`; DTOs nunca expõem o campo. | Senha inicial do *seed* (`admin123`) deve ser alterada via `SEED_ADMIN_PASSWORD` fora do ambiente acadêmico. |
| **Adulteração de payload ou falsificação de token** | Assinatura HMAC-SHA256 validada pelo `NimbusJwtDecoder` com segredo $\ge 32$ bytes verificado na subida. | Segredo simétrico único (HS256); arquiteturas de múltiplos microsserviços preferem chave assimétrica RS256/ES256. |
| **Reuso de token expirado ou interceptado** | Expiração obrigatória de 1 hora (`exp`) checada tanto no `NimbusJwtDecoder` quanto preventivamente no `authGuard` do Angular. | Não há lista de revogação (*blacklist*) no servidor antes do vencimento natural de 1 hora. |
| **Enumeração de usuários válidos no login** | Resposta HTTP `401` idêntica (`INVALID_CREDENTIALS` — `"Usuário ou senha inválidos."`) para conta inexistente e senha incorreta. | Diferença residual mínima de tempo de CPU no cálculo do BCrypt e ausência de *rate limiting* por IP. |
| **Força bruta contra `POST /api/auth/login`** | Senha validada com algoritmo lento por construção (BCrypt). | Não há bloqueio temporário de conta nem limitador de requisições por minuto (listado na Seção 12). |
| **Exfiltração de token via XSS ou redirecionamento aberto** | Sanitização nativa de templates Angular; validação em `LoginComponent` exigindo que `returnUrl` comece com `/` e não com `//` (evitando *open redirect*); `authInterceptor` só envia `Bearer` para `environment.apiUrl`. | Token em `localStorage` permanece acessível caso uma dependência externa comprometida injete script na página. |


---

## 8. Frontend Angular

### 8.1 Organização Modular em Pastas

O *frontend* em `frontend/src/app/` adota integralmente a arquitetura moderna de **componentes *standalone*** do Angular 21 (sem `NgModules`), estruturada em quatro divisões funcionais:

- **`core/`**: artefatos transversais instanciados uma única vez na aplicação (`providedIn: 'root'`), compreendendo autenticação (`auth.service.ts`, `auth.guard.ts`, `auth.interceptor.ts`), contratos globais (`auth.model.ts`, `api-error.model.ts`) e serviços de infraestrutura visual (`notification.service.ts` e `confirm.service.ts`).
- **`shared/`**: blocos reutilizáveis entre funcionalidades, incluindo `confirm-dialog.component.ts` (diálogo modal genérico do Angular Material) e `error-utils.ts` (tradução de erros de formulário e de falhas HTTP para mensagens em português).
- **`layout/`**: `main-layout.component.ts`, responsável pela moldura autenticada com barra superior (`mat-toolbar`), atalhos de navegação, identificação do operador logado e botão **"Sair"**.
- **`features/`**: páginas de negócio carregadas sob demanda (*lazy loading* via `loadComponent`), separadas em `login/` (`login.component.ts`) e `books/` (`book.model.ts`, `book.service.ts`, `book-form.component.ts`, `book-list.component.ts`, `book-create.component.ts`, `book-detail.component.ts` e `book-edit.component.ts`).

### 8.2 Mapa de Rotas e Fluxo de Navegação

Em `frontend/src/app/app.routes.ts`, a ordem de declaração das rotas filhas garante que `books/new` apareça **antes** de `books/:id`. Como o Angular Router avalia as rotas na sequência em que foram registradas (*first-match wins*), inverter essa ordem faria o segmento literal `new` casar com o parâmetro `:id`, tentando buscar no *backend* um livro de identificador inválido.

| Caminho Angular | Componente Carregado (`loadComponent`) | Guard Aplicado | Finalidade da Rota |
|---|---|---|---|
| `/login` | `LoginComponent` | `guestGuard` | Formulário de entrada; redireciona para `/books` caso o operador já esteja autenticado. |
| `/` | Redireciona para `/books` (`pathMatch: 'full'`) | `authGuard` (rota-pai) | Ponto inicial padrão da área autenticada dentro de `MainLayoutComponent`. |
| `/books` | `BookListComponent` | `authGuard` | Listagem tabular do acervo com busca reativa, indicadores de estoque e ações rápidas. |
| `/books/new` | `BookCreateComponent` | `authGuard` | Tela de catalogação de novo livro reutilizando `BookFormComponent`. |
| `/books/:id` | `BookDetailComponent` | `authGuard` | Ficha catalográfica detalhada da obra com opções de voltar, editar ou excluir. |
| `/books/:id/edit` | `BookEditComponent` | `authGuard` | Carregamento prévio do livro e edição validada reutilizando `BookFormComponent`. |
| `**` | Redireciona para `/` | — | Tratamento de rotas inexistentes conduzindo à listagem (ou ao login se deslogado). |

```mermaid
flowchart TD
    LG["/login<br/>LoginComponent + guestGuard"] -->|"POST /api/auth/login 200"| LS["/books<br/>BookListComponent - Acervo"]
    LS -->|"Botão Catalogar livro"| CR["/books/new<br/>BookCreateComponent"]
    LS -->|"Clique no título ou ícone Ver"| DT["/books/:id<br/>BookDetailComponent"]
    LS -->|"Ícone Editar"| ED["/books/:id/edit<br/>BookEditComponent"]
    DT -->|"Botão Editar"| ED
    CR -->|"POST 201 + Snackbar"| DT
    ED -->|"PUT 200 + Snackbar"| DT
    LS -->|"Excluir + ConfirmDialog"| LS
    DT -->|"Excluir + ConfirmDialog"| LS
    LS -->|"Botão Sair ou HTTP 401"| LG
```

### 8.3 Detalhamento das Cinco Páginas Funcionais

*(Nota sobre capturas de tela: como o ambiente de execução Linux desta verificação não dispunha de navegador Chromium headless instalado para exportação automatizada de imagens PNG, não foram referenciados arquivos em `docs/img/`; cada tela é descrita integralmente a seguir conforme seus elementos renderizados em HTML/Material.)*

1. **Página de Login (`/login` — `LoginComponent`)**: centralizada vertical e horizontalmente sobre fundo cinza-azulado claro (`#f6f8fb`), exibe um cartão `mat-card` com ícone `local_library`, título *"Biblioteca Comunitária"*, barra de progresso indeterminada durante a chamada HTTP, campos delineados *"Usuário"* e *"Senha"* (`type="password"`), mensagens `mat-error` individuais quando submetidos em branco, bloco `role="alert"` em tom vermelho suave (`#fceeee`) para credenciais rejeitadas e botão primário *"Entrar"* (alterado para *"Autenticando..."* e desabilitado durante o envio).
2. **Página de Listagem do Acervo (`/books` — `BookListComponent`)**: exibe cabeçalho com título *"Acervo da Biblioteca"*, botão de ação primária *"Catalogar livro"*, campo de busca com ícone de lupa (*"Buscar por título, autor ou ISBN"*) conectado a um fluxo RxJS `debounceTime(300)` + `distinctUntilChanged()` + `switchMap()`, barra de carregamento, cartão de erro com botão *"Tentar novamente"*, cartão de lista vazia (*"Nenhum livro encontrado para a consulta informada."*) e tabela responsiva `mat-table` contendo seis colunas: Título (com link para `/books/:id` e subtítulo autor + ano), ISBN em fonte monoespaçada, Gênero traduzido, Localização física, Exemplares (com pílula verde `Disponível` ou vermelha `Esgotado`/`Inativo`) e Ações (ícones de visualizar, editar e excluir).
3. **Página de Catalogação (`/books/new` — `BookCreateComponent`)**: apresenta título *"Catalogar novo livro"*, texto orientativo e incorpora `BookFormComponent` em grade responsiva de múltiplas colunas com doze controles tipados, seletor de gênero (`mat-select`), seletor nativo de data (`type="date"`), chave deslizante (`mat-slide-toggle` *"Obra ativa para empréstimo"*), área de texto para sinopse e botões *"Cancelar"* e *"Salvar livro"*.
4. **Página de Detalhes (`/books/:id` — `BookDetailComponent`)**: consulta `BookService.get(id)` na abertura; caso receba `404`, exibe *snackbar* *"Livro não encontrado no acervo."* e retorna a `/books`. Quando encontrado, renderiza cartão descritivo (`<dl>`) com título, autor, editora, ano, ISBN, gênero traduzido, estante, saldo de exemplares (com destaque vermelho quando todos estão emprestados ou a obra está inativa), data de aquisição no padrão brasileiro (`dd/MM/yyyy`), sinopse e datas de auditoria (`dd/MM/yyyy HH:mm`), além das ações *"Voltar ao acervo"*, *"Editar"* e *"Excluir"*.
5. **Página de Edição (`/books/:id/edit` — `BookEditComponent`)**: carrega os dados atuais do livro pelo `id` da URL (tratando `404` com redirecionamento seguro) e alimenta `[initial]="b"` no mesmo `BookFormComponent`, que preenche automaticamente os controles via `effect()` reativo do Angular, garantindo paridade absoluta de regras entre criação e edição.

### 8.4 Serviços, Guards e Interceptor HTTP

Nenhum componente visual conhece `HttpClient` ou monta URLs manualmente: toda comunicação passa por serviços injetáveis dedicados:

- **`AuthService` (`core/auth/auth.service.ts`)**: expõe sinais somente-leitura `token` e `user`, método `login()` (`POST /api/auth/login` com persistência em `localStorage`), `logout()` (remoção das chaves `auth.token` e `auth.user`, limpeza dos sinais e navegação opcional a `/login`) e `isAuthenticated()`, que decodifica o payload Base64URL do JWT e verifica `Date.now() < payload.exp * 1000`.
- **`BookService` (`features/books/book.service.ts`)**: encapsula `list(query?)`, `get(id)`, `create(payload)`, `update(id, payload)` e `delete(id)` sobre `${environment.apiUrl}/books`.
- **`NotificationService` (`core/services/notification.service.ts`)**: padroniza notificações `MatSnackBar` de sucesso (4 segundos, classe `.snack-success`) e de erro (7 segundos, classe `.snack-error`).
- **`ConfirmService` (`core/services/confirm.service.ts`)**: abre `ConfirmDialogComponent` via `MatDialog` com largura de `440px` e devolve `Observable<boolean>` (`true` somente se o operador confirmar).

O `authInterceptor` garante simultaneamente o envio seguro do token nas rotas da API e o tratamento centralizado de expiração sem duplicar notificações caso múltiplas chamadas paralelas retornem `401`:

```typescript
// Caminho: frontend/src/app/core/auth/auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  const isApiCall = req.url.startsWith(environment.apiUrl);
  const isLogin = req.url.startsWith(`${environment.apiUrl}/auth/login`);
  const token = auth.token();

  const authReq =
    token && isApiCall && !isLogin
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isApiCall && !isLogin && auth.token()) {
        const expired = error.error?.code === 'TOKEN_EXPIRED';
        auth.logout(false);
        notify.error(
          expired
            ? 'Sua sessão expirou. Faça login novamente.'
            : 'Sessão inválida. Faça login novamente.',
        );
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
```

### 8.5 Formulários Reativos, Mensagens de Feedback e Confirmação de Exclusão

Em `BookFormComponent`, cada controle aplica validadores equivalentes aos do servidor, incluindo `notFutureDateValidator` para `acquisitionDate` e checagem cruzada `available > total` gerando o erro `copiesExceeded` em `copiesAvailable`. Quando o usuário tenta salvar um formulário inválido, `markAllAsTouched()` exibe imediatamente todas as mensagens em português geradas por `controlErrorMessage()`. Caso uma regra validada no servidor retorne `400 VALIDATION_ERROR` com `fieldErrors`, `applyServerFieldErrors()` injeta `{ server: f.message }` diretamente no `FormControl` afetado, destacando a borda do campo em vermelho.

| Operação Executada pelo Usuário | Mensagem de Sucesso (`NotificationService.success`) | Comportamento / Mensagem em Caso de Falha |
|---|---|---|
| **Login em `/login`** | Redirecionamento direto a `/books` (ou `returnUrl` interna) | Alerta na tela: `"Usuário ou senha inválidos."` (`401`) ou mensagem de indisponibilidade de rede (`status 0`). |
| **Listagem / Busca em `/books`** | Tabela atualizada em tela | Cartão `role="alert"` + *snackbar* com `extractErrorMessage(err)` e botão *"Tentar novamente"*. |
| **Catalogar livro em `/books/new`** | `'Livro "<título>" catalogado com sucesso.'` | Campos destacados + `'Corrija os campos destacados.'` (`400`) ou mensagem de ISBN duplicado (`409`). |
| **Editar livro em `/books/:id/edit`** | `'Livro "<título>" atualizado com sucesso.'` | Campos destacados (`400`), mensagem de conflito de ISBN (`409`) ou `'Livro não encontrado no acervo.'` (`404`). |
| **Abrir detalhe/edição inexistente** | — | `'Livro não encontrado no acervo.'` seguido de navegação automática para `/books`. |
| **Excluir livro (listagem ou detalhe)** | `'Livro "<título>" excluído com sucesso.'` | Cancelar no modal aborta sem requisição; falha HTTP exibe `extractErrorMessage(err)`. |
| **Sessão expirada / token inválido** | — | `'Sua sessão expirou. Faça login novamente.'` ou `'Sessão inválida. Faça login novamente.'` + ida a `/login`. |
| **Servidor desligado (`status === 0`)** | — | `'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'` |

O fluxo obrigatório de confirmação antes de qualquer exclusão funciona de modo idêntico na listagem e na página de detalhes:

```mermaid
sequenceDiagram
    actor U as Operador
    participant PG as BookList / BookDetail
    participant DLG as ConfirmDialogComponent
    participant SVC as BookService
    participant API as Spring Boot API

    U->>PG: Clica em Excluir livro
    PG->>DLG: ConfirmService.ask(título e ISBN da obra)
    alt Operador clica em Cancelar ou fecha modal
        DLG-->>PG: false (filter(Boolean) encerra fluxo)
    else Operador clica em Excluir
        DLG-->>PG: true
        PG->>SVC: delete(book.id)
        SVC->>API: DELETE /api/books/{id} com Bearer JWT
        API-->>SVC: 204 No Content
        PG-->>U: Snackbar de sucesso e atualiza lista / navega a /books
    end
```

Quanto à **acessibilidade e responsividade**, todos os campos utilizam `<mat-label>` vinculados nativamente aos `<input>`, botões somente-ícone na tabela possuem `aria-label` descritivo (`"Ver detalhes"`, `"Editar livro"`, `"Excluir livro"`), mensagens críticas de erro usam `role="alert"`, o diálogo modal gerencia foco inicial automaticamente (`autoFocus: 'dialog'` e `cdkFocusInitial`), a tabela possui contêiner `overflow-x: auto` para telas estreitas e os *grids* de formulário e detalhes colapsam para coluna única abaixo de `640px`.

---

## 9. Como Executar

### 9.1 Pré-Requisitos de Ambiente

| Ferramenta | Versão Mínima Recomendada | Versão Verificada na Construção | Observação |
|---|---|---|---|
| **Java JDK** | `21` (LTS) | OpenJDK `21.0.12.1` | Necessário para compilar e rodar o Spring Boot via `./gradlew`. |
| **Node.js + npm** | Node `20.19+` ou `22.12+` | Node `v22.23.2` / npm `10.9.8` | Necessário para Angular CLI 21 e Vitest. |
| **Docker + Compose** | Docker Engine `24+` | *Opcional* (ver passo 3B) | Recomendado para subir PostgreSQL 16; há perfil local em arquivo caso ausente. |

### 9.2 Passo a Passo Completo do Zero

#### 1. Acessar o diretório do projeto e configurar variáveis (opcional)

Os valores padrão de desenvolvimento já permitem subir tudo imediatamente, mas é possível copiar `.env.example` para personalizar portas, credenciais ou o segredo JWT:

```bash
cd projeto-biblioteca
cp .env.example .env
```

#### 2. Subir o Banco de Dados e o Backend (`http://localhost:8080`)

**Opção A — Execução padrão com PostgreSQL via Docker Compose:**

```bash
docker compose up -d
cd backend
./gradlew bootRun
```

**Opção B — Execução local sem Docker (H2 persistente em disco em `backend/data/`):**

Caso a máquina não possua Docker instalado (como ocorreu no ambiente Linux onde esta verificação foi executada), utilize o perfil `h2`, que grava os dados de forma persistente em `backend/data/bibliotecadb.mv.db` com compatibilidade PostgreSQL:

```bash
cd backend
SPRING_PROFILES_ACTIVE=h2 ./gradlew bootRun
```

Aguarde no terminal a linha `Started BibliotecaApplicationKt` confirmando que a API está ouvindo em `http://localhost:8080`.

#### 3. Instalar dependências e subir o Frontend Angular (`http://localhost:4200`)

Em um segundo terminal, a partir da raiz do projeto:

```bash
cd frontend
npm ci
npx ng serve
```

Abra o navegador em `http://localhost:4200`. A aplicação redirecionará automaticamente para `http://localhost:4200/login`.

#### 4. Credenciais de Desenvolvimento (*Seed* Automático)

Na primeira inicialização, `DataInitializer` cria automaticamente o operador administrador e cataloga 10 livros de exemplo:

- **Usuário:** `admin`
- **Senha:** `admin123`

#### 5. Como Parar, Reiniciar sem Perder Dados e Limpar o Banco

- **Reiniciar mantendo os dados**: interrompa o backend com `Ctrl+C` e suba novamente (`./gradlew bootRun`). Com Docker, `docker compose stop` ou `docker compose down` **preserva** o volume nomeado `pgdata`. No perfil `h2`, os arquivos em `backend/data/` permanecem intactos no disco.
- **Apagar todos os dados e recomeçar do zero**:
  - Com Docker: execute `docker compose down -v` (**atenção**: a flag `-v` remove o volume `pgdata` e destrói permanentemente os registros salvos).
  - No perfil `h2`: pare o backend e remova a pasta `rm -rf backend/data`.

### 9.3 Problemas Comuns e Soluções Rápidas

| Sintoma Observado | Causa Provável | Solução |
|---|---|---|
| `Port 8080 was already in use` ao subir o backend | Outro serviço local já ocupa a porta `8080`. | Encerre o processo conflitante ou suba com `SERVER_PORT=8081` ajustando `apiUrl` em `environment.development.ts`. |
| Erro `Connection refused` para `localhost:5432` | Contêiner PostgreSQL não foi iniciado ou Docker não está instalado. | Rode `docker compose up -d` ou use `SPRING_PROFILES_ACTIVE=h2 ./gradlew bootRun`. |
| Falha na subida: `app.jwt.secret precisa ter pelo menos 32 bytes` | Variável `JWT_SECRET` definida no ambiente com menos de 32 caracteres. | Defina uma chave com 32 ou mais caracteres ASCII/UTF-8. |
| Bloqueio de CORS no console do navegador | Frontend aberto em porta diferente de `4200` (ex.: `4201`). | Inicie com `CORS_ALLOWED_ORIGINS=http://localhost:4200,http://localhost:4201`. |

*(Registro de transparência sobre execução: todos os comandos de compilação, testes e execução da API com `SPRING_PROFILES_ACTIVE=h2` foram efetivamente executados neste ambiente; apenas `docker compose up -d` não foi executado localmente porque o binário `docker` não estava instalado na máquina de avaliação.)*

---

## 10. Testes e Validação

### 10.1 Estratégia de Testes em Quatro Níveis

A qualidade e a conformidade com o enunciado foram aferidas por quatro camadas complementares de verificação:

1. **Auditoria estática automatizada (`verify_requirements.py`)**: inspeciona código-fonte Kotlin, TypeScript, templates HTML, configurações YAML e documentação em busca de violações arquiteturais (ex.: entidade exposta em *controller*, falta de `@field:`, H2 em memória na configuração principal, componente chamando `HttpClient`, exclusão sem confirmação ou senha em DTO).
2. **Testes de integração de fatia completa no Backend (`@SpringBootTest` + `@AutoConfigureMockMvc`)**: exercitam a cadeia real do Spring Security (`NimbusJwtDecoder`, `RestAuthenticationEntryPoint`, CORS), serialização Jackson, Bean Validation, regras de negócio do `BookService` e persistência JPA contra banco isolado de teste (`@ActiveProfiles("test")`).
3. **Testes unitários no Frontend Angular (`Vitest` + `TestBed` + `HttpTestingController`)**: validam armazenamento e expiração de token no `AuthService`, redirecionamento do `authGuard`, injeção do cabeçalho `Authorization: Bearer` e reação a `401 TOKEN_EXPIRED` no `authInterceptor`, além das regras de validação e normalização do `BookFormComponent`.
4. **Roteiro Ponta a Ponta Real (`HTTP` sobre processo JVM empacotado com `bootJar`)**: sobe o servidor real em porta TCP, executa 22 chamadas reais cobrindo autenticação, CRUD, códigos de erro, reinício completo do processo para provar persistência em disco e espera temporal real para comprovar expiração do JWT.

### 10.2 Comandos Executados e Resultados Reais Obtidos

| Etapa de Verificação | Comando Executado | Resultado Real Obtido |
|---|---|---|
| **Testes Backend (JUnit 5 + MockMvc)** | `./backend/gradlew -p backend test` | `BUILD SUCCESSFUL` — **14 testes executados, 14 aprovados, 0 falhas, 0 erros** (`AuthControllerTest`: 7 testes em `1.243s`; `BookControllerTest`: 7 testes em `0.801s`). |
| **Empacotamento Executável Backend** | `./backend/gradlew -p backend bootJar` | `BUILD SUCCESSFUL` — geração de `backend/build/libs/biblioteca-api-0.0.1-SNAPSHOT.jar`. |
| **Testes Unitários Frontend (Vitest)** | `cd frontend && npx ng test --watch=false` | **5 arquivos de teste aprovados, 11 testes executados, 11 aprovados, 0 erros** em `2.68s`. |
| **Build de Produção Frontend** | `cd frontend && npx ng build` | Bundle inicial de `464.43 kB` (`115.89 kB` estimado em transferência) + 6 *chunks* preguiçosos compilados em `5.732s` sem erros. |
| **Roteiro Ponta a Ponta (API Real)** | Execução de `bootJar` com perfil `h2` em disco + cliente HTTP | **22/22 cenários aprovados** (incluindo persistência pós-restart e expiração real `TOKEN_EXPIRED`). |
| **Verificador Estático de Requisitos** | `python3 .agents/skills/fullstack-requirements-verification/scripts/verify_requirements.py .` | **48 ok, 0 avisos, 0 falhas** (após geração de `README.md` e `docs/DOCUMENTACAO.md`). |

### 10.3 Resultados Detalhados do Roteiro Ponta a Ponta (22 Cenários Executados)

| # | Cenário Testado | Entrada Enviada | Resultado Esperado | Resultado Obtido | Status |
|---|---|---|---|---|---|
| 01 | Login com credenciais válidas | `POST /api/auth/login` (`admin` / `admin123`) | `200 OK` + JWT + sem `password` no JSON | `200 OK`, `role: "ADMIN"`, `expiresIn: 3600`, 0 ocorrências de `password` | OK |
| 02a | Login com senha incorreta | `POST /api/auth/login` (`admin` / `errada`) | `401 INVALID_CREDENTIALS` | `401` com `message: "Usuário ou senha inválidos."` | OK |
| 02b | Login com usuário inexistente | `POST /api/auth/login` (`naoexiste` / `x`) | `401 INVALID_CREDENTIALS` (mesma mensagem) | `401` com `message: "Usuário ou senha inválidos."` | OK |
| 03 | Login com JSON vazio | `POST /api/auth/login` (`{}`) | `400` com detalhe do campo ausente | `400 MALFORMED_REQUEST` apontando `field: "username"` | OK |
| 04 | Acesso protegido sem token | `GET /api/books` sem `Authorization` | `401 UNAUTHENTICATED` | `401 UNAUTHENTICATED` em formato `ApiError` | OK |
| 05 | Acesso com token adulterado | `GET /api/books` com sufixo inválido no Bearer | `401 TOKEN_INVALID` | `401 TOKEN_INVALID` (`"Token de acesso inválido..."`) | OK |
| 06 | Listagem inicial do *seed* | `GET /api/books` com Bearer válido | `200 OK` com 10 livros ordenados por título | `200 OK`, 10 livros retornados (primeiro: *A Hora da Estrela*) | OK |
| 07 | Criação de livro válido | `POST /api/books` (*Grande Sertão: Veredas*) | `201 Created` + Header `Location` + `id` | `201 Created`, `Location: .../api/books/11`, `available: true` | OK |
| 08a | Consulta por ID existente | `GET /api/books/11` | `200 OK` com dados completos da obra | `200 OK`, `isbn: "978-85-359-3198-3"` | OK |
| 08b | Busca textual no acervo | `GET /api/books?q=Guimarães` | `200 OK` contendo apenas obras correspondentes | `200 OK`, `count: 1` | OK |
| 09 | Cadastro com ISBN duplicado | `POST /api/books` repetindo `978-85-359-3198-3` | `409 CONFLICT` | `409 CONFLICT` citando o ISBN em conflito | OK |
| 10a | Cadastro com campos inválidos | `POST /api/books` (`title: "A"`, `copiesTotal: 0`, etc.) | `400 VALIDATION_ERROR` com `fieldErrors` | `400 VALIDATION_ERROR` listando 13 violações específicas em português | OK |
| 10b | Disponíveis > Total de exemplares | `POST /api/books` (`copiesTotal: 2`, `copiesAvailable: 5`) | `400 VALIDATION_ERROR` em `copiesAvailable` | `400 VALIDATION_ERROR` destacando `field: "copiesAvailable"` | OK |
| 10c | Corpo JSON malformado | `POST /api/books` (`{titulo:`) | `400 MALFORMED_REQUEST` | `400 MALFORMED_REQUEST` (`"Corpo da requisição inválido."`) | OK |
| 11a | Atualização cadastral válida | `PUT /api/books/11` (`location: "Corredor A - Estante 5"`) | `200 OK` com campos atualizados | `200 OK`, nova estante e `copiesAvailable: 3` persistidos | OK |
| 11b | Atualização de ID inexistente | `PUT /api/books/999999` | `404 NOT_FOUND` | `404 NOT_FOUND` (`"Livro com id 999999 não encontrado."`) | OK |
| 12 | Parâmetro de ID não numérico | `GET /api/books/abc` | `400 VALIDATION_ERROR` | `400 VALIDATION_ERROR` (`"O parâmetro 'id' é inválido."`) | OK |
| 13 | Pré-voo CORS do navegador | `OPTIONS /api/books` (`Origin: http://localhost:4200`) | `200 OK` com `Access-Control-Allow-Origin` | `200 OK`, `Access-Control-Allow-Origin: http://localhost:4200` | OK |
| 14 | Persistência após reiniciar JVM | Encerrar servidor (`SIGTERM`), subir nova JVM e ler `GET /api/books/11` | `200 OK` mantendo os dados gravados antes do *stop* | `200 OK`, livro `11` recuperado intacto do arquivo em disco | OK |
| 15a | Exclusão de livro existente | `DELETE /api/books/11` | `204 No Content` sem corpo | `204 No Content` | OK |
| 15b | Leitura após exclusão | `GET /api/books/11` | `404 NOT_FOUND` | `404 NOT_FOUND` | OK |
| 16 | Token expirado em tempo real | Emitir token com `exp=2s`, aguardar `3s` e chamar `GET /api/books` | `401 TOKEN_EXPIRED` | `401 TOKEN_EXPIRED` (`"Sua sessão expirou. Faça login novamente."`) | OK |

### 10.4 Escopo Não Testado Automaticamente

Em respeito à transparência técnica, registra-se o que **não** foi executado de forma automatizada nesta entrega:
- **Testes E2E em navegador real (Playwright / Cypress)**: os fluxos visuais do Angular foram verificados por testes unitários com `TestBed`/Vitest, compilação estrita de templates (`ng build`) e inspeção de código dos 15 itens do checklist de interface, pois o ambiente não possuía Chromium instalado.
- **Execução do contêiner `postgres:16-alpine` via Docker**: validada por conformidade sintática do `docker-compose.yml` e compatibilidade SQL (`MODE=PostgreSQL`), mas não instanciada por ausência do binário `docker` na máquina local.
- **Testes de carga/estresse (k6 / JMeter) e auditoria dinâmica de intrusão (DAST)**.

---

## 11. Decisões Técnicas

A tabela abaixo consolida as principais escolhas arquiteturais do projeto, as alternativas avaliadas, a motivação técnica e suas consequências práticas, incluindo ajustes realizados a partir de problemas concretos enfrentados durante a implementação.

| Decisão Tomada | Alternativas Avaliadas | Motivo da Escolha | Consequência / Trade-off |
|---|---|---|---|
| **1. Kotlin `2.1.21` com Spring Boot `3.5.6` em Java `21`** | Java puro ou Spring Boot `4.x` recém-lançado | Kotlin reduz drasticamente código repetitivo em DTOs/*mappers* e impõe segurança contra `NullPointerException` em tempo de compilação; a linha `3.5.x` oferece estabilidade madura com Spring Security `6.5` e Jackson `2.x`. | Exige configurar explicitamente os plugins `kotlin("plugin.spring")`, `kotlin("plugin.jpa")` e `@field:` nas anotações de validação. |
| **2. Spring Security OAuth2 Resource Server (`NimbusJwtDecoder` / `NimbusJwtEncoder`)** | Biblioteca `jjwt` com `OncePerRequestFilter` escrito manualmente | Delega parsing criptográfico, verificação de assinatura e checagem temporal (`exp` + *clock skew*) ao módulo oficial mantido pela equipe do Spring Security. | Menos código proprietário para manter e auditar; requer `RestAuthenticationEntryPoint` para mapear causas de falha em códigos de negócio (`TOKEN_EXPIRED` vs `TOKEN_INVALID`). |
| **3. Algoritmo simétrico `HS256` para assinatura JWT** | Chave assimétrica `RS256` (par RSA público/privado) | Como o mesmo serviço monolítico emite (`AuthService`) e valida (`SecurityConfig`) os tokens, uma chave simétrica de $\ge 256$ bits é simples de configurar via variável de ambiente única (`JWT_SECRET`). | Em eventual evolução para microsserviços independentes, todos precisariam conhecer o segredo ou migrar para `RS256`/JWKS. |
| **4. PostgreSQL em `docker-compose.yml` + perfil `h2` em arquivo local** | Apenas PostgreSQL (bloqueante sem Docker) ou H2 em memória (perde dados) | Atende integralmente o requisito de persistência relacional real (`pgdata`) e ao mesmo tempo viabiliza execução e comprovação E2E de reinício em máquinas sem Docker instalado. | Mantém dois drivers JDBC no `build.gradle.kts` (`postgresql` e `h2`), isolados por perfil de configuração. |
| **5. DTOs dedicados + funções de extensão em `BookMapper.kt`** | Expor a entidade `@Entity Book` direto no *controller* ou usar MapStruct | Evita vazamento acidental de colunas internas, desacopla o contrato JSON do modelo SQL e dispensa processadores de anotação externos (kapt/KSP) para um domínio enxuto. | Qualquer novo atributo precisa ser declarado conscientemente no DTO e mapeado em `BookMapper.kt`. |
| **6. Campos não-String anuláveis + `@field:NotNull` em `BookRequest`** | Tipos primitivos não-nulos (`Int`, `BookGenre`) sem nulabilidade no DTO | Permite que um JSON incompleto produza mensagens amigáveis por campo via Bean Validation (`VALIDATION_ERROR`) em vez de falha bruta de desserialização Jackson. | Requer operador `!!` seguro no `BookMapper.kt` após a barreira garantida pelo `@Valid`. |
| **7. Angular `21` *zoneless* com *Standalone Components* e *Signals*** | NgModules tradicionais com `zone.js` ou estado global NgRx | Padrão atual do Angular: elimina `AppModule`, reduz o bundle inicial (`464 kB` brutos) com `loadComponent` por rota e simplifica o estado reativo local (`loading`, `saving`, `items`, `token`). | Código mais conciso e testável diretamente com `Vitest` + `jsdom` em Node.js sem exigir Chrome Headless. |
| **8. Angular Material `21.2.14` com animações CSS nativas** | Componentes estilizados do zero ou pacote legado `@angular/animations` | Entrega tabela, *select*, diálogos modais acessíveis e *snackbars* consistentes; no Angular 21 o Material opera nativamente com CSS sem precisar de `@angular/animations`. | Conflito de árvore de pares do npm 10 resolvido fixando `21.2.14` para `material`/`cdk` e documentando `legacy-peer-deps=true` em `frontend/.npmrc`. |
| **9. Desativação de *font inlining* remoto e cache LMDB no `angular.json`** | Configuração padrão do CLI (busca `fonts.googleapis.com` durante o build) | Durante a compilação em ambientes isolados/offline, o *inlining* de fontes remotas e o mmap do LMDB causavam falha no `ng build`; ajustar `fonts: false` e `cache.enabled: false` tornou o build 100% determinístico offline. | As fontes Roboto/Material Icons continuam carregadas normalmente pelo navegador via `<link>` quando há rede, com *fallback* `sans-serif` local. |
| **10. Formulário único compartilhado (`BookFormComponent`)** | Duplicar HTML e `FormGroup` em `BookCreateComponent` e `BookEditComponent` | Centraliza os 12 controles, validadores e mapeamento de erros de servidor em um único arquivo, impedindo divergência de regras entre cadastro e edição. | Usa `input<Book | null>()` + `effect()` para hidratar os controles de forma segura assim que a resposta assíncrona do `GET /api/books/{id}` chega. |
| **11. Declaração de `books/new` antes de `books/:id` em `app.routes.ts`** | Ordem alfabética ou `:id` antes de `new` | Impede que a palavra `new` seja capturada como parâmetro `:id`, evitando chamadas inválidas `GET /api/books/new` (`400`). | Exige atenção ao adicionar futuras sub-rotas estáticas sob `/books`. |

---

## 12. Limitações e Melhorias Futuras

Apesar de cumprir integralmente os requisitos funcionais, arquiteturais e de segurança propostos, o sistema apresenta limitações conscientes típicas de um escopo acadêmico focado, organizadas abaixo em ordem de prioridade para evolução rumo a produção:

1. **Migrações versionadas de banco de dados (Flyway / Liquibase)**: substituir `spring.jpa.hibernate.ddl-auto: update` por scripts SQL versionados (`V1__create_tables.sql`), garantindo reprodutibilidade auditável de *schema* e *rollbacks* controlados em produção.
2. **Controle de taxa de requisições (*Rate Limiting*) e bloqueio progressivo no login**: adicionar filtro Bucket4j ou proxy reverso limitando tentativas por IP/usuário em `POST /api/auth/login` para mitigar ataques automatizados de força bruta.
3. **Renovação de sessão (*Refresh Token*) e revogação explícita**: combinar *access token* curto (ex.: 10–15 minutos) com *refresh token* rotativo persistido em banco e transportado em cookie `HttpOnly; Secure; SameSite=Strict`, reduzindo exposição a XSS e permitindo encerrar sessões remotamente.
4. **Módulo transacional de Empréstimos e Leitores (`Loan` / `Member`)**: evoluir do controle agregado de exemplares (`copiesAvailable`) para o registro nominal de retiradas, prazos de devolução, renovações e histórico por leitor.
5. **Autorização fina baseada em papéis (`@PreAuthorize`)**: diferenciar permissões entre `ROLE_ADMIN` (catalogar, editar e excluir obras) e `ROLE_USER` / voluntário de consulta (listar, detalhar e registrar movimentação de exemplares).
6. **Paginação e ordenação no servidor (`Pageable` + `PageResponse<BookResponse>`)**: atualmente `GET /api/books` retorna a lista completa filtrada, adequado para bibliotecas comunitárias de pequeno e médio porte (até poucos milhares de títulos), mas acervos maiores se beneficiam de paginação SQL (`LIMIT`/`OFFSET`) integrada ao `MatPaginator`.
7. **Suíte automatizada de testes E2E em navegador (Playwright)**: automatizar em pipeline CI os cenários visuais de clique, diálogo modal de exclusão e expiração de sessão em navegadores reais.
8. **Auditoria de autoria (`@CreatedBy` / `@LastModifiedBy`)**: gravar na tabela `books` qual operador realizou cada inclusão ou alteração a partir do `SecurityContext`.
9. **Empacotamento completo em contêineres (*Docker multi-stage* + Nginx + CI/CD)**: adicionar `Dockerfile` para o backend JVM e para o frontend Angular servido por Nginx com HTTPS/TLS e cabeçalhos `Content-Security-Policy` (CSP).
10. **Documentação interativa OpenAPI / Swagger UI (`springdoc-openapi`)**: expor especificação OpenAPI 3 gerada automaticamente com suporte a botão *Authorize Bearer*.

---

## 13. Glossário

- **API REST (*Representational State Transfer*)**: estilo arquitetural de comunicação HTTP baseado em recursos identificados por URLs (`/api/books`), verbos semânticos (`GET`, `POST`, `PUT`, `DELETE`) e representações JSON *stateless*.
- **BCrypt**: função de *hashing* criptográfico projetada para senhas baseada na cifra Blowfish, que embute *salt* aleatório por registro e fator de custo configurável para resistir a ataques por GPU.
- **Bearer Token**: esquema de autenticação HTTP (RFC 6750) no qual o portador apresenta a credencial no cabeçalho `Authorization: Bearer <token>`.
- **Bean Validation (Jakarta Validation)**: especificação declarativa usada no backend (`@NotBlank`, `@Min`, `@Size`, `@Valid`) para validar objetos de entrada antes da execução da lógica de negócio.
- **Claim**: par chave-valor contido no payload de um JWT (como `sub`, `iss`, `iat`, `exp` e `roles`) que transporta afirmações assinadas pelo emissor.
- **Controller**: componente da camada de entrada HTTP no Spring MVC (`@RestController`) encarregado de receber requisições, acionar serviços e devolver status e DTOs.
- **CORS (*Cross-Origin Resource Sharing*)**: mecanismo de segurança dos navegadores que controla quais origens externas (`http://localhost:4200`) podem consumir recursos de outra origem (`http://localhost:8080`) mediante cabeçalhos `Access-Control-Allow-*`.
- **CRUD (*Create, Read, Update, Delete*)**: conjunto das quatro operações fundamentais de manutenção persistente de registros (criar, ler/listar, atualizar e remover).
- **CSRF (*Cross-Site Request Forgery*)**: ataque em que uma página maliciosa induz o navegador do usuário a disparar requisições autenticadas automaticamente via cookies para outro domínio.
- **DTO (*Data Transfer Object*)**: classe dedicada exclusivamente ao transporte de dados na fronteira da API (`BookRequest`, `BookResponse`), isolando as entidades de banco de dados.
- **Guard (Angular Route Guard)**: função (`CanActivateFn`) executada pelo Angular Router antes de ativar uma rota para autorizar a navegação ou redirecionar o usuário (`authGuard`, `guestGuard`).
- **Hash e Salt**: transformação matemática unidirecional (*hash*) acrescida de valor aleatório único (*salt*) para impedir a reversão da senha original e neutralizar tabelas pré-calculadas.
- **Interceptor (`HttpInterceptorFn`)**: função intermediária no pipeline do `HttpClient` do Angular que inspeciona e transforma requisições de saída (anexando `Bearer`) e respostas de erro (`401`).
- **ISBN (*International Standard Book Number*)**: identificador numérico internacional padronizado de 10 ou 13 dígitos que individualiza edições de livros.
- **JPA (*Jakarta Persistence API*) e ORM (*Object-Relational Mapping*)**: especificação Java/Kotlin e técnica (implementada pelo Hibernate) que mapeia classes orientadas a objetos (`Book`, `AppUser`) para tabelas SQL relacionais (`books`, `app_users`).
- **JWT (*JSON Web Token*)**: formato compacto e autocontido definido na RFC 7519 para transmissão segura de informações assinadas digitalmente (aqui com HMAC-SHA256).
- **Reactive Forms**: abordagem de formulários do Angular em que o modelo de estado e as regras de validação são declarados explicitamente em TypeScript (`FormGroup`, `FormControl`, `Validators`).
- **Repository**: abstração de acesso a dados do Spring Data JPA (`JpaRepository`) que encapsula consultas e persistência sem expor detalhes JDBC ao serviço.
- **Service**: camada intermediária (`@Service`) onde residem regras de negócio (como unicidade de ISBN e limite de exemplares) e o controle transacional (`@Transactional`).
- **Signal (Angular Signal)**: primitiva reativa síncrona introduzida no Angular moderno para rastrear estado granular de interface e atualizar o DOM sem depender de `zone.js`.
- **Standalone Component**: componente Angular autossuficiente que declara diretamente suas dependências em `imports: [...]`, dispensando `NgModules`.
- **Stateless**: propriedade de uma API que não retém estado de sessão do cliente em memória entre duas requisições consecutivas, favorecendo escalabilidade e previsibilidade.
- **XSS (*Cross-Site Scripting*)**: vulnerabilidade na qual scripts maliciosos são injetados em páginas confiáveis para executar código no navegador de outros usuários.

---

## Apêndices

### Apêndice A — Árvore Completa de Arquivos Relevantes

| Caminho do Arquivo | Responsabilidade em Uma Linha |
|---|---|
| `README.md` | Guia rápido com descrição do projeto, comandos de subida, credenciais e testes. |
| `docker-compose.yml` | Orquestração do contêiner `postgres:16-alpine` com *healthcheck* e volume persistente `pgdata`. |
| `.env.example` | Modelo de variáveis de ambiente para banco, JWT, CORS e *seed* inicial. |
| `.gitignore` | Lista de diretórios e artefatos ignorados pelo controle de versão Git. |
| `docs/00-planejamento.md` | Documento de concepção inicial, contrato REST e diário de decisões arquiteturais. |
| `docs/DOCUMENTACAO.md` | Memorial técnico completo da aplicação validado contra o código-fonte. |
| `backend/build.gradle.kts` | Configuração de compilação Gradle Kotlin DSL, plugins Spring/JPA e dependências. |
| `backend/src/main/kotlin/com/biblioteca/BibliotecaApplication.kt` | Ponto de entrada `main` do Spring Boot com `@ConfigurationPropertiesScan`. |
| `backend/src/main/kotlin/com/biblioteca/config/JwtProperties.kt` | Propriedades tipadas `app.jwt.*` com trava de segurança exigindo segredo $\ge 32$ bytes. |
| `backend/src/main/kotlin/com/biblioteca/config/CorsConfig.kt` | Política CORS liberando a origem do Angular, métodos HTTP e cabeçalhos `Authorization`/`Location`. |
| `backend/src/main/kotlin/com/biblioteca/config/SecurityConfig.kt` | Cadeia *stateless* do Spring Security, BCrypt e configuração `NimbusJwtEncoder`/`NimbusJwtDecoder`. |
| `backend/src/main/kotlin/com/biblioteca/config/DataInitializer.kt` | Carga idempotente do usuário `admin` e das 10 obras iniciais em português. |
| `backend/src/main/kotlin/com/biblioteca/security/RestAuthenticationEntryPoint.kt` | Emissão direta de JSON `ApiError` `401` distinguindo `UNAUTHENTICATED`, `TOKEN_EXPIRED` e `TOKEN_INVALID`. |
| `backend/src/main/kotlin/com/biblioteca/security/RestAccessDeniedHandler.kt` | Emissão direta de JSON `ApiError` `403 FORBIDDEN` para falhas de autorização na cadeia de filtros. |
| `backend/src/main/kotlin/com/biblioteca/common/ApiError.kt` | Estrutura imutável padronizada de resposta de erro (`ApiError` e `FieldErrorDetail`). |
| `backend/src/main/kotlin/com/biblioteca/common/Exceptions.kt` | Exceções de domínio (`ResourceNotFoundException`, `ConflictException`, `BusinessValidationException`). |
| `backend/src/main/kotlin/com/biblioteca/common/GlobalExceptionHandler.kt` | `@RestControllerAdvice` centralizando o mapeamento de exceções para status HTTP e `ApiError`. |
| `backend/src/main/kotlin/com/biblioteca/user/AppUser.kt` | Entidade JPA `AppUser` (tabela `app_users`) e enumeração de perfis `Role`. |
| `backend/src/main/kotlin/com/biblioteca/user/AppUserRepository.kt` | Repositório Spring Data JPA para busca e checagem de existência por `username`. |
| `backend/src/main/kotlin/com/biblioteca/user/AppUserDetailsService.kt` | Adaptação de `AppUser` para `UserDetails` consumido pelo `AuthenticationManager`. |
| `backend/src/main/kotlin/com/biblioteca/auth/dto/AuthDtos.kt` | DTOs `LoginRequest` (validado) e `LoginResponse` (sem exposição de senha). |
| `backend/src/main/kotlin/com/biblioteca/auth/AuthService.kt` | Autenticação de credenciais e geração assinada do token JWT HS256. |
| `backend/src/main/kotlin/com/biblioteca/auth/AuthController.kt` | Endpoint público `POST /api/auth/login`. |
| `backend/src/main/kotlin/com/biblioteca/book/Book.kt` | Entidade JPA principal `Book` (tabela `books` com `uk_books_isbn`) e enum `BookGenre`. |
| `backend/src/main/kotlin/com/biblioteca/book/BookRepository.kt` | Repositório JPA com verificação de ISBN único e busca textual JPQL `search`. |
| `backend/src/main/kotlin/com/biblioteca/book/dto/BookDtos.kt` | DTOs `BookRequest` (com anotações `@field:`) e `BookResponse` (com indicador `available`). |
| `backend/src/main/kotlin/com/biblioteca/book/BookMapper.kt` | Funções de extensão convertendo `BookRequest` ↔ `Book` ↔ `BookResponse`. |
| `backend/src/main/kotlin/com/biblioteca/book/BookService.kt` | Regras de negócio transacionais e operações CRUD completas sobre o acervo. |
| `backend/src/main/kotlin/com/biblioteca/book/BookController.kt` | Endpoints protegidos `GET`, `POST`, `PUT` e `DELETE` sob `/api/books`. |
| `backend/src/main/resources/application.yml` | Configuração principal conectando ao PostgreSQL e definindo parâmetros JWT/CORS/seed. |
| `backend/src/main/resources/application-h2.yml` | Perfil alternativo com persistência em arquivo local (`./data/bibliotecadb`) sem Docker. |
| `backend/src/test/kotlin/com/biblioteca/auth/AuthControllerTest.kt` | Sete testes de integração MockMvc validando login, BCrypt, 401s e CORS. |
| `backend/src/test/kotlin/com/biblioteca/book/BookControllerTest.kt` | Sete testes de integração MockMvc cobrindo CRUD, busca, 400, 404 e 409. |
| `frontend/package.json` | Manifesto de dependências Angular 21, Angular Material 21 e Vitest. |
| `frontend/angular.json` | Configuração do compilador Angular, tema Material `azure-blue` e *runner* de testes. |
| `frontend/src/environments/environment.ts` | Definição centralizada de `apiUrl: 'http://localhost:8080/api'`. |
| `frontend/src/app/app.config.ts` | Registro global de rotas, `HttpClient` com `authInterceptor` e locale `pt-BR`. |
| `frontend/src/app/app.routes.ts` | Definição das rotas preguiçosas protegidas por `authGuard` e `guestGuard`. |
| `frontend/src/app/core/auth/auth.service.ts` | Gestão reativa de sessão JWT (`signal` + `localStorage` + verificação de `exp`). |
| `frontend/src/app/core/auth/auth.guard.ts` | Guardas funcionais `authGuard` (rotas privadas) e `guestGuard` (`/login`). |
| `frontend/src/app/core/auth/auth.interceptor.ts` | Inclusão automática de `Authorization: Bearer` e interceptação de `401`. |
| `frontend/src/app/core/services/notification.service.ts` | Exibição padronizada de *snackbars* de sucesso e erro. |
| `frontend/src/app/core/services/confirm.service.ts` | Abertura do diálogo modal de confirmação retornando `Observable<boolean>`. |
| `frontend/src/app/shared/components/confirm-dialog.component.ts` | Componente modal reutilizável para confirmação de exclusão. |
| `frontend/src/app/shared/utils/error-utils.ts` | Utilitários `extractErrorMessage`, `applyServerFieldErrors` e `controlErrorMessage`. |
| `frontend/src/app/layout/main-layout.component.ts` | Barra superior autenticada com navegação, usuário ativo e botão *"Sair"*. |
| `frontend/src/app/features/login/login.component.ts` | Tela de autenticação de operadores com tratamento de `returnUrl` seguro. |
| `frontend/src/app/features/books/book.model.ts` | Tipagens TypeScript `Book`, `BookPayload`, `BookGenre` e rótulos em português. |
| `frontend/src/app/features/books/book.service.ts` | Cliente HTTP encapsulando as cinco operações REST de `/api/books`. |
| `frontend/src/app/features/books/book-form.component.ts` | Formulário reativo compartilhado entre criação e edição de livros. |
| `frontend/src/app/features/books/book-list.component.ts` | Tela de listagem com busca reativa, tabela Material e exclusão confirmada. |
| `frontend/src/app/features/books/book-create.component.ts` | Tela de catalogação de novo livro no acervo. |
| `frontend/src/app/features/books/book-detail.component.ts` | Tela de visualização completa da ficha catalográfica e exclusão confirmada. |
| `frontend/src/app/features/books/book-edit.component.ts` | Tela de atualização cadastral carregando os dados prévios da obra. |
| `frontend/src/app/core/auth/*.spec.ts` e `book-form.component.spec.ts` | Suíte de testes unitários automatizados do frontend executada com Vitest. |

### Apêndice B — Coleção Reprodutível de Requisições `curl`

```bash
API="http://localhost:8080/api"
JSON_HDR="Content-Type: application/json"

# 1. Login válido (200 OK) e captura do token em variável de sessão
TOKEN=$(curl -s -X POST "$API/auth/login" -H "$JSON_HDR" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 2. Credenciais incorretas (401 INVALID_CREDENTIALS)
curl -i -X POST "$API/auth/login" -H "$JSON_HDR" -d '{"username":"admin","password":"senha-incorreta"}'

# 3. Acesso sem token (401 UNAUTHENTICATED) e token adulterado (401 TOKEN_INVALID)
curl -i "$API/books"
curl -i "$API/books" -H "Authorization: Bearer ${TOKEN}adulterado"

# 4. Listar acervo completo e filtrar por termo (200 OK)
curl -s "$API/books" -H "Authorization: Bearer $TOKEN"
curl -s "$API/books?q=Machado" -H "Authorization: Bearer $TOKEN"

# 5. Catalogar novo livro (201 Created + Location)
curl -i -X POST "$API/books" \
  -H "Authorization: Bearer $TOKEN" -H "$JSON_HDR" \
  -d '{
    "title": "Memórias Póstumas de Brás Cubas",
    "author": "Machado de Assis",
    "isbn": "978-85-359-1112-1",
    "publisher": "Companhia das Letras",
    "publicationYear": 1881,
    "genre": "ROMANCE",
    "copiesTotal": 4,
    "copiesAvailable": 4,
    "location": "Corredor A - Estante 1",
    "acquisitionDate": "2025-05-12",
    "synopsis": "Romance narrado pelo defunto-autor Brás Cubas.",
    "active": true
  }'

# 6. Testar conflito de ISBN (409 CONFLICT) e validação (400 VALIDATION_ERROR)
curl -i -X POST "$API/books" -H "Authorization: Bearer $TOKEN" -H "$JSON_HDR" \
  -d '{"title":"A","author":"","isbn":"123","publisher":"","publicationYear":1100,"copiesTotal":0,"copiesAvailable":-1,"location":""}'

# 7. Atualizar (200 OK), consultar (200 OK) e remover livro (204 No Content)
curl -i -X PUT "$API/books/11" -H "Authorization: Bearer $TOKEN" -H "$JSON_HDR" \
  -d '{
    "title": "Memórias Póstumas de Brás Cubas - 2ª Edição",
    "author": "Machado de Assis",
    "isbn": "978-85-359-1112-1",
    "publisher": "Companhia das Letras",
    "publicationYear": 1881,
    "genre": "ROMANCE",
    "copiesTotal": 4,
    "copiesAvailable": 3,
    "location": "Corredor A - Estante 2",
    "acquisitionDate": "2025-05-12",
    "synopsis": "Exemplar revisado.",
    "active": true
  }'
curl -i -X DELETE "$API/books/11" -H "Authorization: Bearer $TOKEN"
```

### Apêndice C — Configurações Comentadas e Variáveis de Ambiente

Trecho principal de `backend/src/main/resources/application.yml` explicando cada parâmetro externalizado:

```yaml
spring:
  application:
    name: biblioteca-api
  datasource:
    # Conexão padrão com o contêiner PostgreSQL definido em docker-compose.yml
    url: ${DB_URL:jdbc:postgresql://localhost:5432/bibliotecadb}
    username: ${DB_USER:app}
    password: ${DB_PASSWORD:app}
  jpa:
    hibernate:
      # Cria/atualiza tabelas preservando registros existentes entre reinícios
      ddl-auto: update
    # Desativa Open-Session-In-View para manter transações restritas à camada Service
    open-in-view: false

server:
  port: ${SERVER_PORT:8080}

app:
  jwt:
    # Segredo HMAC-SHA256 (>= 32 bytes); sobrescreva via variável JWT_SECRET fora de dev
    secret: ${JWT_SECRET:troque-este-segredo-de-desenvolvimento-0123456789}
    expiration-seconds: ${JWT_EXPIRATION_SECONDS:3600}
    clock-skew-seconds: ${JWT_CLOCK_SKEW_SECONDS:60}
    issuer: biblioteca-api
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:4200}
  seed:
    admin-username: ${SEED_ADMIN_USERNAME:admin}
    admin-password: ${SEED_ADMIN_PASSWORD:admin123}
    sample-data: ${SEED_SAMPLE_DATA:true}
```

| Variável de Ambiente | Valor Padrão (Dev) | Finalidade |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/bibliotecadb` | URL JDBC do banco relacional principal. |
| `DB_USER` / `DB_PASSWORD` | `app` / `app` | Credenciais de conexão ao PostgreSQL. |
| `SPRING_PROFILES_ACTIVE` | *(vazio — padrão PostgreSQL)* | Quando `h2`, ativa persistência em arquivo local (`./data/bibliotecadb`). |
| `SERVER_PORT` | `8080` | Porta TCP do servidor embutido Apache Tomcat. |
| `JWT_SECRET` | *(chave local de 49 bytes)* | Segredo simétrico HS256 (mínimo obrigatório de 32 bytes). |
| `JWT_EXPIRATION_SECONDS` | `3600` | Tempo de vida de cada token JWT emitido (em segundos). |
| `JWT_CLOCK_SKEW_SECONDS` | `60` | Tolerância de desvio de relógio na validação temporal do JWT. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | Lista separada por vírgulas de origens autorizadas pelo CORS. |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | `admin` / `admin123` | Usuário e senha iniciais criados idempotentemente na primeira subida. |
| `SEED_SAMPLE_DATA` | `true` | Controla o carregamento inicial dos 10 livros de demonstração. |

### Apêndice D — Referências Técnicas Oficiais

1. **IETF RFC 7519** — *JSON Web Token (JWT)*: https://datatracker.ietf.org/doc/html/rfc7519
2. **IETF RFC 6750** — *The OAuth 2.0 Authorization Framework: Bearer Token Usage*: https://datatracker.ietf.org/doc/html/rfc6750
3. **Spring Security Reference (6.5)** — *OAuth 2.0 Resource Server JWT*: https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
4. **Spring Boot Reference Documentation (3.5)** — *Kotlin Support & Spring Data JPA*: https://docs.spring.io/spring-boot/index.html
5. **Jakarta Bean Validation 3.0 Specification**: https://jakarta.ee/specifications/bean-validation/3.0/
6. **Angular Official Documentation (v21)** — *Standalone Components, Signals, Routing & HttpClient Interceptors*: https://angular.dev/overview
7. **Angular Material Official Components (v21)**: https://material.angular.dev/
