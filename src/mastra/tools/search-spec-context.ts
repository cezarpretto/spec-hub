import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createSearchSpecContextTool(container: AppContainer) {
  return createTool({
    id: 'search_spec_context',
    description:
      'Search for relevant context within a spec using natural language. Combines vector similarity and full-text search to return the top-3 most relevant sections as Markdown snippets. Identify the spec by its UUID or by source_type + source_key (e.g. JIRA + SHELL-1010).',
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the spec, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "JIRA:SHELL-1010")'),
      source_type: z.string().optional().describe("External tracking tool type (e.g. 'JIRA', 'LINEAR', 'GITHUB')"),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1010')"),
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
