import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createGetRepoTasksTool(container: AppContainer) {
  return createTool({
    id: 'get_repo_tasks',
    description:
      'Returns only the active tasks (status != done) for a specific repository within a spec. Returns tasks grouped by intent as clean Markdown — minimal tokens, maximum focus. Identify the spec by its UUID or by source_type + source_key (e.g. JIRA + SHELL-1010).',
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the spec, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "JIRA:SHELL-1010")'),
      source_type: z.string().optional().describe("External tracking tool type (e.g. 'JIRA', 'LINEAR', 'GITHUB')"),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1010')"),
      repo: z.string().optional().describe('Repository name to filter tasks (e.g. "service-payments-consumer"). Omit to list all repos with active tasks.'),
    }).refine(
      data => data.spec_id || (data.source_type && data.source_key),
      { message: 'Either spec_id or (source_type + source_key) must be provided' },
    ),
    outputSchema: z.object({
      spec_id: z.string(),
      repos: z.array(z.object({
        repo: z.string(),
        tasks: z.array(z.object({
          id: z.string(),
          status: z.string(),
          intent: z.string(),
          title: z.string(),
          context_snippet: z.string(),
        })),
      })),
    }),
    execute: async (inputData) => {
      const useCase = container.resolve('getRepoTasksUseCase')
      return useCase.execute(inputData)
    },
  })
}
