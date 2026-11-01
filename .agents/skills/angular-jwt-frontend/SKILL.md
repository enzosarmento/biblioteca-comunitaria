---
name: angular-jwt-frontend
description: Constrói o frontend Angular de uma aplicação CRUD autenticada por JWT contra uma API REST real (Spring Boot), com página de login e pelo menos 4 páginas (listagem, cadastro, detalhes, edição), Angular Router, guards de rota, interceptor Authorization Bearer, serviços HttpClient, Reactive Forms com validação e mensagens em português, snackbars de sucesso/erro, diálogo de confirmação de exclusão, logout e tratamento de token expirado. Use sempre que a tarefa envolver Angular com login/JWT, telas de CRUD, guards, interceptors, formulários reativos ou "frontend do trabalho", mesmo que o usuário não detalhe os requisitos. Angular standalone Material JWT CRUD frontend.
---

# Frontend: Angular + JWT

Objetivo: cumprir os itens `R-FE-*` de `crud-jwt-fullstack-orchestrator/references/requisitos.md`, consumindo o contrato definido em `docs/00-planejamento.md`. Código-base completo em `references/templates-angular.md`: leia antes de começar.

## Decisões padrão

| Tema | Escolha | Motivo |
|---|---|---|
| Arquitetura | Standalone components (sem NgModules), `loadComponent` nas rotas | Padrão atual do Angular; menos boilerplate |
| Estado | Signals para estado local de tela; sem NgRx | CRUD simples não justifica store global |
| Formulários | Reactive Forms tipados | Validação explícita e testável |
| UI | Angular Material (`ng add @angular/material`) | Snackbar, diálogo, tabela e campos de formulário prontos e acessíveis |
| HTTP | `provideHttpClient(withInterceptors([...]))` + serviços | Exigência R-FE-04; componentes nunca chamam `HttpClient` |
| Token | `localStorage` + `signal` | Simples e suficiente aqui; registre na documentação o trade-off de XSS (alternativa: cookie `HttpOnly`, que exigiria mudar o backend) |
| URL da API | `environment.apiUrl` | Evita URL espalhada pelo código |

Se Angular Material não puder ser instalado, implemente `NotificationService` e `ConfirmService` com componentes próprios simples mantendo as mesmas interfaces, para que o resto do código não mude.

Siga o que o Angular CLI instalado gerar (nomes de arquivo `app.ts` vs `app.component.ts`, runner de testes). Os templates usam nomes descritivos; adapte aos do CLI e mantenha consistência.

## Estrutura

```
src/app/
├── core/
│   ├── auth/           auth.service.ts, auth.guard.ts, auth.interceptor.ts
│   ├── models/         auth.model.ts, api-error.model.ts
│   └── services/       notification.service.ts, confirm.service.ts
├── shared/
│   ├── components/     confirm-dialog.component.ts
│   └── utils/          error-utils.ts (mensagens de API e de formulário)
├── layout/             main-layout.component.ts (toolbar + Sair + router-outlet)
├── features/
│   ├── login/          login.component.ts
│   └── products/       product.model.ts, product.service.ts,
│                       product-list / product-form / product-create / product-detail / product-edit
├── app.config.ts
└── app.routes.ts
environments/environment.ts   (gere com `ng generate environments`)
```
Troque `products` pelo recurso real.

## Mapa de rotas (cinco telas = login + 4 páginas)

| Rota | Página | Guard |
|---|---|---|
| `/login` | Login | `guestGuard` (usuário logado vai para a lista) |
| `/products` | Listagem, com busca, links para detalhes/editar, botão excluir | `authGuard` (na rota-pai) |
| `/products/new` | Cadastro | idem |
| `/products/:id` | Detalhes | idem |
| `/products/:id/edit` | Edição | idem |
| `**` | redireciona para `/products` | n/a |

Declare `products/new` **antes** de `products/:id`: o Router escolhe a primeira rota que casa, e `new` seria interpretado como um id.

Cadastro e edição compartilham `ProductFormComponent`. Isso garante validação idêntica nas duas telas e evita duplicar template.

## Fluxo de trabalho

1. `ng new` (CSS/SCSS, sem SSR), `ng add @angular/material`, `ng generate environments`.
2. `core/`: modelos, `AuthService`, interceptor, guards, `NotificationService`, `ConfirmService`; configure `app.config.ts`.
3. `login` e `layout`; teste o login contra o backend real (com `docker compose` + `bootRun` no ar) antes de continuar.
4. Serviço do recurso, depois listagem → cadastro → detalhes → edição, testando cada uma no navegador/curl contra a API.
5. Validações e mensagens; estados de carregamento e vazio; confirmação de exclusão.
6. Testes (`ng test --watch=false`), `ng build`, revisão da checklist.

## Regras que o enunciado cobra (e como cumprir)

- **Login real (R-FE-02)**: `AuthService.login` faz `POST {apiUrl}/auth/login`. Proibido comparar usuário/senha no Angular ou usar `of({...})`. Guarde apenas o token e dados não sensíveis (usuário, perfil, expiração). Nunca guarde a senha.
- **Guard (R-FE-08)**: `canActivate` na rota-pai das páginas protegidas. O guard confere token **e expiração** (decodifica o `exp` do JWT); se faltar ou vencer, redireciona a `/login?returnUrl=...`.
- **Interceptor (R-FE-10)**: adiciona `Authorization: Bearer <token>` só em chamadas para `environment.apiUrl` e nunca no `/auth/login` (não vaze token para terceiros).
- **401 (R-FE-11)**: o interceptor, ao receber 401 em rota protegida **com token presente**, limpa a sessão, mostra "Sua sessão expirou..." e vai ao login. Checar o token no momento da resposta evita várias notificações quando várias requisições falham juntas. 401 do próprio login é tratado na tela de login ("Usuário ou senha inválidos.").
- **Validação (R-FE-05)**: `Validators` equivalentes às regras do backend (obrigatório, tamanhos, mínimos). Mostre erros quando o campo foi tocado **ou** ao tentar enviar (`markAllAsTouched()`). Mensagens em português, específicas por tipo de erro ("O nome deve ter pelo menos 3 caracteres"), nunca "invalid" ou códigos. O backend continua sendo a autoridade: erros 400 com `fieldErrors` são mapeados para os campos correspondentes (`applyServerFieldErrors`) e 409 vira mensagem clara.
- **Feedback (R-FE-06)**: toda operação de escrita mostra sucesso ("Produto cadastrado com sucesso.") ou falha com a `message` da API; falha de rede (status 0) tem texto próprio.
- **Confirmação (R-FE-07)**: excluir passa por `ConfirmService.ask(...)`, com título, texto citando o nome do registro e botões "Cancelar"/"Excluir". Vale na listagem e nos detalhes.
- **Sair (R-FE-09)**: botão "Sair" visível em todas as páginas autenticadas (toolbar do layout); limpa sessão e navega para `/login`.
- **Dados da API (R-GE-04)**: nenhuma lista fixa de registros no Angular. Opções de enum (categorias) podem ser constantes locais, pois fazem parte do contrato.

## UX mínima que evita bugs e pontos perdidos

- Estado de carregamento visível (barra/spinner) e botão de enviar desabilitado enquanto salva (evita duplo envio); `finalize` desliga o estado em sucesso e erro.
- Estado vazio na listagem ("Nenhum produto encontrado") e estado de erro com botão "Tentar novamente".
- Em detalhes/edição, 404 → aviso "Registro não encontrado" e retorno à lista.
- Campos opcionais vazios são enviados como `null`, não como `""` (o backend trata `""` como valor).
- Campos de data: `<input type="date">` produz `YYYY-MM-DD`, o formato que a API espera, e dispensa adaptadores de data.
- Valores monetários e datas exibidos com pipes (`currency:'BRL'`, `date:'dd/MM/yyyy'`); para isso registre o locale `pt-BR` (`registerLocaleData` + `LOCALE_ID`).
- Rótulos (`<mat-label>`) em todos os campos, botões com texto claro, foco no primeiro erro quando possível.

## Testes

Escreva ao menos: `AuthService` (login salva token, logout limpa, `isAuthenticated` falso com token vencido), `authGuard` (redireciona sem token), `authInterceptor` (adiciona cabeçalho; não adiciona em `/auth/login`; 401 desloga) com `HttpTestingController`, e um teste do formulário (campo obrigatório vazio → inválido). Rode e registre o resultado.

## Definição de pronto (frontend)

- [ ] `ng build` sem erros; `ng test --watch=false` passa (ou motivo declarado).
- [ ] Fluxo manual contra o backend real: login inválido → mensagem; login válido → lista; cadastrar (com erros de validação e sucesso); detalhes; editar; excluir com confirmação (cancelar não exclui); sair; acessar `/products` sem login → vai ao login; token apagado/expirado → volta ao login com aviso.
- [ ] Nenhum `HttpClient` fora de serviços; nenhum dado fixo; nenhum `console.log` de token/senha.
- [ ] Rotas, serviços e componentes listados em `docs/00-planejamento.md` (a documentação usa).
- [ ] Capturas de tela salvas em `docs/img/` se houver como gerar (login, lista, cadastro com erro, detalhes, confirmação).

## Armadilhas frequentes

- CORS: se o navegador bloquear, o problema está no backend (`allowedOrigins`, `Authorization` em `allowedHeaders`), não no Angular. Alternativa de dev: `proxy.conf.json` apontando `/api` para `localhost:8080`.
- `type="number"` entrega `number | null`; trate `null` no tipo do `FormControl`.
- Se a edição não preencher o formulário, o `patchValue` foi chamado antes de os dados chegarem: carregue o registro antes de renderizar o formulário ou reaja ao `input` com `effect`.
- Não faça `subscribe` sem encerramento em componentes de longa vida: use `takeUntilDestroyed`, `async` pipe ou `toSignal`.
- Material 3 não usa mais `color="warn"` em botões do mesmo jeito das versões antigas: confira a documentação da versão instalada.
