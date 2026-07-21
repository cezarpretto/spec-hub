# SpecHub

**Memória compartilhada para agentes de IA e times de desenvolvimento.**

Em vez de copiar documentação para prompts ou depender de Confluence, Jira e READMEs espalhados, os agentes recuperam apenas o contexto necessário, atualizam especificações durante a implementação e compartilham conhecimento entre múltiplos repositórios — tudo direto do IDE, sem sair do fluxo.

```mermaid
flowchart LR
    subgraph Agentes
        Cursor
        Claude
        Codex
        Windsurf
    end
    Agentes <-->|MCP| SpecHub[(SpecHub)]
    SpecHub --> PG[(PostgreSQL + pgvector)]
    SpecHub --> Emb[all-MiniLM-L6-v2]
```

> Todos os agentes compartilham a mesma memória. Quando um agente termina, o próximo continua exatamente de onde o anterior parou.

---

## Por que existe?

- **Contexto não cabe no prompt** — jogar uma spec inteira no prompt consome tokens e degrada a qualidade das respostas. O SpecHub entrega só o trecho relevante.
- **Documentação espalhada** — specs vivem em Confluence, Jira, Google Docs e READMEs de repositórios diferentes. Ninguém sabe onde está a versão canônica.
- **Cross-repo é doloroso** — uma feature toca 3+ repositórios. Cada repo tem seu próprio backlog de tarefas, sem visão unificada do que falta fazer.
- **Documentação morre após o planejamento** — specs são escritas no início e nunca mais atualizadas. O SpecHub foi desenhado para que a documentação evolua junto com o código, durante semanas de implementação.

---

## Como funciona na prática

```
Nova feature (ex: "Adicionar pagamento PIX")
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Salvar PRD                       │  save_spec
│    "PIX: integração com PSP..."    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. Gerar tarefas por repo           │  update_task_status
│    api: criar endpoint cobrança     │
│    worker: processar webhook        │
│    frontend: tela de pagamento      │
│    terraform: novas env vars        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 3. Agente busca contexto relevante  │  search_spec_context
│    "Como funciona o webhook?"       │  → só a seção sobre webhook
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 4. Implementa e atualiza progresso  │  update_task_status
│    api: cobrança PIX → done         │
│    worker: webhook → in_progress    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 5. Atualiza documentação            │  update_spec_chunk
│    "Durante implementação, o PSP    │
│     exige header X-IDEMPOTENCY..."  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 6. Próximo agente continua          │  get_repo_tasks
│    "Quais tarefas faltam?"          │  → worker: webhook (in_progress)
│    "O que mudou desde o planning?"  │  → frontend, terraform (pending)
└─────────────────────────────────────┘
```

O conhecimento acumulado pelo primeiro agente fica imediatamente disponível para os próximos.

---

## O que torna o SpecHub diferente

- **Não é só busca vetorial** — é edição contínua. A documentação não é estática; ela evolui durante a implementação.
- **Entende features como unidade de trabalho** — cada spec agrupa tarefas distribuídas por repositório, com rastreamento de progresso.
- **Mantém histórico de alterações** — toda mudança na spec ou nas tarefas gera entrada no changelog. Dá pra saber quem alterou o quê e quando.
- **Memória compartilhada entre agentes** — Cursor, Claude Code, Windsurf e outros leem e escrevem no mesmo lugar.
- **Busca híbrida** — combina similaridade vetorial com full-text search, com boost por repositório. Retorna as 3 seções mais relevantes, não o documento inteiro.
- **Embeddings locais** — `all-MiniLM-L6-v2` roda 100% local via `@xenova/transformers`. Sem chamadas de API externa, sem custo de token para gerar embeddings.

---

## Ferramentas

### Criar conhecimento

| Ferramenta | O que faz |
|---|---|
| `save_spec` | Persiste uma spec com embedding vetorial. UPSERT por `source_type` + `source_key`. |

### Recuperar contexto

| Ferramenta | O que faz |
|---|---|
| `search_spec_context` | Busca semântica dentro de uma spec. Top-3 seções mais relevantes para a query. |
| `get_feature_overview` | Retorna metadados + estrutura de headings da spec. Ideal para o agente se localizar antes de buscar. |

### Acompanhar implementação

| Ferramenta | O que faz |
|---|---|
| `get_repo_tasks` | Lista tarefas ativas de uma spec, agrupadas por repositório. |
| `update_task_status` | Atualiza status (`pending` → `in_progress` → `done`) ou cria nova tarefa descoberta durante implementação. |

### Manter documentação viva

| Ferramenta | O que faz |
|---|---|
| `update_spec_chunk` | Edita uma seção específica da spec por heading. Re-indexa o embedding automaticamente. |

Toda operação de escrita registra entrada no changelog.

---

## Casos de uso

- **Desenvolvimento cross-repo** — uma feature tocando API, worker, frontend e infra, com tarefas rastreáveis por repositório.
- **PRDs e RFCs** — armazenamento centralizado com busca semântica. O agente encontra o trecho exato que precisa, sem ler 30 páginas.
- **ADRs (Architecture Decision Records)** — documentação de decisões de arquitetura indexada e buscável.
- **Runbooks e playbooks** — procedimentos operacionais que evoluem com o tempo.
- **Migrações grandes** — documentação viva do que foi migrado, o que falta e decisões tomadas no caminho.
- **Onboarding** — novos engenheiros (ou agentes) consultam o SpecHub para entender o estado atual de qualquer feature.
- **Compartilhamento de contexto entre agentes** — múltiplos agentes trabalhando em sequência ou em paralelo, lendo e escrevendo na mesma base de conhecimento.

---

## Começando

### Pré-requisitos

- Node.js 22+
- Docker
- npm

### 1. Subir o banco

```bash
docker compose up -d
```

PostgreSQL 17 + pgvector na porta `5434`.

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar ambiente

```bash
cp .env.example .env
```

O padrão funciona com o docker-compose:

```
DATABASE_URL=postgresql://spechub:spechub@localhost:5434/spechub
PORT=3456
```

### 4. Rodar

```bash
npm run dev
```

No primeiro start as migrações rodam automaticamente, o modelo de embeddings é baixado (~90 MB, cache local), e o servidor MCP sobe em `http://localhost:3456`.

### 5. Conectar no agente

Adicione ao config do seu cliente MCP (Cursor, Claude Code, Windsurf, etc.):

```json
{
  "mcpServers": {
    "spechub": {
      "url": "http://localhost:3456/api/mcp/spechub/mcp"
    }
  }
}
```

---

## Arquitetura

```
┌────────────────────────────────────────────────┐
│              Interface (Mastra/MCP)             │
│  src/mastra/  — HTTP SSE endpoint em :3456     │
├────────────────────────────────────────────────┤
│           Application (Use Cases)               │
│  src/application/use-cases/  — 6 casos de uso  │
├────────────────────────────────────────────────┤
│              Domain (Interfaces)                │
│  src/domain/  — entidades, repositórios,       │
│                 IEmbeddingService              │
├────────────────────────────────────────────────┤
│          Infrastructure (Adapters)              │
│  src/infrastructure/                            │
│  ├── database/    — Sequelize + Umzug + pgvector│
│  ├── repositories/ — implementações repositórios│
│  └── services/    — XenovaEmbeddingService      │
├────────────────────────────────────────────────┤
│             Container (Awilix DI)               │
│  src/container/  — buildContainer(), singletons│
└────────────────────────────────────────────────┘
```

Clean Architecture com injeção de dependência (Awilix PROXY mode). Domínio não depende de frameworks — infraestrutura implementa contratos.

**Busca híbrida:** `0.4 × cosine_similarity + 0.6 × full-text_score + repo_boost`. Índice HNSW (pgvector) para similaridade vetorial + índice GIN para `tsvector`. O conteúdo é segmentado por headings (`##`, `###`) e cada seção é pontuada independentemente.

**Migrações:** Umzug v3 com SequelizeStorage. Executadas automaticamente no startup.

---

## Comandos

```bash
npm run dev          # Dev server com hot reload
npm run build        # Build de produção
npm run start        # Iniciar em produção
npm run test         # Vitest run
npm run typecheck    # tsc --noEmit
```

### Migrações manuais

```bash
# Ver pendentes
node -e "import('./src/infrastructure/database/umzug.js').then(m => m.umzug.pending().then(p => console.log(p.map(x => x.name))))"

# Rodar pendentes
node -e "import('./src/infrastructure/database/umzug.js').then(m => m.umzug.up())"

# Reverter última
node -e "import('./src/infrastructure/database/umzug.js').then(m => m.umzug.down())"
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| MCP Framework | Mastra v1 (`@mastra/core`, `@mastra/mcp`) |
| ORM | Sequelize v6 |
| Banco | PostgreSQL + pgvector |
| Embeddings | @xenova/transformers (all-MiniLM-L6-v2, 384d) |
| DI | Awilix |
| Migrations | Umzug v3 |
| Validação | Zod v3 |
| Testes | Vitest v4 |

---

## Licença

MIT
