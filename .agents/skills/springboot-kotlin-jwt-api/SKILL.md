---
name: springboot-kotlin-jwt-api
description: Constrói uma API REST em Spring Boot com Kotlin, com CRUD completo de uma entidade principal, camadas controller/service/repository, DTOs, Bean Validation, tratamento global de erros, Spring Data JPA com PostgreSQL persistente, Spring Security stateless com JWT (expiração, BCrypt, 401 JSON para credencial errada, token inválido ou expirado), CORS para Angular, seed de usuário admin e testes com MockMvc. Use sempre que a tarefa envolver backend em Spring Boot/Kotlin, API REST, login JWT, Spring Security, Spring Data JPA, DTOs em Kotlin ou "backend do trabalho", mesmo que o usuário não cite todos esses termos. Spring Boot Kotlin REST API JWT CRUD JPA.
---

# Backend: Spring Boot + Kotlin + JWT

Objetivo: uma API que cumpra os itens `R-BE-*` de `crud-jwt-fullstack-orchestrator/references/requisitos.md`. Os templates completos estão em `references/`; esta página traz o fluxo, as regras e as armadilhas específicas de Kotlin.

Leia antes de codar:
- `references/build-e-infra.md`: Gradle, `application.yml`, docker compose, `.env.example`.
- `references/templates-kotlin.md`: código de segurança, JWT, exceções, entidade, DTO, service, controller, seed, testes.

## Versões e compatibilidade

Os templates miram **Spring Boot 3.5.x, Kotlin 2.x, Java 21, Spring Security 6.5**. Prefira gerar o esqueleto pelo Spring Initializr (`start.spring.io`) quando houver rede; sem rede, escreva `build.gradle.kts` a partir do template e use as últimas versões estáveis que conhecer.

Se o projeto usar Spring Boot 4.x (Spring Security 7, Jackson 3), os conceitos não mudam, mas imports e starters de teste sim (pacotes `tools.jackson`, starters de teste modulares, `@MockitoBean`). Nesse caso ajuste os templates e confirme na documentação oficial em vez de copiar às cegas.

## Decisão de JWT: resource server do Spring Security

Use `spring-boot-starter-oauth2-resource-server` (Nimbus) com chave simétrica HS256. Motivo: assinatura, `exp` e parsing são validados pelo framework testado, em vez de um filtro próprio onde erros sutis de segurança são comuns; e há menos código para explicar. O login emite o token com `JwtEncoder`. Registre a decisão no diário e explique na documentação. (Alternativa aceitável: `jjwt` + `OncePerRequestFilter`; se o usuário preferir, use e trate o erro de expiração gerando `TOKEN_EXPIRED`.)

## Estrutura de pacotes

```
com.<grupo>.<app>/
├── <App>Application.kt
├── config/          JwtProperties, SecurityConfig, CorsConfig, DataInitializer
├── security/        RestAuthenticationEntryPoint, RestAccessDeniedHandler
├── auth/            AuthController, AuthService, dto/LoginRequest, dto/LoginResponse
├── user/            AppUser, Role, AppUserRepository, AppUserDetailsService
├── <domain>/        Entity, Repository, Service, Controller, dto/, Mapper.kt
└── common/          ApiError, exceptions, GlobalExceptionHandler, PageResponse (opcional)
```

Controller só traduz HTTP; regra de negócio e transações ficam no service; repository só acessa dados. Quem estiver lendo o controller não deve ver `if` de regra de negócio nem entidade JPA.

## Fluxo de trabalho

1. **Esqueleto**: projeto Gradle, plugins `kotlin("plugin.spring")` e `kotlin("plugin.jpa")`, dependências (ver `build-e-infra.md`), `docker-compose.yml` com PostgreSQL e volume, `application.yml`.
2. **Segurança primeiro**: `JwtProperties`, `SecurityConfig`, handlers 401/403, `AppUser`, `AppUserDetailsService`, `AuthService`, `AuthController`, `DataInitializer` (admin). Teste login com curl antes de seguir.
3. **Domínio**: entidade, repository, DTOs, mapper, service, controller para a entidade principal definida no contrato.
4. **Erros**: `GlobalExceptionHandler` + `ApiError`; confira cada código HTTP do contrato.
5. **Testes**: `AuthControllerTest`, `<Domain>ControllerTest` (veja template). Rode `./gradlew test`.
6. **Execução real**: `docker compose up -d`, `./gradlew bootRun`, percorra o roteiro e2e; reinicie o backend e confirme que os dados continuam lá (R-BE-10).

## Regras do contrato HTTP

| Operação | Sucesso | Erros |
|---|---|---|
| `POST /api/auth/login` | 200 + `LoginResponse` | 400 corpo inválido; 401 `INVALID_CREDENTIALS` |
| `GET /api/<recurso>` | 200 lista (ou página) | 401 |
| `GET /api/<recurso>/{id}` | 200 | 401, 404 |
| `POST /api/<recurso>` | **201** + cabeçalho `Location` + corpo criado | 400, 401, 409 |
| `PUT /api/<recurso>/{id}` | 200 + corpo atualizado | 400, 401, 404, 409 |
| `DELETE /api/<recurso>/{id}` | **204** sem corpo | 401, 404 |

Corpo de erro padronizado (`ApiError`): `timestamp`, `status`, `code`, `message`, `path`, `fieldErrors[]` (`field`, `message`). O `code` é estável e legível por máquina (`VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `UNAUTHENTICATED`, `FORBIDDEN`, `INTERNAL_ERROR`); o Angular usa `code` para decidir comportamento e `message` para mostrar ao usuário. Mensagens em português.

## Armadilhas de Kotlin com Spring/JPA (por que importam)

- **Entidades JPA não podem ser `data class`**: `equals/hashCode/toString` gerados quebram proxies do Hibernate e podem disparar lazy loading. Use `class` comum com `var` para campos editáveis.
- **Plugins `kotlin-spring` e `kotlin-jpa`** são obrigatórios: o primeiro abre classes anotadas (Kotlin é `final` por padrão, e o Spring precisa criar proxies para `@Transactional`/`@Configuration`); o segundo gera o construtor sem argumentos exigido pelo JPA.
- **Id como `Long? = null`** (gerado pelo banco), nunca `0L`.
- **Anotações de validação em DTOs precisam de use-site target**: escreva `@field:NotBlank val name: String`. Sem `@field:`, a anotação pode ir para o parâmetro do construtor e a validação silenciosamente não acontece, e o teste de 400 falha sem explicação.
- **`jackson-module-kotlin` e `kotlin-reflect`** são necessários para desserializar data classes sem construtor padrão e respeitar nulabilidade.
- **Tipos monetários**: `BigDecimal` com `@Column(precision = 12, scale = 2)`, nunca `Double`.
- **Nulabilidade como contrato**: campo opcional no DTO é `String? = null`; campo obrigatório é não-nulo mais `@field:NotBlank`/`@field:NotNull`. Um JSON sem campo obrigatório vira 400 (`HttpMessageNotReadableException` tratada no handler).
- **`findByIdOrNull`** (de `org.springframework.data.repository.findByIdOrNull`) em vez de `Optional`.

## Segurança: checklist que não pode falhar

- Sessão `STATELESS`, CSRF desabilitado (API sem cookie de sessão), CORS explícito com a origem do Angular (`http://localhost:4200`) vinda de configuração.
- Somente `POST /api/auth/login` (e health, se houver) em `permitAll()`; `anyRequest().authenticated()`.
- `PasswordEncoder` = `BCryptPasswordEncoder`; a coluna guarda o hash (`passwordHash`); nenhum DTO de resposta contém senha; nenhum log imprime senha ou token.
- Segredo JWT ≥ 32 bytes, lido de `JWT_SECRET`; a aplicação falha ao iniciar se for curto. O padrão de desenvolvimento no `application.yml` é marcado como inseguro e documentado.
- Mensagem de login errado é **a mesma** para usuário inexistente e senha errada (evita enumeração de usuários).
- 401 e 403 devolvem JSON no formato `ApiError`, não a página HTML padrão nem corpo vazio. Exceções lançadas dentro da cadeia de filtros não passam pelo `@RestControllerAdvice`, por isso o `AuthenticationEntryPoint` e o `AccessDeniedHandler` escrevem o JSON diretamente.
- Token expirado vs inválido: o entry point inspeta a causa (mensagem "expired") e devolve `TOKEN_EXPIRED` ou `TOKEN_INVALID`; ausência de token vira `UNAUTHENTICATED`.

## Persistência

- PostgreSQL com volume nomeado no docker compose → dados sobrevivem a reinícios (R-BE-10). H2 **em memória não atende**. Se o usuário não quiser Docker, use H2 em arquivo (`jdbc:h2:file:./data/appdb`) e documente.
- `spring.jpa.hibernate.ddl-auto=update` é aceitável no trabalho; **nunca** `create`/`create-drop` fora dos testes. Registre na documentação que, em produção, o ideal é Flyway/Liquibase (limitação conhecida).
- `spring.jpa.open-in-view=false`, para não esconder lazy loading no controller.
- Seed idempotente: só cria admin se não existir; dados de exemplo apenas quando a tabela estiver vazia.

## Definição de pronto (backend)

- [ ] `./gradlew build` e `./gradlew test` passam (ou o motivo de não rodar está declarado).
- [ ] Login correto retorna token com `exp`; login errado retorna 401 `INVALID_CREDENTIALS`.
- [ ] Sem token → 401; token adulterado → 401 `TOKEN_INVALID`; token expirado → 401 `TOKEN_EXPIRED` (teste com expiração curta em perfil de teste).
- [ ] CRUD com 201/200/204/400/404/409 conforme tabela.
- [ ] Reiniciar o backend mantém usuários e registros.
- [ ] Nenhuma resposta contém `password`/`passwordHash`.
- [ ] CORS permite o Angular, inclusive o pré-voo `OPTIONS` com `Authorization`.
- [ ] Lista de endpoints final copiada para `docs/00-planejamento.md` (a documentação usa).

## Extras (somente depois de tudo acima verde)

Paginação e busca no servidor (`PageResponse<T>` próprio, pois serializar `PageImpl` direto não é suportado de forma estável), `springdoc-openapi` para Swagger UI, papéis (`ADMIN` pode excluir, `USER` não) com `@PreAuthorize`, registro de usuário com `POST /api/auth/register`, Flyway.
