# Coleta de fatos antes de escrever

Rode estes comandos na raiz do projeto e guarde as saídas em notas de trabalho (não precisam ir para o repositório). Cada fato do documento deve ter origem aqui ou em execução real.

## Versões e dependências

```bash
grep -nE 'org.springframework.boot|kotlin\("|JavaLanguageVersion|jackson|postgresql|oauth2' backend/build.gradle.kts
grep -nE '"@angular/(core|material|cli)"|"typescript"|"rxjs"' frontend/package.json
node --version; java -version 2>&1 | head -1; docker --version
```

## Backend: estrutura, endpoints, entidades

```bash
find backend/src -name '*.kt' | sort                                  # árvore de arquivos
grep -rnE '@(RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping)' backend/src/main   # endpoints reais
grep -rn '@Entity' backend/src/main -A 25 | head -120                 # campos das entidades
grep -rnE '@field:|@Valid' backend/src/main | head -60                # regras de validação
grep -rnE 'ExceptionHandler' backend/src/main/kotlin -A 3 | head -80  # tratamento de erros
cat backend/src/main/resources/application.yml
```

## Segurança

```bash
sed -n '1,120p' backend/src/main/kotlin/**/SecurityConfig.kt
grep -rnE 'permitAll|authenticated|STATELESS|csrf|cors' backend/src/main
grep -rn 'expirationSeconds\|expiresAt' backend/src/main
```

## Frontend: rotas, serviços, guards

```bash
cat frontend/src/app/app.routes.ts
find frontend/src/app -name '*.service.ts' -o -name '*guard*.ts' -o -name '*interceptor*.ts'
grep -rnE 'Validators\.' frontend/src/app | head -40
grep -rnE "notify\.(success|error)\(" frontend/src/app            # mensagens ao usuário (tabela de feedback)
grep -rn 'environment.apiUrl' frontend/src/app | head
```

## Execução real (exemplos para a documentação)

```bash
docker compose up -d && (cd backend && ./gradlew bootRun) &       # suba e aguarde "Started"
# depois use o roteiro: fullstack-requirements-verification/references/roteiro-e2e.md
(cd backend && ./gradlew test) 2>&1 | tail -20                     # resultado dos testes
(cd frontend && ng build 2>&1 | tail -15)
```
Para a contagem de testes do backend, leia `backend/build/test-results/test/*.xml` (atributos `tests`, `failures`, `errors`).

## Capturas de tela (se houver navegador)

Salve em `docs/img/` com nomes descritivos (`01-login.png`, `02-listagem.png`, `03-cadastro-erros.png`, `04-detalhes.png`, `05-confirmacao-exclusao.png`) e referencie no documento com `![Tela de login](img/01-login.png)`. Sem navegador, descreva as telas em texto e não crie referências a imagens que não existem (o validador acusa link quebrado).

## Anotações a manter durante todo o desenvolvimento

- Decisões e alternativas descartadas (com motivo).
- Problemas encontrados e como foram resolvidos: viram a seção de decisões e dão credibilidade ("o que aprendemos").
- Comandos que funcionaram de fato, para a seção "Como executar".
