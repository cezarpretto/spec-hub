# SpecHub MCP Server

**Servidor MCP (`spechub-mcp`) para armazenamento, indexação vetorial e edição contínua de especificações técnicas, PRDs e tarefas — a fonte da verdade para documentação cross-repo.**

Agentes de IA (Cursor, Windsurf, Claude Code) e desenvolvedores leem, buscam e mantêm specs diretamente do IDE, sem sair do fluxo de trabalho. O SpecHub substitui o Confluence como ponto central de documentação técnica viva.

```mermaid
flowchart LR
    A[IDE / Agente MCP] -->|save_spec| B[(SpecHub)]
    A -->|search_spec_context| B
    A -->|get_feature_overview| B
    A -->|update_spec_chunk| B
    A -->|get_repo_tasks| B
    A -->|update_task_status| B
    B --> C[PostgreSQL + pgvector]
    B --> D[Embeddings via all-MiniLM-L6-v2]
```

## Por que existe?

- **Documentação espalhada** — specs vivem em Confluence, Jira, Google Docs e READMEs de repositórios diferentes. Ninguém sabe onde está a versão canônica.
- **Cross-repo é doloroso** — uma feature toca 3+ repositórios. Cada repo tem seu próprio backlog de tarefas, sem visão unificada do que falta fazer.
- **Context window dos agentes é limitada** — jogar uma spec inteira no prompt consome tokens e degrada a qualidade das respostas. Busca semântica resolve isso.
- **Docs estagnam** — specs são escritas no início e nunca mais atualizadas. O SpecHub foi desenhado para edição contínua durante a implementação.

## O que faz?

| Ferramenta MCP | Descrição |
|---|---|
| `save_spec` | Persiste uma spec com embedding vetorial. UPSERT por `source_type` + `source_key`. |
| `get_feature_overview` | Retorna metadados da spec + estrutura de headings (`##`, `###`). |
| `search_spec_context` | Busca semântica (vetorial + full-text) dentro de uma spec. Top-3 seções mais relevantes. |
| `get_repo_tasks` | Lista tarefas ativas (não `done`) de uma spec, agrupadas por repositório. |
| `update_task_status` | Atualiza status de uma tarefa (`pending` → `in_progress` → `done`) ou cria nova tarefa. |
| `update_spec_chunk` | Edita uma seção específica da spec por heading. Re-indexa o embedding. Last-write-wins. |

Cada operação registra entrada na tabela de changelog (`changelog`), permitindo auditoria completa de quem alterou o quê e quando.

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

- **Clean Architecture** — domínio não depende de frameworks. Infraestrutura implementa contratos.
- **Awilix** (PROXY mode) — injeção de dependência com construtor único `deps: Dependencies`.
- **Embeddings locais** — `Xenova/all-MiniLM-L6-v2` (384 dimensões), sem API externa. Geração via `@xenova/transformers` com `pooling: mean, normalize: true`.
- **Busca híbrida** — `0.4 * cosine_similarity + 0.6 * full-text_score + repo_boost`. Índice HNSW no pgvector + índice GIN no `tsvector`.
- **Migrações** — Umzug v3 com SequelizeStorage. Executadas automaticamente no startup.

## Stack

| Camada | Tecnologia |
|---|---|
| MCP Framework | Mastra v1 (`@mastra/core`, `@mastra/mcp`) |
| ORM | Sequelize v6 |
| Banco | PostgreSQL + pgvector |
| Embeddings | @xenova/transformers (all-MiniLM-L6-v2) |
| DI | Awilix |
| Migrations | Umzug v3 |
| Validação | Zod v3 |
| Testes | Vitest v4 |
| Runtime | Node.js 22+, ESM |

## Começando

### Pré-requisitos

- Node.js 22+
- Docker (para PostgreSQL/pgvector)
- npm

### 1. Subir o banco

```bash
docker compose up -d
```

Isso sobe um PostgreSQL 17 com pgvector na porta `5434`.

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

O padrão já funciona com o docker-compose:

```
DATABASE_URL=postgresql://spechub:spechub@localhost:5434/spechub
PORT=3456
```

### 4. Rodar

```bash
npm run dev
```

No primeiro start:
- As migrações rodam automaticamente (cria tabelas `specs`, `tasks`, `changelog` + índices HNSW/GIN)
- O modelo de embeddings `all-MiniLM-L6-v2` é baixado (~90 MB, cache local)
- O servidor MCP sobe em `http://localhost:3456`

### 5. Conectar no seu agente

Adicione ao config do seu cliente MCP (Cursor, Claude Code, etc.):

```json
{
  "mcpServers": {
    "spechub": {
      "url": "http://localhost:3456/sse"
    }
  }
}
```

## Comandos

```bash
npm run dev          # mastra dev (dev server com hot reload)
npm run build        # mastra build
npm run start        # mastra start (produção)
npm run test         # vitest run
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

## Estrutura do projeto

```
src/
  domain/                              # Regras de negócio (interfaces puras)
    entities.ts                        # Spec, Task, ChangelogEntry
    repositories.ts                    # ISpecRepository, ITaskRepository, IChangelogRepository
    services.ts                        # IEmbeddingService
  application/                         # Casos de uso (orquestração)
    dto.ts                             # Input/Output DTOs
    use-cases/                         # save-spec, get-feature-overview, search-spec-context,
                                       # get-repo-tasks, update-task-status, update-spec-chunk
  infrastructure/                      # Adaptadores
    database/
      connection.ts                    # Instância Sequelize
      umzug.ts                         # Runner de migrações
      migrations/                      # Arquivos de migração (extensions, specs, tasks, changelog)
      models/                          # sequelize.define()
    repositories/                      # Implementações Sequelize dos repositórios
    services/                          # XenovaEmbeddingService
  container/                           # IoC/DI (Awilix)
    index.ts                           # buildContainer()
    types.ts                           # AppContainer
  mastra/                              # Interface MCP
    index.ts                           # Entry point
    mcp.ts                             # createSpecHubMcpServer()
    tools/                             # 6 fábricas de ferramentas MCP
tests/                                 # Vitest (casos de uso mockados)
```

## Testes

Testes validam contratos JSON input → JSON output das ferramentas MCP. Casos de uso são mockados via Awilix `asValue()` — sem banco real, sem embeddings reais.

```bash
npm run test
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `DATABASE_URL` | `postgresql://spechub:spechub@localhost:5434/spechub` | Conexão PostgreSQL |
| `PORT` | `3456` | Porta do servidor HTTP |

## Licença

MIT
