# SpecHub MCP Server

Servidor MCP centralizado para armazenamento e busca de especificacoes tecnicas.
Stack: Node.js + Mastra v1 + PostgreSQL/pgvector + @xenova/transformers (all-MiniLM-L6-v2).

## Project layout

```
src/mastra/index.ts          # Mastra instance + startup (auto-migrate, embedding)
src/mastra/mcp.ts            # MCPServer definition (tool registration)
src/mastra/tools/*.ts        # MCP tools (save_spec, get_feature_overview, ...)
src/lib/db/connection.ts     # pg Pool (connectionString from DATABASE_URL env)
src/lib/db/migrations.ts     # CREATE EXTENSION, CREATE TABLE IF NOT EXISTS, indices
src/lib/db/queries.ts        # upsertSpec, getSpecById, insertChangelog
src/lib/embedding/index.ts   # Xenova/all-MiniLM-L6-v2 (384 dims), init + generate
src/lib/types.ts             # Shared interfaces
tests/*.test.ts              # Vitest tests
```

## Commands

```bash
npm run dev          # mastra dev (starts HTTP server on PORT, default 3456)
npm run build        # mastra build
npm run test         # vitest run
npm run typecheck    # tsc --noEmit
docker compose up -d # start PostgreSQL/pgvector on :5434
```

## Architecture conventions

### Tools (MCP)

- Use `createTool` from `@mastra/core/tools` with `zod` schemas.
- `inputSchema` defines the JSON contract. `outputSchema` defines the return shape.
- `execute(inputData)` receives parsed input directly; DO NOT destructure `{ context }`.
- Tools live in `src/mastra/tools/` and are registered in `src/mastra/mcp.ts`.
- Tool IDs use `snake_case`: `save_spec`, `get_feature_overview`.

### Database

- `dbOps` (in `src/lib/db/queries.ts`) is the single seam for database access.
- All DB calls go through `query()` from `connection.ts` (pg Pool).
- UPSERT semantics: find by `(source_type, source_key)`, then INSERT or UPDATE.
- Embedding serialization: `toPgVector(embedding[])` => `[0.1,0.2,...]` string.
- In tests, mock `dbOps` via `vi.mock("../src/lib/db/queries.js")`.

### Embedding

- Model: `Xenova/all-MiniLM-L6-v2`, loaded via `@xenova/transformers` pipeline.
- 384-dimensional vectors, generated with `pooling: "mean", normalize: true`.
- `initEmbedding()` must be called before any `generateEmbedding()` call.
- In tests, embedding is exercised with REAL model calls (not mocked).
- Embedding failure => spec is NOT persisted (tested).

### Testing

- Framework: Vitest. Config: `vitest.config.ts`.
- DB is mocked (`dbOps`); embedding is real (`FeatureExtractionPipeline`).
- Tests validate JSON input -> JSON output contracts of tools.
- Factory functions (`buildSpec()`) provide test data.
- Test file naming: `tests/<tool-name>.test.ts`.

### Startup flow

1. `src/mastra/index.ts` loads via Mastra CLI (`mastra dev`).
2. Top-level await calls `runMigrations()` then `initEmbedding()`.
3. Mastra instance created with `mcpServers` and `server.port`.
4. Auto-migration creates `specs`, `tasks`, `changelog` tables + indices (HNSW, GIN).
5. MCPServer exposes tools over SSE/HTTP at configured port.

## Env vars

| Variable      | Default                                                    | Description            |
| ------------- | ---------------------------------------------------------- | ---------------------- |
| `DATABASE_URL` | `postgresql://spechub:spechub@localhost:5434/spechub`    | PostgreSQL connection  |
| `PORT`         | `3456`                                                     | HTTP server port       |

## Dependencies key decisions

- `@mastra/core@^1.51` + `@mastra/mcp@^1.14`: Mastra v1 MCP framework.
- `@xenova/transformers@^2.17`: local embedding, no external API.
- `pg@^8`: direct PostgreSQL driver (no ORM).
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
