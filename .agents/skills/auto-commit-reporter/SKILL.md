---
name: auto-commit-reporter
description: Registra e reporta automaticamente as alterações realizadas no repositório como commits atômicos e semânticos, seguindo o padrão Conventional Commits. Use sempre que o agente criar, editar ou deletar arquivos no repositório, ou quando o usuário solicitar uma alteração no código ou na documentação.
---

# Auto-Commit Reporter

## Objetivo (Goal)
Garantir que toda alteração feita no repositório seja imediatamente reportada como um commit atômico, com mensagem clara e padronizada, permitindo rastreabilidade total do histórico e evitando que o usuário esqueça de commitar ou acumule alterações não versionadas.

## Público-Alvo
O próprio agente (auto-regulação) e o desenvolvedor (visibilidade do que está sendo alterado).

## Instruções (Instructions)

### Etapa 1: Antes de qualquer alteração
1. Execute `git status` para verificar o estado atual do repositório (arquivos modificados, não rastreados, etc.).
2. Identifique quais arquivos serão afetados pela tarefa solicitada.

### Etapa 2: Após concluir a alteração (e ANTES de responder ao usuário)
1. Execute `git status` novamente para confirmar quais arquivos foram de fato criados, modificados ou deletados.
2. Classifique a alteração em um dos tipos do **Conventional Commits**:
   - `feat`: nova funcionalidade, novo arquivo de conteúdo, novo notebook.
   - `fix`: correção de erro, link quebrado, código que não rodava.
   - `docs`: alterações em README, glossário, comentários didáticos.
   - `refactor`: reorganização de código ou estrutura de pastas sem mudar comportamento.
   - `style`: formatação, espaçamento, indentação (sem mudança de lógica).
   - `chore`: configuração, requirements.txt, arquivos de licença, workflows.
3. Gere uma mensagem de commit no formato:
- `<tipo>(<escopo opcional>): <descrição curta no imperativo>`
- `<corpo opcional explicando o que foi feito e por quê>`

Exemplos:
- `docs(readme): expande seção de instalação do Anaconda para iniciantes`
- `feat(notebooks): adiciona notebook 03 com implementação manual do Perceptron`
- `fix(site): corrige link quebrado para o glossário na página inicial`
- `chore(license): adiciona arquivo LICENSE com dupla licença CC BY + MIT`

### Etapa 3: Reportar ao usuário
Antes de entregar a resposta final da tarefa, **sempre inclua um bloco de "Commit Sugerido"** no final da sua resposta, no seguinte formato:

```markdown
---
### Commit Sugerido

**Arquivos alterados:**
- `caminho/do/arquivo1`
- `caminho/do/arquivo2`

**Mensagem de commit:**
- `<tipo>(<escopo>): <descrição>`


**Comando para executar:**
```bash
git add <arquivos> && git commit -m "<mensagem>"
```

### Etapa 4: Oferecer execução automática (opcional)
Se o usuário autorizar previamente (ou se a configuração do agente permitir), execute o commit diretamente em vez de apenas sugerir. Caso contrário, apenas reporte.

## Restrições (Constraints)
- **NUNCA** faça commit sem antes rodar `git status` para confirmar os arquivos.
- **NUNCA** faça um commit gigante misturando tipos diferentes (ex: `docs` + `feat` + `fix` juntos). Se a tarefa gerou alterações de naturezas diferentes, **sugira múltiplos commits atômicos**.
- **NUNCA** faça `git push` sem autorização explícita do usuário.
- **SEMPRE** use o imperativo na descrição curta (ex: "adiciona", "corrige", "expande" — não "adicionado" ou "corrigindo").
- **SEMPRE** mantenha a mensagem curta (até 72 caracteres na primeira linha).
- **SEMPRE** inclua o bloco "Commit Sugerido" no final da resposta, mesmo que a alteração seja trivial.

## Fluxo de Execução Resumido
1. `git status` (antes)
2. Executa a tarefa solicitada
3. `git status` (depois)
4. Classifica o tipo de alteração
5. Gera a mensagem de commit
6. Entrega a resposta com o bloco "Commit Sugerido" no final