import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createSearchSpecContextTool(container: AppContainer) {
  return createTool({
    id: 'search_spec_context',
    description:
      'Search inside ONE document with a NATURAL LANGUAGE question. Returns top-3 relevant sections by combining vector similarity + full-text search. LIMIT: do NOT call more than twice for the same intent. Write a real question (e.g. "How does the auth blocking flow work?") not a keyword dump. Use get_feature_overview first to identify section headings, then target your query. Identify document by UUID or source_type + source_key.',
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234")'),
      source_type: z.string().optional().describe("Document type (e.g. 'prd', 'spec', 'design'). Required to disambiguate when multiple documents share the same source_key."),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
      query: z.string().describe('Natural language query (e.g. "Qual o schema do evento Kafka?")'),
      repo: z.string().optional().describe('Repository name to filter/boost tasks context snippets'),
    }).refine(
      data => data.spec_id || (data.source_type && data.source_key),
      { message: 'Either spec_id or (source_type + source_key) must be provided' },
    ),
    outputSchema: z.object({
      spec_id: z.string(),
      title: z.string(),
      matches: z.array(z.object({
        section: z.string(),
        snippet: z.string(),
        score: z.number(),
      })),
    }),
    execute: async (inputData) => {
      const useCase = container.resolve('searchSpecContextUseCase')
      return useCase.execute(inputData)
    },
  })
}
