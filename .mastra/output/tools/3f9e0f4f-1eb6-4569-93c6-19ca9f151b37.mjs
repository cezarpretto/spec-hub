import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

function createSaveSpecTool(container) {
  return createTool({
    id: "save_spec",
    description: "Save a technical spec with vector embedding. Creates or updates (UPSERT) a spec by source_type + source_key. If the spec already exists, content is updated and the embedding is regenerated. The operation is atomic \u2014 if embedding fails, the spec is not saved.",
    inputSchema: z.object({
      source_type: z.string().max(32).describe("External tracking tool type (e.g. 'JIRA', 'LINEAR', 'GITHUB')"),
      source_key: z.string().max(128).describe("External tracking key/ID (e.g. 'PROJ-123')"),
      title: z.string().describe("Spec title"),
      content: z.string().describe("Markdown content of the spec"),
      updated_by: z.string().describe("Identifier of who/what is making the change (e.g. 'claude-code', 'cezar@corp')")
    }),
    outputSchema: z.object({
      spec_id: z.string(),
      title: z.string(),
      status: z.enum(["created", "updated"])
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("saveSpecUseCase");
      return useCase.execute(inputData);
    }
  });
}

export { createSaveSpecTool };
