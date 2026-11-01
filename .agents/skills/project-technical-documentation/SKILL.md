---
name: project-technical-documentation
description: Escreve o documento técnico detalhado e completo de um projeto fullstack Angular + Spring Boot (Kotlin) + JWT, em português do Brasil, explicando problema, público-alvo, funcionalidades, requisitos, arquitetura, modelo de dados, API REST, segurança JWT, frontend, como executar, testes, decisões, limitações e rastreabilidade com o enunciado, com diagramas Mermaid e exemplos reais extraídos do código. Use sempre que o usuário pedir documentação, relatório, README completo, "documento explicando tudo", memorial descritivo, apresentação técnica do trabalho, ou ao concluir a implementação com as skills springboot-kotlin-jwt-api e angular-jwt-frontend. Technical documentation report Angular Spring Boot Kotlin JWT.
---

# Documentação técnica do projeto

O enunciado pede um documento detalhado explicando tudo. Quem lê (professor, colega, banca) precisa entender **o que o sistema faz, como foi construído, por quê, e como comprovar que funciona**, sem abrir o código. Por isso o texto explica o raciocínio, não só lista nomes de classes.

Entregável principal: `docs/DOCUMENTACAO.md` (Markdown, versionado junto do código, diagramas em Mermaid que o GitHub renderiza). Se o usuário pedir Word ou PDF, gere a partir do Markdown (por exemplo com `pandoc docs/DOCUMENTACAO.md -o docs/DOCUMENTACAO.docx`, ou com a skill `docx`/`pdf` se disponível) e informe que os diagramas Mermaid precisam ser exportados como imagem para esses formatos. Complementa com um `README.md` curto na raiz (descrição em 5 linhas, como subir, credenciais, link para a documentação).

## Princípio central: documente o que existe

Escreva **depois** de ler o código e rodar a aplicação, nunca de memória ou por suposição. Documentação que descreve um endpoint que não existe, ou omite uma regra que existe, é pior do que nenhuma. O script `scripts/check_docs.py` cruza o texto com o código para pegar esses erros, mas a responsabilidade é sua.

## Fluxo

1. **Colete fatos** (comandos em `references/coleta-de-fatos.md`): entidades e campos, endpoints reais, rotas Angular, configurações, dependências e versões, testes e resultados, saídas reais de curl.
2. **Reaproveite** `docs/00-planejamento.md` (problema, público, funcionalidades, decisões), atualizando o que mudou na implementação.
3. **Escreva seção a seção** seguindo `references/estrutura-documento.md`, que diz o conteúdo exigido de cada uma. Use os modelos de `references/diagramas-mermaid.md`.
4. **Valide**:
   ```bash
   python <caminho-da-skill>/scripts/check_docs.py docs/DOCUMENTACAO.md --project <raiz-do-projeto>
   ```
   Corrija todo `[ERRO]`; avalie cada `[AVISO]`.
5. **Releia como leitor novo**: dá para executar o projeto só com o documento? Cada requisito do enunciado tem resposta na matriz? Os números (contagem de testes, status HTTP, versões) batem com o que você observou?

## Padrão de qualidade

- **Explique o porquê**: "o token expira em 1 h para limitar o dano de um token vazado; o Angular trata o 401 resultante levando ao login" é melhor que "o token expira em 1 h".
- **Mostre, não só diga**: trechos curtos de código real (até ~25 linhas, com caminho do arquivo), requisições e respostas reais capturadas, tabelas de endpoints e de códigos de erro. Não cole arquivos inteiros.
- **Cada afirmação verificável**: cite o arquivo ou o comando que a comprova (`backend/src/.../SecurityConfig.kt`).
- **Autossuficiente**: defina siglas na primeira ocorrência e no glossário (JWT, DTO, BCrypt, CORS, CRUD, JPA, ORM, stateless).
- **Honesto**: seção de limitações com o que não foi feito ou não foi testado (ex.: JWT em `localStorage` está exposto a XSS; `ddl-auto=update` em vez de migrações; sem refresh token; sem testes e2e automatizados). Admitir limites aumenta a credibilidade; esconder, não.
- **Sem rascunho**: nada de TODO, "a definir", `[inserir print]`. Se não houver captura de tela, descreva a tela em texto (campos, botões, mensagens) e diga que as capturas não foram incluídas.
- **Sem segredos**: JWT de exemplo truncado (`eyJhbGciOi...`), segredos de desenvolvimento identificados como tais, nada de credenciais reais.
- **Tom**: português do Brasil, impessoal ou primeira pessoa do plural, direto, sem floreio. Termos técnicos em inglês quando são os nomes reais (controller, service, token).
- **Tamanho**: o necessário para cobrir tudo com profundidade; tipicamente 4.000 a 8.000 palavras. Não encha linguiça: se uma seção ficou rasa, falta fato, não adjetivo.

## Estrutura obrigatória (resumo)

Capa · 1 Resumo · 2 Problema, público-alvo e funcionalidades · 3 Requisitos e rastreabilidade · 4 Arquitetura · 5 Modelo de dados · 6 Backend (camadas, API, validação, erros) · 7 Segurança e autenticação JWT · 8 Frontend (rotas, serviços, guards, formulários, feedback) · 9 Como executar · 10 Testes e validação · 11 Decisões técnicas · 12 Limitações e melhorias · 13 Glossário · Apêndices (estrutura de pastas, requisições, configurações, referências).

O detalhamento de cada uma está em `references/estrutura-documento.md`: leia antes de escrever.

## Entrega

Informe onde está o documento, o resultado do `check_docs.py` (cole a última linha), as seções que dependem de algo que você não conseguiu executar, e ofereça exportar para Word/PDF.
