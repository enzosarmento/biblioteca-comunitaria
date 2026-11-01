---
name: crud-jwt-fullstack-orchestrator
description: Orquestra o desenvolvimento completo de uma aplicação web acadêmica com frontend Angular, API REST em Spring Boot com Kotlin, banco relacional (Spring Data JPA) e autenticação JWT com Spring Security, incluindo a documentação final detalhada. Use SEMPRE que o usuário pedir para criar, desenvolver, montar ou "fazer o trabalho" de uma aplicação Angular + Spring Boot, um CRUD com login JWT, um sistema de controle de estoque, biblioteca, agendamento, eventos, tarefas, adoção de animais ou qualquer tema parecido, ou mencionar "trabalho de Angular e Spring", "API REST com JWT", "frontend e backend integrados". Esta skill define as fases, os critérios de aceite e chama as skills springboot-kotlin-jwt-api, angular-jwt-frontend, fullstack-requirements-verification e project-technical-documentation. Triggers in English too - Angular + Spring Boot Kotlin JWT full-stack CRUD project.
---

# Orquestrador: aplicação Angular + Spring Boot (Kotlin) + JWT

Esta skill conduz o projeto do começo ao fim. Ela existe porque o trabalho tem muitos requisitos pequenos e fáceis de esquecer (confirmar exclusão, tratar token expirado, não devolver senha, persistir após reiniciar...) e porque a entrega inclui um documento detalhado. A estratégia é: **transformar o enunciado em checklist verificável, construir em fases com portões de qualidade e documentar a partir do código real**.

## Stack fixa (não troque sem o usuário pedir)

| Camada | Tecnologia |
|---|---|
| Frontend | Angular (versão estável atual), standalone components, Router, HttpClient, Reactive Forms, Angular Material |
| Backend | Spring Boot (3.5.x por padrão) com **Kotlin**, Gradle Kotlin DSL, Java 21 |
| Persistência | Spring Data JPA + PostgreSQL (docker compose, volume nomeado) |
| Segurança | Spring Security stateless + JWT (HS256) + BCrypt |
| Testes | JUnit 5 + MockMvc (backend); runner padrão do Angular CLI (frontend) |

Se o usuário ou a disciplina especificar outra versão/ferramenta (Maven, MySQL, H2 em arquivo, Angular NgModules), obedeça e adapte os templates das skills filhas.

## Fontes de verdade

1. `references/requisitos.md`: o enunciado decomposto em IDs (R-FE-01, R-BE-05...). É o critério de aceite. Leia antes de começar e releia antes de entregar.
2. `references/temas.md`: catálogo de temas com entidade principal, campos e validações prontas. Use quando o usuário não definir o tema.

## Fases e portões

Execute na ordem. Só avance quando o portão da fase estiver satisfeito, porque erros de contrato descobertos no fim custam retrabalho nos dois lados.

### Fase 0: Intake (no máximo 1 rodada de perguntas)

Descubra: tema, nome do projeto, nome da equipe/integrantes (para a capa do documento), versões exigidas, se já existe código. Se o usuário não escolheu tema, ofereça 3 opções de `references/temas.md` e recomende uma. Se ele não responder ou pedir "escolha você", escolha, declare a suposição em uma linha e siga adiante. Não faça interrogatório: o que não for crítico vira suposição registrada no documento.

Portão: tema, entidade principal e nome do projeto definidos.

### Fase 1: Planejamento e contrato

Crie `docs/00-planejamento.md` contendo:

- Descrição do problema, público-alvo e funcionalidades propostas (o enunciado pede isso explicitamente; este texto vira a seção 2 da documentação final).
- Modelo de dados: entidade principal (campos, tipos, restrições), entidade de usuário, relacionamentos.
- **Contrato da API**: tabela de endpoints (método, caminho, auth, request, response, códigos HTTP) e o formato padrão de erro (veja a skill de backend).
- Mapa de rotas do Angular: caminho, página, guarda, serviço usado.
- Lista de suposições e decisões tomadas (alimenta o diário de decisões).

Portão: contrato e rotas cobrem todos os itens de R-BE-* e R-FE-* de `requisitos.md`. Backend e frontend serão construídos contra este contrato.

### Fase 2: Backend

Siga a skill `springboot-kotlin-jwt-api`. Entregue um backend que sobe, cria o schema, semeia o usuário admin e responde ao fluxo completo de login e CRUD.

Portão: `./gradlew test` passa e o roteiro curl de `fullstack-requirements-verification/references/roteiro-e2e.md` (login, 401 sem token, CRUD, 400, 404) funciona de verdade.

### Fase 3: Frontend

Siga a skill `angular-jwt-frontend`. O login chama o backend real; nenhum dado é mockado.

Portão: `ng build` sem erros, e o fluxo login → listar → cadastrar → detalhar → editar → excluir (com confirmação) → sair funciona contra o backend rodando.

### Fase 4: Verificação

Siga a skill `fullstack-requirements-verification`: rode o verificador automático, execute o roteiro e2e, corrija falhas, repita. Registre o que foi realmente executado e o resultado (isso entra na seção de testes da documentação).

### Fase 5: Documentação

Siga a skill `project-technical-documentation`. O documento é escrito **lendo o código que existe**, não de memória, e é validado pelo script `check_docs.py`.

### Fase 6: Entrega

Responda ao usuário com: onde está cada parte (pastas e arquivos), como subir tudo em 3 comandos, credenciais de teste, o que foi verificado de fato e o que não foi (por falta de ambiente, por exemplo), e as suposições feitas. Seja honesto: se não conseguiu compilar ou rodar algo, diga, em vez de declarar sucesso.

## Estrutura do repositório

```
<projeto>/
├── README.md                  # visão geral + como executar (curto)
├── docker-compose.yml         # PostgreSQL com volume persistente
├── .env.example               # variáveis (sem segredos reais)
├── .gitignore
├── backend/                   # Spring Boot + Kotlin (Gradle)
├── frontend/                  # Angular
└── docs/
    ├── 00-planejamento.md
    ├── DOCUMENTACAO.md        # documento detalhado final
    └── img/                   # capturas de tela / diagramas exportados
```

## Convenções

- **Idiomas**: identificadores de código, rotas da API e nomes de classes em inglês; textos de interface, mensagens ao usuário, commits e documentação em português do Brasil.
- **Segredos**: nunca commite segredo real. Segredo JWT e senha do banco vêm de variáveis de ambiente, com padrão de desenvolvimento claramente marcado como inseguro.
- **Nada de simulação**: login autentica no backend; listas vêm do banco via API. Dados de exemplo entram por seed no backend, não por arrays no Angular.
- **Execução real**: se houver terminal, rode build, testes e a aplicação. Resultado observado vale mais que código que "deveria funcionar".
- **Tamanho**: prefira poucos arquivos bem feitos a muitos genéricos. Uma entidade principal bem completa vence três entidades rasas.
- **Diário de decisões**: sempre que escolher entre alternativas (JWT via resource-server vs filtro próprio, localStorage vs cookie, ddl-auto vs Flyway), anote em `docs/00-planejamento.md`. A documentação final aproveita.

## Quando algo travar

- Sem rede/sem permissão para instalar dependências: escreva o projeto completo mesmo assim, valide o que for possível (por exemplo, scripts Python, lint de sintaxe) e declare claramente o que não pôde ser executado.
- Requisito ambíguo: escolha a interpretação mais conservadora (mais exigente) e registre.
- Usuário pediu algo fora do enunciado (upload de imagem, perfis de acesso, relatórios): faça depois que o núcleo obrigatório estiver verde.
