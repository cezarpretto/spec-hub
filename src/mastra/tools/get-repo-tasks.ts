import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createGetRepoTasksTool(container: AppContainer) {
  return createTool({
    id: 'get_repo_tasks',
    description:
      'Returns active tasks linked to a spec document. Each task includes a context_snippet — this IS your implementation brief. Read it before searching the spec. The spec contains architectural decisions and API contracts; the snippet contains repo-specific implementation instructions. Use search_spec_context only to confirm contracts/design decisions referenced by the snippet. Always resolve through list_card_documents first.',
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the spec document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234"). Tasks are linked to the spec, so pass the SPEC document id, not the tasks document id.'),
      source_type: z.string().optional().describe("Document type to resolve — use 'spec' to get tasks linked to the technical spec"),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
      repo: z.string().optional().describe('Repository name to filter tasks (e.g. "api"). Omit to list all repos with active tasks.'),
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
