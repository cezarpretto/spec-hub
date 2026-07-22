import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createSearchSpecContextTool(container: AppContainer) {
  return createTool({
    id: 'search_spec_context',
    description:
      'Search inside ONE document with a NATURAL LANGUAGE question. Returns top-3 relevant sections via vector + full-text search. HARD LIMIT: call at most TWICE per intent. The embedding model supports 50+ languages — write the query in the SAME LANGUAGE as the document (check headings from get_feature_overview to detect). Write a plain sentence like "How does auth blocking work?" (English) or "Como funciona o bloqueio de autenticacao?" (Portuguese) — NEVER paste keyword lists, code slugs, or mixed-language strings. Use headings to scope your query to one section at a time.',
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234")'),
      source_type: z.string().optional().describe("Document type (e.g. 'prd', 'spec', 'design'). Required to disambiguate when multiple documents share the same source_key."),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
      query: z.string().describe('A single-sentence question in the DOCUMENT\'S LANGUAGE. Check headings from get_feature_overview — if headings are in Portuguese, write the query in Portuguese. If English, write in English. Example pt: "Como funciona o bloqueio de login?". Example en: "How does auth blocking work?". Do NOT paste code symbols, mixed languages, or multiple questions.'),
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
