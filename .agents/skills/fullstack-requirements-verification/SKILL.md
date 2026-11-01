---
name: fullstack-requirements-verification
description: Verifica se a aplicação Angular + Spring Boot (Kotlin) + JWT cumpre o enunciado antes da entrega - roda auditoria estática automatizada, testes, build e o roteiro ponta a ponta com curl (login, 401 sem token, token adulterado/expirado, CRUD, 400, 404, persistência após reiniciar), e produz um relatório honesto de conformidade. Use quando o usuário pedir para revisar, validar, testar, conferir requisitos, "ver se está tudo certo", preparar entrega, ou ao final de qualquer desenvolvimento com as skills springboot-kotlin-jwt-api e angular-jwt-frontend. Verification QA checklist acceptance Angular Spring JWT.
---

# Verificação de requisitos

Esta skill fecha o ciclo. Ela existe porque código que "parece certo" falha em detalhes que o enunciado cobra: senha vazando em resposta, H2 em memória perdendo dados, exclusão sem confirmação, token expirado deixando a tela quebrada. A regra é: **só declare um requisito atendido com evidência** (saída de comando, teste passando, trecho de código).

## Passo a passo

1. **Auditoria estática**
   ```bash
   python <caminho-da-skill>/scripts/verify_requirements.py <raiz-do-projeto>
   ```
   Cada linha tem ID de verificação, ID de requisito (`R-BE-10`...) e PASS/WARN/FAIL. Corrija todos os FAIL; decida conscientemente cada WARN (corrija ou justifique na documentação). O script é heurístico: PASS = há evidência no código, não prova de funcionamento.

2. **Build e testes**
   - Backend: `cd backend && ./gradlew build` (inclui testes).
   - Frontend: `cd frontend && npm ci && ng build && ng test --watch=false` (use o comando de teste do runner configurado).
   Registre comando, resultado e contagem de testes. Se algo não puder rodar (sem rede, sem Docker), escreva isso explicitamente no relatório; não omita.

3. **Roteiro ponta a ponta**: execute `references/roteiro-e2e.md` com o backend e o banco no ar. Ele cobre os cenários que o enunciado exige, incluindo persistência após reiniciar.

4. **Revisão manual do frontend** (checklist abaixo), de preferência no navegador. Sem navegador, inspecione o código de cada tela e diga que a verificação foi por leitura.

5. **Relatório**: preencha a tabela abaixo (vai para a seção de testes da documentação e para a resposta final ao usuário).

## Checklist manual do frontend

| # | Cenário | Esperado |
|---|---|---|
| 1 | Abrir `/products` sem login | Redireciona a `/login` |
| 2 | Login com senha errada | Mensagem "Usuário ou senha inválidos." sem entrar |
| 3 | Login vazio | Mensagens de campo obrigatório |
| 4 | Login correto | Vai à listagem; dados vêm do banco |
| 5 | Cadastro com campos inválidos | Mensagens por campo, nada é enviado |
| 6 | Cadastro válido | Snackbar de sucesso, vai ao detalhe, registro aparece na lista |
| 7 | SKU/campo único duplicado | Mensagem clara de conflito (409), formulário preservado |
| 8 | Detalhes de id inexistente (`/products/99999`) | Aviso e retorno à lista |
| 9 | Edição | Formulário vem preenchido; salvar mostra sucesso; lista reflete |
| 10 | Excluir → Cancelar | Nada é excluído |
| 11 | Excluir → Confirmar | Snackbar de sucesso, item some |
| 12 | Apagar o token no DevTools e navegar/atualizar | Volta ao login com aviso |
| 13 | Token expirado (backend com `JWT_EXPIRATION_SECONDS=30`, aguardar) | 401 tratado: aviso e login |
| 14 | Sair | Volta ao login; botão voltar do navegador não reabre área protegida |
| 15 | Backend desligado | Mensagem "Não foi possível conectar ao servidor" |

## Relatório (formato)

```
| ID | Requisito | Evidência | Resultado |
|----|-----------|-----------|-----------|
| R-BE-10 | Dados persistem após reinício | roteiro e2e passo 11: registro 5 existia após restart | OK |
| R-FE-07 | Confirmação antes de excluir | ProductListComponent.remove → ConfirmService; checklist 10-11 | OK |
| R-BE-14 | Senha não retornada | grep passwordHash em *Response*: 0 ocorrências; JSON do login sem senha | OK |
```
Resultados possíveis: **OK**, **PARCIAL** (diga o que falta), **NÃO VERIFICADO** (diga por quê), **FALHA**. Nunca marque OK sem evidência.

## Quando algo falha

Corrija na causa, não no sintoma, e rode a verificação de novo. Falhas comuns e causas:

| Sintoma | Causa provável |
|---|---|
| Validação do backend nunca dispara (sempre 201) | Faltou `@field:` nas anotações do DTO ou `@Valid` no controller |
| 401 em tudo, mesmo com token | Segredo diferente entre emissão e validação, relógio, ou `Authorization` não enviado (confira o interceptor e a URL com `environment.apiUrl`) |
| Erro de CORS no navegador, curl funciona | `allowedOrigins`/`allowedHeaders` no backend |
| `LazyInitializationException` | `open-in-view=false` + acesso lazy fora de transação: carregue no service e devolva DTO |
| 500 em vez de 403/404 | `@ExceptionHandler(Exception)` engolindo exceções; falta handler específico |
| Dados somem ao reiniciar | H2 em memória, `create-drop`, ou volume do Docker não configurado |
| Rota `/products/new` abre detalhes | Ordem das rotas: `new` deve vir antes de `:id` |

## Entrega da verificação

Informe ao usuário em poucas linhas: o que passou, o que falhou e foi corrigido, o que **não** foi possível verificar e por quê, e o resumo do verificador (`N ok, N avisos, N falhas`). Comprometa-se apenas com o que foi comprovado.
