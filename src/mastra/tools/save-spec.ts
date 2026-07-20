import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { embeddingService } from "../../lib/embedding/index.js";
import { dbOps } from "../../lib/db/queries.js";
import type { SaveSpecOutput } from "../../lib/types.js";

export const saveSpecTool = createTool({
  id: "save_spec",
  description:
    "Save a technical spec with vector embedding. Creates or updates (UPSERT) a spec by source_type + source_key. If the spec already exists, content is updated and the embedding is regenerated. The operation is atomic — if embedding fails, the spec is not saved.",
  inputSchema: z.object({
    source_type: z.string().max(32).describe("External tracking tool type (e.g. 'JIRA', 'LINEAR', 'GITHUB')"),
    source_key: z.string().max(128).describe("External tracking key/ID (e.g. 'PROJ-123')"),
    title: z.string().describe("Spec title"),
    content: z.string().describe("Markdown content of the spec"),
    updated_by: z.string().describe("Identifier of who/what is making the change (e.g. 'claude-code', 'cezar@corp')"),
  }),
  outputSchema: z.object({
    spec_id: z.string(),
    title: z.string(),
    status: z.enum(["created", "updated"]),
  }),
  execute: async (inputData): Promise<SaveSpecOutput> => {
    const { source_type, source_key, title, content, updated_by } = inputData;

    const embedding = await embeddingService.generateEmbedding(content);

    const result = await dbOps.upsertSpec({
      source_type,
      source_key,
      title,
      content,
      embedding,
      updated_by,
    });

    return { spec_id: result.spec_id, title, status: result.status };
  },
});
