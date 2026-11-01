# Catálogo de temas

Use quando o usuário não escolheu tema. Cada tema traz uma entidade principal com campos variados (texto, número, data, enum, booleano) para exercitar validação e formulários de verdade. Todos funcionam com o mesmo esqueleto de CRUD: troque o nome da entidade e os campos.

Regra de escolha: prefira o tema em que o público-alvo seja fácil de descrever em duas frases e em que a entidade tenha 6 a 9 campos. Entidade com 2 ou 3 campos deixa a validação e a documentação pobres.

## 1. Controle de estoque (padrão recomendado)

- **Problema**: pequenos comércios controlam estoque em planilhas e perdem produtos por falta de reposição ou por validade vencida.
- **Público-alvo**: donos e atendentes de pequenos comércios (mercearias, farmácias de bairro, papelarias).
- **Entidade principal**: `Product`

| Campo | Tipo | Validação |
|---|---|---|
| name | String | obrigatório, 3 a 120 |
| sku | String | obrigatório, único, 3 a 40 |
| category | enum `ProductCategory` | obrigatório |
| quantity | Int | obrigatório, >= 0 |
| minQuantity | Int | obrigatório, >= 0 (alerta de reposição) |
| unitPrice | BigDecimal | obrigatório, > 0, 2 casas |
| expirationDate | LocalDate? | opcional |
| description | String? | opcional, até 500 |
| active | Boolean | padrão true |

Funcionalidades: cadastrar produto, listar com busca, ver detalhes com indicação "abaixo do mínimo", editar, excluir com confirmação.

## 2. Biblioteca comunitária

- **Problema**: bibliotecas de bairro e escolas não sabem quais livros estão emprestados nem com quem.
- **Público-alvo**: bibliotecários voluntários e coordenadores de escolas.
- **Entidade principal**: `Book`: title, author, isbn (único), publisher, publicationYear (1400..ano atual), genre (enum), copiesAvailable (>= 0), synopsis?, location (estante).

## 3. Agendamento de serviços

- **Problema**: salões, oficinas e clínicas pequenas marcam horários por mensagem e sofrem com conflitos.
- **Público-alvo**: profissionais autônomos e recepcionistas.
- **Entidade principal**: `Appointment`: clientName, clientPhone (padrão de telefone), serviceType (enum), scheduledAt (LocalDateTime, futuro), durationMinutes (15..480), status (enum AGENDADO/CONCLUIDO/CANCELADO), notes?. Regra de negócio sugerida: 409 se houver conflito de horário.

## 4. Organização de eventos

- **Problema**: organizadores de eventos de pequeno porte controlam inscrições e capacidade em planilhas.
- **Público-alvo**: centros acadêmicos, ONGs e produtores locais.
- **Entidade principal**: `Event`: title, description, location, startsAt, endsAt (depois de startsAt), capacity (>= 1), ticketPrice (>= 0), category (enum), published (boolean).

## 5. Gestão de tarefas

- **Problema**: equipes pequenas perdem prazos por não ter visão única das tarefas.
- **Público-alvo**: equipes de projeto, estudantes em trabalhos de grupo.
- **Entidade principal**: `Task`: title, description?, priority (enum BAIXA/MEDIA/ALTA), status (enum), dueDate (LocalDate), assignee (String), estimatedHours (BigDecimal?).

## 6. Adoção de animais

- **Problema**: ONGs de resgate divulgam animais de forma dispersa e perdem o histórico.
- **Público-alvo**: voluntários de ONGs e pessoas interessadas em adotar.
- **Entidade principal**: `Pet`: name, species (enum), breed?, ageMonths (>= 0), size (enum), sex (enum), vaccinated (boolean), status (enum DISPONIVEL/EM_PROCESSO/ADOTADO), description?, rescuedAt (LocalDate, não futura).

## Como adaptar

1. Troque `Product`/`products`/`/api/products` pelo nome da entidade escolhida em todas as camadas.
2. Mantenha pelo menos um enum, um campo numérico com limite, uma data e um campo opcional: isso força o frontend a tratar `select`, `number`, `date` e campos não obrigatórios.
3. Inclua 1 regra de negócio simples no service (unicidade do SKU/ISBN, conflito de horário, data de fim depois do início). Ela rende um 409 ou 400 para demonstrar tratamento de erros e boa seção na documentação.
4. Escreva seeds com 8 a 12 registros realistas em português, carregados apenas no perfil de desenvolvimento.
