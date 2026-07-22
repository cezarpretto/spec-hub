# Claude instructions for SpecHub MCP Server

This file provides Claude-specific instructions for working with this codebase.
Also picked up by Cursor and other AI coding agents that support CLAUDE.md.

## Project identity

You are working on **SpecHub**, an MCP server built with Mastra v1 that stores
technical specs with vector embeddings (PostgreSQL/pgvector). It replaces
Confluence as the source of truth for cross-repo technical documentation.

## Architecture

- **Framework:** Mastra v1 (`@mastra/core`, `@mastra/mcp`)
- **DB:** PostgreSQL + pgvector (port 5434, db `spechub`)
- **Embedding:** `@xenova/transformers` running `Xenova/paraphrase-multilingual-MiniLM-L12-v2` locally
- **Protocol:** MCP over SSE/HTTP

## Key files

- `src/mastra/index.ts` — App entry. Auto-migration + embedding init + Mastra instance.
- `src/mastra/mcp.ts` — MCPServer with tool registration.
- `src/mastra/tools/*.ts` — Tool implementations using `createTool()`.
- `src/lib/db/queries.ts` — DB access layer (single seam for mocking in tests).
- `src/lib/db/migrations.ts` — Schema creation (idempotent `IF NOT EXISTS`).
- `src/lib/embedding/index.ts` — Model loading and vector generation.
- `tests/*.test.ts` — Contract tests (JSON input → JSON output).

## Workflow

1. `docker compose up -d` to start the database.
2. `npm run dev` to start the MCP server (runs migrations, loads model, starts HTTP).
3. `npm test` to run the test suite.
4. `npm run typecheck` to verify types.

## Rules

- Always use `createTool` from `@mastra/core/tools` for new tools.
- Register new tools in `src/mastra/mcp.ts`.
- Mock `dbOps` (not raw SQL) in tests.
- Embedding model must be exercised with REAL calls in tests.
- Tool input/output schemas use `zod` with `.describe()` for each field.
- Never introduce an ORM — use `pg` directly.
- Never introduce external embedding APIs — use `@xenova/transformers` local pipeline.
