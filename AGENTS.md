# SpecHub MCP Server

Servidor MCP centralizado para armazenamento e busca de especificacoes tecnicas.
Stack: Node.js + Mastra v1 + Sequelize + PostgreSQL/pgvector + @xenova/transformers (paraphrase-multilingual-MiniLM-L12-v2).

## Project layout

```
src/
  domain/                              # Enterprise business rules
    entities.ts                        # Spec, Task, ChangelogEntry interfaces
    repositories.ts                    # ISpecRepository, ITaskRepository, IChangelogRepository
    services.ts                        # IEmbeddingService interface
  application/                         # Use cases (orchestration)
    dto.ts                             # Input/Output DTOs
    use-cases/                         # One class per use case
  infrastructure/                      # Adapters, frameworks, drivers
    database/
      connection.ts                    # Sequelize instance (connectionString from DATABASE_URL)
      umzug.ts                         # Umzug instance (migration runner)
      migrations/                      # Individual migration files (001-xxx.ts, 002-xxx.ts, ...)
      models/                          # sequelize.define() model definitions
    repositories/                      # Sequelize implementations of domain repository interfaces
    services/                          # XenovaEmbeddingService (implements IEmbeddingService)
  container/                           # IoC / DI (Awilix)
    index.ts                           # buildContainer() — registers all singletons
    types.ts                           # AppContainer type alias
  mastra/                              # Interface / MCP presentation
    index.ts                           # Entry point: migrates, builds container, starts Mastra
    mcp.ts                             # createSpecHubMcpServer(container)
    tools/                             # Factory functions: createXxxTool(container)
tests/                                 # Vitest tests (mock use cases via Awilix asValue)
```

## Commands

```bash
npm run dev          # mastra dev (starts HTTP server on PORT, default 3456)
npm run build        # mastra build
npm run test         # vitest run
npm run typecheck    # tsc --noEmit
npm run lint         # full pipeline: typecheck → check:circular → eslint → test
npm run lint:eslint  # ESLint only (no-duplicate-imports, unused-vars, etc.)
npm run check:circular # madge: detect circular dependencies
docker compose up -d # start PostgreSQL/pgvector on :5434
```

## Architecture conventions

### Clean Architecture layers

- **Domain** (`src/domain/`): interfaces only. No imports from other layers. Defines entities, repository abstractions (ISP), and service abstractions.
- **Application** (`src/application/`): use cases with constructor injection. Depend only on domain interfaces. DTOs define input/output contracts.
- **Infrastructure** (`src/infrastructure/`): Sequelize models, repository implementations, embedding service. Implements domain interfaces.
- **Interface** (`src/mastra/`): MCP tools as factory functions receiving the container. Resolve use cases at runtime.
- **Container** (`src/container/`): Awilix IoC. All registrations are SINGLETON. Wires interfaces -> implementations.

### Dependency Injection (Awilix)

- `buildContainer()` in `src/container/index.ts` creates and registers all dependencies.
- Use cases receive repositories and services via **single object** constructor injection (PROXY mode).
- Awilix PROXY mode passes the entire cradle as one argument — constructors must receive `deps: Dependencies`.
- In tests, register mock use cases with `asValue(mockUseCase)`.

```ts
// Awilix PROXY mode: single deps object, not multiple params
class MyUseCase {
  private readonly specRepository: ISpecRepository

  constructor(deps: { specRepository: ISpecRepository }) {
    this.specRepository = deps.specRepository
  }
}

// Example: registering a mock in tests
import { createContainer, asValue } from 'awilix'
const mockUseCase = { execute: vi.fn() }
const container = createContainer()
container.register({ saveSpecUseCase: asValue(mockUseCase) })
```

### Tools (MCP)

- Each tool file exports a factory function that receives `AppContainer`.
- `inputSchema` defines the JSON contract. `outputSchema` defines the return shape.
- `execute(inputData)` resolves the use case from container and delegates.
- Tool IDs use `snake_case`: `save_spec`, `get_feature_overview`, `search_spec_context`.

### Database (Sequelize)

- `sequelize.define()` for model definitions in `src/infrastructure/database/models/`.
- Repositories implement domain interfaces, using Sequelize models internally.
- `raw: true` used for read queries; `create`/`update` for writes.
- Embedding serialization: `[0.1,0.2,...]` string stored in `embedding TEXT` column.
- UPSERT semantics: find by `(source_type, source_key)`, then INSERT or UPDATE.

### Migrations (Umzug)

Migrations are managed via **Umzug v3** with `SequelizeStorage`. Each migration is a separate file under `src/infrastructure/database/migrations/`.

**File naming:** `YYYYMMDDHHmmss-descriptive-name.ts` (e.g. `20260720180005-add-user-table.ts`)

**Template for new migrations:**

```ts
// src/infrastructure/database/migrations/20260720180005-add-user-table.ts
import type { Sequelize } from 'sequelize'

export const m20260720180005AddUserTable = {
  name: '20260720180005-add-user-table',
  async up(sequelize: Sequelize) {
    await sequelize.query(`CREATE TABLE IF NOT EXISTS users (...)`);
  },
  async down(sequelize: Sequelize) {
    await sequelize.query(`DROP TABLE IF EXISTS users`);
  },
}
```

**After creating the file, register it in `migrations/index.ts`:**

```ts
import { m20260720180005AddUserTable } from './20260720180005-add-user-table.js'
// Add to the exports and migrations array
export const migrations = [
  ...existing,
  m20260720180005AddUserTable,
]
```

**How migrations run:**

- On startup (`src/mastra/index.ts`), `umzug.up()` runs all pending migrations automatically.
- Umzug tracks executed migrations in the `SequelizeMeta` table (created automatically).
- Already-executed migrations are skipped.

**CLI commands (manual):**

```bash
# Run pending migrations (happens on startup, can also run via script)
node -e "import('./src/infrastructure/database/umzug.js').then(m => m.umzug.up())"

# Revert last migration
node -e "import('./src/infrastructure/database/umzug.js').then(m => m.umzug.down())"

# Show migration status
node -e "import('./src/infrastructure/database/umzug.js').then(m => m.umzug.pending().then(p => console.log('Pending:', p.map(m => m.name))))"

# Revert all migrations
node -e "import('./src/infrastructure/database/umzug.js').then(m => m.umzug.down({ to: 0 }))"
```

### Embedding

- Model: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, loaded via `@xenova/transformers` pipeline.
- 384-dimensional vectors, generated with `pooling: "mean", normalize: true`.
- Supports 50+ languages including Portuguese and English.
- `XenovaEmbeddingService.initialize()` called once at startup.
- In tests, embedding service is NOT used — use cases are fully mocked.

### Testing

- Framework: Vitest. Config: `vitest.config.ts`.
- Use cases are mocked via Awilix `asValue()` — no real DB, no real embedding.
- Tests validate JSON input -> JSON output contracts of tools.
- Factory functions (`buildInput()`) provide test data.
- Test file naming: `tests/<tool-name>.test.ts`.
- Always run `npm run lint` before committing — it runs typecheck, circular dep check, ESLint, and tests in sequence.

### Startup flow

1. `src/mastra/index.ts` loads via Mastra CLI (`mastra dev`).
2. Top-level await calls `umzug.up()` (runs pending migrations).
3. Container is built (`buildContainer()`).
4. `embeddingService.initialize()` loads the Xenova model.
5. MCPServer is created with all tools.
6. Mastra instance exposes tools over SSE/HTTP at configured port.

## Env vars

Database connection uses individual vars first, falls back to `DATABASE_URL`.

| Variable           | Default      | Description                                 |
| ------------------ | ------------ | ------------------------------------------- |
| `DATABASE_HOST`     | —            | PostgreSQL host (takes priority over URL)   |
| `DATABASE_PORT`     | —            | PostgreSQL port (takes priority over URL)   |
| `DATABASE_USER`     | —            | PostgreSQL user (takes priority over URL)   |
| `DATABASE_PASSWORD` | —            | PostgreSQL password (takes priority over URL) |
| `DATABASE_NAME`     | —            | PostgreSQL database (takes priority over URL) |
| `DATABASE_URL`      | `postgresql://spechub:spechub@localhost:5434/spechub` | Fallback connection string |
| `PORT`              | `3456`        | HTTP server port                            |

## Docker

```bash
docker build -t spechub-mcp .

docker run -d \
  --name spechub \
  -p 3456:3456 \
  -e DATABASE_HOST=host.docker.internal \
  -e DATABASE_PORT=5434 \
  -e DATABASE_USER=spechub \
  -e DATABASE_PASSWORD=spechub \
  -e DATABASE_NAME=spechub \
  -v spechub-model-cache:/app/.cache \
  spechub-mcp
```

The embedding model (~470MB) downloads on first startup into `/app/.cache`. Mount a volume to persist it across restarts.

Public image: `cezarpretto/spechub-mcp:latest` (Docker Hub). Multi-platform (linux/amd64, linux/arm64).

## Dependencies key decisions

- `@mastra/core@^1.51` + `@mastra/mcp@^1.14`: Mastra v1 MCP framework.
- `sequelize@^6`: ORM with `define()` models + repository pattern.
- `awilix`: IoC container for dependency injection.
- `umzug@^3`: Migration runner with SequelizeStorage.
- `@xenova/transformers@^2.17`: local embedding, no external API.
- `pg@^8`: PostgreSQL driver (used by Sequelize dialect).
- `zod@^3`: input/output schema validation for tools.
- `vitest@^4`: test runner.

## Code style

- ESM modules only (`"type": "module"` in package.json).
- No semicolons.
- 2-space indentation.
- Single quotes for strings.
- No comments unless explaining _why_, not _what_.
- Import order: external libs first, then internal modules.
- File extensions in imports: always `.js` (TypeScript convention for ESM).
