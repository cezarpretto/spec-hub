---
name: spechub-dev
description: SpecHub MCP server development conventions. Use when adding new MCP tools, modifying DB schema, working with embeddings, writing tests, or configuring the Mastra MCP server. Triggers on keywords: spec, spechub, MCP tool, pgvector, embedding, Mastra, save_spec, get_feature_overview, dbOps, createTool.
---

# SpecHub Development Skill

Guidance for developing the SpecHub MCP server.

## Adding a new MCP tool

1. Create `src/mastra/tools/<tool-name>.ts`:

```ts
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { dbOps } from "../../lib/db/queries.js"

export const myTool = createTool({
  id: "my_tool",
  description: "What this tool does.",
  inputSchema: z.object({
    param1: z.string().describe("description"),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async (inputData) => {
    const { param1 } = inputData
    // ... business logic using dbOps
    return { result: "..." }
  },
})
```

2. Register in `src/mastra/mcp.ts`:

```ts
import { myTool } from "./tools/my-tool.js"

export const specHubMcpServer = new MCPServer({
  // ...
  tools: {
    save_spec: saveSpecTool,
    get_feature_overview: getFeatureOverviewTool,
    my_tool: myTool,
  },
})
```

3. Add tests in `tests/<tool-name>.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../src/lib/db/queries.js", () => ({
  dbOps: {
    upsertSpec: vi.fn(),
    getSpecById: vi.fn(),
    insertChangelog: vi.fn(),
  },
}))

const { dbOps } = await import("../src/lib/db/queries.js")
const { myTool } = await import("../src/mastra/tools/my-tool.js")

describe("my_tool", () => {
  beforeEach(() => vi.clearAllMocks())

  it("happy path", async () => {
    vi.mocked(dbOps.someMethod).mockResolvedValue({ ... })
    const result = await myTool.execute!({ param1: "test" })
    expect(result).toEqual({ result: "..." })
  })
})
```

## Schema changes

1. Edit `src/lib/db/migrations.ts` — add `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE`.
2. Edit `src/lib/types.ts` — add/update TypeScript interfaces.
3. Edit `src/lib/db/queries.ts` — add new methods to `dbOps`.
4. Run `npm run typecheck` to verify.
5. Tests should mock the new `dbOps` methods.

## Key invariants

- Embedding failure MUST NOT persist data. Test this.
- UPSERT uses `(source_type, source_key)` as unique key.
- Changelog entries are created for every spec modification.
- Tool errors are thrown as `Error` (Mastra converts to MCP error response).
- `initEmbedding()` must complete before any tool uses `generateEmbedding()`.
