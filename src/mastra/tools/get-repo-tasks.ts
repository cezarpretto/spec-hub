import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createGetRepoTasksTool(container: AppContainer) {
  return createTool({
    id: 'get_repo_tasks',
    description:
      'Returns active tasks (status != done) linked to a spec document. Tasks live in a separate table and are linked to the spec document — always pass the spec_id of the spec document, NOT the tasks document. To find the correct spec_id: use list_card_documents(shell) to see all documents, then use the spec_id from the document with source_type=spec. If no repo is specified, tasks from all repos are returned grouped by repo.',
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
