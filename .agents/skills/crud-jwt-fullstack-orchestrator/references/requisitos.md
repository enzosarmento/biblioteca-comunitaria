# Requisitos do trabalho, decompostos em itens verificáveis

Cada linha é um critério de aceite. A coluna "Como evidenciar" diz o que mostrar no código, em testes ou na documentação. O verificador (`fullstack-requirements-verification`) e a matriz de rastreabilidade da documentação usam estes IDs.

## Geral (R-GE)

| ID | Requisito | Como evidenciar |
|---|---|---|
| R-GE-01 | Tema representa uma necessidade concreta | Seção "Problema" na documentação |
| R-GE-02 | Descrição do problema, público-alvo e funcionalidades propostas | Seção 2 da documentação |
| R-GE-03 | Frontend Angular integrado a API REST Spring Boot | Fluxo e2e funcionando |
| R-GE-04 | Dados exibidos no frontend vêm da API e do banco | Nenhum array de dados fixo no Angular; seed fica no backend |

## Frontend Angular (R-FE)

| ID | Requisito | Como evidenciar |
|---|---|---|
| R-FE-01 | Login + pelo menos 4 páginas funcionais distintas (listagem, cadastro, detalhes, edição) com navegação entre elas | `app.routes.ts` com 5 rotas de componente |
| R-FE-02 | Login autentica de verdade no backend (sem simulação) | `AuthService.login` faz POST `/api/auth/login` |
| R-FE-03 | Usa Angular Router | Rotas, `routerLink`, `Router.navigate` |
| R-FE-04 | Consome a API por serviços Angular | Serviços `@Injectable` com `HttpClient`; componentes não chamam `HttpClient` direto |
| R-FE-05 | Valida formulários com mensagens de erro compreensíveis | Reactive Forms + `Validators` + textos em português por tipo de erro |
| R-FE-06 | Exibe mensagens de sucesso ou falha nas operações | Snackbar/toast em criar, editar, excluir e erros de API |
| R-FE-07 | Pede confirmação antes de excluir | Diálogo de confirmação (nunca excluir direto no clique) |
| R-FE-08 | Protege rotas que exigem autenticação | `canActivate` com guard funcional em todas as rotas, menos login |
| R-FE-09 | Opção de sair do sistema | Botão "Sair" visível no layout autenticado; limpa token e volta ao login |
| R-FE-10 | Envia `Authorization: Bearer <token>` nas requisições protegidas | Interceptor HTTP |
| R-FE-11 | Trata token expirado/inválido e credenciais incorretas | Interceptor trata 401 (logout + aviso); login mostra "usuário ou senha inválidos" |

## Backend Spring Boot (R-BE)

| ID | Requisito | Como evidenciar |
|---|---|---|
| R-BE-01 | CRUD completo da entidade principal (criar, listar, buscar por id, atualizar, excluir) | Controller com 5 operações e testes |
| R-BE-02 | CRUD de usuários isolado não conta como principal | A entidade principal é do domínio do tema |
| R-BE-03 | Separação em controllers, services e repositories | Pacotes e classes separados; controller sem regra de negócio |
| R-BE-04 | DTOs em entradas e saídas | Entidades JPA nunca aparecem em assinaturas de controller |
| R-BE-05 | Validação dos dados recebidos | Bean Validation (`@field:NotBlank` etc.) + `@Valid` |
| R-BE-06 | Códigos HTTP adequados | 201 + Location no POST, 200, 204 no DELETE, 400, 401, 403, 404, 409 |
| R-BE-07 | Trata dados inválidos e registros não encontrados | `@RestControllerAdvice` com corpo de erro padronizado |
| R-BE-08 | Banco relacional com Spring Data JPA | Entidades `@Entity`, repositories `JpaRepository` |
| R-BE-09 | Persiste usuários e registros da aplicação | Tabelas de usuários e da entidade principal |
| R-BE-10 | Dados sobrevivem a reinício do backend | PostgreSQL com volume (ou H2 em arquivo); nunca H2 em memória; ddl-auto sem `create`/`create-drop` |
| R-BE-11 | Spring Security + JWT com expiração | Login devolve JWT com `exp`; configuração de expiração |
| R-BE-12 | Backend valida o token antes de liberar recursos | Cadeia de segurança com `anyRequest().authenticated()` e validação de JWT |
| R-BE-13 | Senhas com hash BCrypt | `BCryptPasswordEncoder`; coluna guarda hash |
| R-BE-14 | Senha nunca devolvida pela API | DTOs de resposta sem campo de senha |
| R-BE-15 | Trata credenciais incorretas e token inválido/expirado | 401 com JSON claro e códigos `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `TOKEN_INVALID` |
| R-BE-16 | CORS permitindo o frontend | Configuração de CORS para a origem do Angular |

## Documentação (R-DO)

| ID | Requisito | Como evidenciar |
|---|---|---|
| R-DO-01 | Documento detalhado explicando tudo | `docs/DOCUMENTACAO.md` aprovado por `check_docs.py` |
| R-DO-02 | Problema, público-alvo e funcionalidades | Seção 2 |
| R-DO-03 | Arquitetura, modelo de dados, API, segurança, frontend | Seções 4 a 8 |
| R-DO-04 | Como executar e testar | Seções 9 e 10, comandos reais |
| R-DO-05 | Rastreabilidade requisito → implementação | Matriz na seção 3 |
