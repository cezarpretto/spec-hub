import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

function createUpdateSpecChunkTool(container) {
  return createTool({
    id: "update_spec_chunk",
    description: "Edit a specific section of a document by its heading. Finds the section by Markdown heading (## or ###), replaces its content, regenerates the embedding, and records a changelog entry. Last-write-wins. Identify the document by UUID or by source_type + source_key (e.g. spec + SHELL-1234).",
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234")'),
      source_type: z.string().optional().describe("Document type (e.g. 'prd', 'spec', 'design')"),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
      section_heading: z.string().describe('The heading text of the section to replace (without ## markers, e.g. "Kafka Contract")'),
      new_content: z.string().describe("New Markdown content to replace the section with (excluding the heading line)"),
      updated_by: z.string().describe("Identifier of who/what is making the change (e.g. 'claude-code', 'cezar@corp')")
    }).refine(
      (data) => data.spec_id || data.source_type && data.source_key,
      { message: "Either spec_id or (source_type + source_key) must be provided" }
    ),
    outputSchema: z.object({
      spec_id: z.string(),
      section: z.string(),
      status: z.enum(["updated", "not_found"])
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("updateSpecChunkUseCase");
      return useCase.execute(inputData);
    }
  });
}

export { createUpdateSpecChunkTool };
