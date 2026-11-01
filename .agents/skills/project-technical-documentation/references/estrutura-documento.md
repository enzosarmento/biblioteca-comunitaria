# Estrutura do documento, seção por seção

Use exatamente estes títulos de nível 2 (`##`), numerados. O validador procura as palavras-chave (Resumo, Problema, Público, Funcionalidades, Requisitos, Arquitetura, Modelo de dados, Backend, Segurança, Frontend, Como executar, Testes, Decisões, Limitações, Glossário, Rastreabilidade). Abaixo, o que cada seção deve conter e a fonte dos fatos.

---

## Capa / Identificação (antes da seção 1)

Título do projeto, tema, disciplina/curso, equipe (nomes), data, versão do documento, repositório. Colete equipe e disciplina na fase de intake. Se o usuário não informar, omita esses campos da capa em vez de deixar marcador de rascunho (o validador reprova "a definir", "[inserir...]" etc.) e registre na resposta final que a capa ficou sem identificação da equipe.

---

## 1. Resumo

Um parágrafo (120 a 180 palavras): o que é o sistema, para quem, tecnologias, o que foi entregue e o resultado da verificação. Quem ler só isto deve entender o projeto.

## 2. Problema, público-alvo e funcionalidades

Exigência explícita do enunciado.
- **Problema**: situação concreta, quem sofre com ela, consequência de não resolver. 2 a 3 parágrafos.
- **Público-alvo**: perfis de usuário, contexto de uso, nível técnico esperado. Pode ser uma tabela (perfil, necessidade, como o sistema ajuda).
- **Funcionalidades propostas**: tabela com ID (F-01...), nome, descrição, tela(s) e endpoint(s) correspondentes. Separe "implementadas" de "propostas para evolução".
- **Escopo**: o que o sistema deliberadamente não faz.

## 3. Requisitos e rastreabilidade

- Requisitos funcionais e não funcionais do sistema (nos termos do tema).
- **Matriz de rastreabilidade**: uma linha para **cada** ID de `requisitos.md` (R-GE-01 a R-DO-05), com: requisito, onde foi implementado (arquivo/classe/rota), como foi verificado (teste, comando, checklist) e situação (Atendido/Parcial/Não verificado). Esta matriz é a evidência de que o enunciado foi coberto; preencha com precisão.

## 4. Arquitetura

- Visão geral em três camadas (navegador/Angular → API Spring Boot → PostgreSQL) e o porquê da separação.
- Diagrama de componentes (Mermaid `flowchart`).
- Estrutura de pastas do repositório e de cada módulo (árvore comentada).
- Tecnologias e versões (tabela com versão **lida do build**, não da memória): Angular, Material, Node, Spring Boot, Kotlin, Java, Gradle, PostgreSQL, bibliotecas relevantes.
- Fluxo de uma requisição típica, do clique ao banco e de volta, em passos numerados.

## 5. Modelo de dados

- Diagrama ER (Mermaid `erDiagram`) com entidades, campos, chaves e cardinalidades.
- Tabela por entidade: campo, tipo Kotlin, coluna/tipo SQL, restrições (not null, unique, tamanho), regra de validação associada.
- Explique escolhas: enum como string, `BigDecimal` para dinheiro, `app_users` em vez de `user`, hash em vez de senha, timestamps.
- Como o schema é criado (`ddl-auto=update`) e por que os dados persistem (volume do Docker). Mencione a limitação sobre migrações.

## 6. Backend (API REST)

6.1 **Camadas**: responsabilidade de controller, service, repository, DTO, mapper; mostre um exemplo real do fluxo `POST` atravessando as camadas (trechos curtos).
6.2 **Endpoints**: tabela completa (método, caminho, autenticação, descrição, request, response, status possíveis). Cada endpoint da tabela deve existir no código. Use o formato `` `GET /api/products/{id}` `` para o validador conseguir cruzar.
6.3 **Exemplos reais**: requisição e resposta capturadas (curl) de login, criação, erro de validação, 404, 409. Trunque tokens.
6.4 **Validação**: tabela campo → regras → mensagem; explique o `@field:` no Kotlin e a escolha de tipos anuláveis + `@NotNull`.
6.5 **Tratamento de erros**: formato `ApiError`, tabela de `code` → status → quando ocorre → como o frontend reage; o papel do `@RestControllerAdvice`; por que 401/403 são escritos no entry point/handler.
6.6 **Persistência**: repositories, consultas customizadas, transações (`@Transactional(readOnly = true)`), regras de negócio no service (unicidade etc.).
6.7 **Seed**: o que é semeado, quando, e como desativar.

## 7. Segurança e autenticação JWT

Seção mais cobrada: seja minucioso.
- **Fluxo completo** (diagrama de sequência Mermaid): login → validação de credenciais → emissão do JWT → armazenamento → envio do Bearer → validação → resposta; mais os ramos de erro (credenciais erradas, token expirado, inválido).
- **Anatomia do JWT**: header, payload (claims usados: `sub`, `iss`, `iat`, `exp`, `roles`), assinatura HS256; explique que o token é assinado, não criptografado, então não guarda dados sensíveis.
- **Configuração do Spring Security**: stateless, CSRF desabilitado e por quê, rotas públicas vs protegidas, CORS, resource server (decoder valida assinatura e expiração), converter de papéis.
- **Senhas**: BCrypt (hash com salt e custo adaptativo), onde é aplicado, que nunca volta em resposta (cite o DTO), mensagem única para usuário inexistente/senha errada e a razão (enumeração de usuários).
- **Expiração e segredo**: duração configurável, variável `JWT_SECRET`, regra de tamanho mínimo, risco do segredo padrão de desenvolvimento.
- **Tratamento de falhas**: tabela `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `FORBIDDEN` com exemplo de resposta.
- **No frontend**: onde o token fica, interceptor, guard, tratamento de 401, logout; discussão de `localStorage` vs cookie `HttpOnly` (XSS vs CSRF).
- **Ameaças consideradas e mitigações** (tabela curta): força bruta (limitação: sem rate limit), XSS, token vazado, segredo fraco, enumeração de usuários.

## 8. Frontend (Angular)

- Organização das pastas (`core`, `shared`, `features`, `layout`).
- **Mapa de rotas**: tabela caminho → componente → guard → função. Diagrama de navegação (Mermaid `flowchart`) entre as páginas.
- **Cada página**: finalidade, o que mostra, ações disponíveis, serviços chamados, validações, mensagens (use descrição textual e, se houver, capturas em `docs/img/`).
- **Serviços**: `AuthService`, serviço do recurso, `NotificationService`, `ConfirmService`: métodos e responsabilidades.
- **Guards e interceptor**: código resumido e comportamento nos casos limite.
- **Formulários**: quais validadores, como as mensagens de erro são geradas, como erros do servidor (400/409) voltam aos campos.
- **Feedback ao usuário**: tabela operação → mensagem de sucesso → mensagem de erro.
- **Confirmação de exclusão** e **logout**: como funcionam.
- Responsividade e acessibilidade (rótulos, `role="alert"`, foco) em poucas linhas.

## 9. Como executar

Passo a passo testado do zero, com comandos exatos:
1. Pré-requisitos com versões (Docker, JDK, Node, Angular CLI).
2. Clonar, configurar `.env`/variáveis.
3. Subir banco (`docker compose up -d`).
4. Subir backend (`./gradlew bootRun`) e URL/porta.
5. Subir frontend (`npm ci && ng serve`) e URL.
6. Credenciais de teste (usuário e senha de desenvolvimento).
7. Parar/reiniciar sem perder dados; como apagar os dados (`docker compose down -v`).
8. Problemas comuns e soluções (porta ocupada, CORS, banco indisponível, segredo curto).

Se algum passo não foi executado por você, diga qual.

## 10. Testes e validação

- Estratégia (o que é testado em cada camada e por quê).
- Como rodar (comandos) e **resultado real**: contagem de testes que passaram, build.
- Tabela de cenários (do roteiro e2e e do checklist do frontend): cenário, entrada, resultado esperado, resultado obtido, status.
- Resultado do verificador estático (`N ok, N avisos, N falhas`).
- O que não foi testado (e2e automatizado, carga, segurança avançada).

## 11. Decisões técnicas

Tabela ou subseções "Decisão → Alternativas → Motivo → Consequência". Mínimo: Kotlin com Spring, JWT via resource-server, HS256 vs RS256, PostgreSQL com volume, DTO + mapper, Material, localStorage, `ddl-auto=update`, tipos anuláveis nos DTOs, ordem das rotas. Aproveite o diário de `00-planejamento.md`.

## 12. Limitações e melhorias futuras

Lista honesta e priorizada: refresh token, rate limiting/bloqueio de login, Flyway, paginação no servidor (se não feita), testes e2e (Playwright/Cypress), HTTPS/hardening, papéis e permissões finos, auditoria, deploy (Docker multi-stage, CI), internacionalização, observabilidade.

## 13. Glossário

Termos usados (JWT, claim, Bearer, DTO, CRUD, JPA, ORM, Repository, Service, Controller, BCrypt, hash, salt, CORS, CSRF, XSS, stateless, guard, interceptor, standalone component, Reactive Forms, signal, ProblemDetail se usado), cada um com definição de 1 a 2 linhas no contexto do projeto.

## Apêndices

A. Árvore completa de arquivos relevantes com 1 linha de explicação cada.
B. Coleção de requisições curl (do roteiro e2e).
C. Configurações (`application.yml` comentado, variáveis de ambiente).
D. Referências (documentação oficial de Spring Security, Spring Data JPA, Angular, RFC 7519 para JWT).

---

## Checklist final antes de entregar

- [ ] Todas as seções acima presentes e com conteúdo substantivo.
- [ ] ≥ 3 diagramas Mermaid (arquitetura, ER, sequência do login) renderizam sem erro de sintaxe.
- [ ] Cada endpoint e rota do código está documentado, e nenhum documentado deixa de existir.
- [ ] Matriz de rastreabilidade com todos os IDs R-*.
- [ ] Exemplos de requisição/resposta realmente executados.
- [ ] Versões lidas do `build.gradle.kts` e `package.json`.
- [ ] `check_docs.py` sem `[ERRO]`.
- [ ] Nenhum token completo, segredo real ou marcador de rascunho.
