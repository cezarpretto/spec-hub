import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createSaveSpecTool(container: AppContainer) {
  return createTool({
    id: 'save_spec',
    description:
      'Save a technical document with vector embedding. The unique key is the pair (source_type, source_key). Different source_type values for the same source_key create separate documents — use this to store multiple artifacts for one card. For example, to save all artifacts for card SHELL-1234: save with source_type=prd + source_key=SHELL-1234, then save again with source_type=spec + source_key=SHELL-1234, then again with source_type=design + source_key=SHELL-1234. Each will be a distinct document, searchable independently. If you save again with the same source_type+source_key pair, the existing document is updated (UPSERT) and its embedding regenerated.',
    inputSchema: z.object({
      source_type: z.string().max(32).describe("Document type. Use 'prd' for product requirements, 'spec' for technical specification, 'design' for architecture/design docs, or your own convention like 'jira', 'linear', 'github', 'adr', 'runbook'. Multiple documents with different source_type can share the same source_key."),
      source_key: z.string().max(128).describe("External tracking key/ID (e.g. 'SHELL-1234', 'PROJ-456'). The same source_key can be used across multiple source_type values to group related documents for the same card."),
      title: z.string().describe('Document title'),
      content: z.string().describe('Markdown content of the document'),
      updated_by: z.string().describe("Identifier of who/what is making the change (e.g. 'claude-code', 'cezar@corp')"),
    }),
    outputSchema: z.object({
      spec_id: z.string(),
      title: z.string(),
      status: z.enum(['created', 'updated']),
    }),
    execute: async (inputData) => {
      const useCase = container.resolve('saveSpecUseCase')
      return useCase.execute(inputData)
    },
  })
}
