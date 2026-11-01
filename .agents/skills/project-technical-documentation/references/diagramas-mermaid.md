# Modelos de diagramas Mermaid

Adapte nomes e campos ao projeto real. Mantenha a sintaxe simples: caracteres acentuados em rótulos entre aspas, sem parênteses soltos em rótulos de nós (use aspas). Se possível, valide a sintaxe (por exemplo com `npx @mermaid-js/mermaid-cli`), ou ao menos releia: um erro de sintaxe quebra a renderização do diagrama inteiro.

## 1. Arquitetura (componentes)

```mermaid
flowchart LR
    U["Usuário<br/>navegador"] -->|HTTP| A["Angular SPA<br/>localhost:4200"]
    A -->|"REST JSON<br/>Authorization: Bearer JWT"| B["API Spring Boot + Kotlin<br/>localhost:8080"]
    B -->|"JPA / Hibernate"| D[("PostgreSQL<br/>volume pgdata")]
    subgraph Backend
      C["Controllers"] --> S["Services"] --> R["Repositories"]
    end
    B --- C
    R --- D
```

## 2. Modelo entidade-relacionamento

```mermaid
erDiagram
    APP_USERS {
        bigint id PK
        varchar username UK
        varchar password_hash
        varchar role
        boolean enabled
    }
    PRODUCTS {
        bigint id PK
        varchar name
        varchar sku UK
        varchar category
        int quantity
        int min_quantity
        numeric unit_price
        date expiration_date
        varchar description
        boolean active
        timestamp created_at
        timestamp updated_at
    }
```
Sem relacionamento entre as duas tabelas, explique no texto por quê (nesta versão o registro não guarda o autor). Se houver vínculo (por exemplo `created_by`), desenhe a relação `APP_USERS ||--o{ PRODUCTS : cria`.

## 3. Sequência do login e de uma requisição protegida

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant A as Angular
    participant API as Spring Security + API
    participant DB as PostgreSQL

    U->>A: Informa usuário e senha
    A->>API: POST /api/auth/login
    API->>DB: Busca usuário e hash BCrypt
    DB-->>API: AppUser
    alt credenciais válidas
        API-->>A: 200 token JWT + expiresIn
        A->>A: Guarda token e vai para a listagem
    else credenciais inválidas
        API-->>A: 401 INVALID_CREDENTIALS
        A-->>U: "Usuário ou senha inválidos."
    end

    U->>A: Abre a listagem
    A->>API: GET /api/products com Bearer JWT
    API->>API: Valida assinatura e exp
    alt token válido
        API->>DB: SELECT
        DB-->>API: registros
        API-->>A: 200 lista de DTOs
    else expirado ou inválido
        API-->>A: 401 TOKEN_EXPIRED ou TOKEN_INVALID
        A->>A: Limpa sessão
        A-->>U: Aviso e redireciona ao login
    end
```

## 4. Navegação entre páginas

```mermaid
flowchart TD
    L["/login"] -->|"autenticado"| LI["/products<br/>Listagem"]
    LI -->|"Novo produto"| C["/products/new<br/>Cadastro"]
    LI -->|"nome ou ver"| D["/products/:id<br/>Detalhes"]
    LI -->|"editar"| E["/products/:id/edit<br/>Edição"]
    D -->|"editar"| E
    C -->|"salvar"| D
    E -->|"salvar"| D
    LI -->|"excluir + confirmar"| LI
    D -->|"excluir + confirmar"| LI
    LI -->|"Sair"| L
```

## 5. Fluxo de exclusão com confirmação (opcional, bom para a seção de frontend)

```mermaid
sequenceDiagram
    actor U as Usuário
    participant P as Página
    participant Dlg as ConfirmDialog
    participant S as ProductService
    participant API as API
    U->>P: Clica em Excluir
    P->>Dlg: ask(título, mensagem)
    alt Cancelar
        Dlg-->>P: false (nada acontece)
    else Confirmar
        Dlg-->>P: true
        P->>S: delete(id)
        S->>API: DELETE /api/products/id
        API-->>S: 204
        P-->>U: Snackbar de sucesso e lista atualizada
    end
```

## 6. Camadas do backend (opcional)

```mermaid
flowchart LR
    Req["Requisição JSON"] --> Ctl["Controller<br/>valida DTO"]
    Ctl --> Svc["Service<br/>regras e transação"]
    Svc --> Repo["Repository<br/>Spring Data JPA"]
    Repo --> DB[("Banco")]
    Svc -.->|"exceção"| Adv["RestControllerAdvice<br/>ApiError"]
    Ctl -.->|"MethodArgumentNotValid"| Adv
```
