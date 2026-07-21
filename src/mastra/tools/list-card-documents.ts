import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createListCardDocumentsTool(container: AppContainer) {
  return createTool({
    id: 'list_card_documents',
    description:
      'ALWAYS CALL THIS FIRST. Lists all documents for a card/key regardless of source_type (prd, spec, design, ADR, etc.). Use this before any other tool to discover what artifacts exist. Never assume a source_key has only one document — multiple source_types can share the same key.',
    inputSchema: z.object({
      source_key: z.string().describe("The card/key to look up (e.g. 'SHELL-1234')"),
    }),
    outputSchema: z.object({
      source_key: z.string(),
      documents: z.array(z.object({
        spec_id: z.string(),
        source_type: z.string(),
        title: z.string(),
        updated_at: z.string(),
      })),
    }),
    execute: async (inputData) => {
      const useCase = container.resolve('listCardDocumentsUseCase')
      return useCase.execute(inputData)
    },
  })
}
