import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

function createListCardDocumentsTool(container) {
  return createTool({
    id: "list_card_documents",
    description: 'List all documents stored for a given card/key. Given a source_key (e.g. "SHELL-1234"), returns every document regardless of source_type \u2014 PRD, spec, design, ADR, etc. Use this to discover what artifacts exist before searching or editing a specific one.',
    inputSchema: z.object({
      source_key: z.string().describe("The card/key to look up (e.g. 'SHELL-1234')")
    }),
    outputSchema: z.object({
      source_key: z.string(),
      documents: z.array(z.object({
        spec_id: z.string(),
        source_type: z.string(),
        title: z.string(),
        updated_at: z.string()
      }))
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("listCardDocumentsUseCase");
      return useCase.execute(inputData);
    }
  });
}

export { createListCardDocumentsTool };
