import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createSearchSpecContextTool(container: AppContainer) {
  return createTool({
    id: 'search_spec_context',
    description:
      'Search inside ONE document with a natural language question. Returns top-3 sections via vector + full-text search. HARD LIMIT: 2 calls per intent. RULE: include the section heading name verbatim in your query — e.g. if get_feature_overview shows "API Contracts", write "What does the API Contracts section define?" NOT "Qual é o contrato do endpoint?". Paraphrasing headings causes misses because the section text uses heading keywords, not your synonyms. Match query language to heading language (pt/en).',
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234")'),
      source_type: z.string().optional().describe("Document type (e.g. 'prd', 'spec', 'design'). Required to disambiguate when multiple documents share the same source_key."),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
      query: z.string().describe('Single-sentence question that INCLUDES a heading name from get_feature_overview. Example: "What does the API Contracts section define?" or "O que a secao API Contracts define?". The heading words appear in the section text — your paraphrase may not. Match the document language.'),
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
