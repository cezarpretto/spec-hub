import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

function createSearchSpecContextTool(container) {
  return createTool({
    id: "search_spec_context",
    description: "Search within a specific document using natural language. Combines vector similarity and full-text search to return the top-3 most relevant sections. Identify the document by UUID or by source_type + source_key (e.g. spec + SHELL-1234). Since multiple documents can share the same source_key with different source_type, always include the specific source_type to target the right document.",
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234")'),
      source_type: z.string().optional().describe("Document type (e.g. 'prd', 'spec', 'design'). Required to disambiguate when multiple documents share the same source_key."),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
      query: z.string().describe('Natural language query (e.g. "Qual o schema do evento Kafka?")'),
      repo: z.string().optional().describe("Repository name to filter/boost tasks context snippets")
    }).refine(
      (data) => data.spec_id || data.source_type && data.source_key,
      { message: "Either spec_id or (source_type + source_key) must be provided" }
    ),
    outputSchema: z.object({
      spec_id: z.string(),
      title: z.string(),
      matches: z.array(z.object({
        section: z.string(),
        snippet: z.string(),
        score: z.number()
      }))
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("searchSpecContextUseCase");
      return useCase.execute(inputData);
    }
  });
}

export { createSearchSpecContextTool };
