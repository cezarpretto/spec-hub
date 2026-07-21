import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createGetFeatureOverviewTool(container: AppContainer) {
  return createTool({
    id: 'get_feature_overview',
    description:
      'Returns document metadata and an index of headings (## and ###) extracted from the Markdown content. Identify by UUID or by source_type + source_key (e.g. spec + SHELL-1234). Since multiple documents can share the same source_key with different source_type, always include the specific source_type.',
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234")'),
      source_type: z.string().optional().describe("Document type (e.g. 'prd', 'spec', 'design'). Required to disambiguate when multiple documents share the same source_key."),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
    }).refine(
      data => data.spec_id || (data.source_type && data.source_key),
      { message: 'Either spec_id or (source_type + source_key) must be provided' },
    ),
    outputSchema: z.object({
      spec_id: z.string(),
      title: z.string(),
      source: z.object({
        type: z.string(),
        key: z.string(),
      }),
      sections: z.array(z.object({
        heading: z.string(),
        level: z.number(),
      })),
      updated_at: z.string(),
    }),
    execute: async (inputData) => {
      const useCase = container.resolve('getFeatureOverviewUseCase')
      return useCase.execute(inputData)
    },
  })
}
