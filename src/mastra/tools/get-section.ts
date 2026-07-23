import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createGetSectionTool(container: AppContainer) {
  return createTool({
    id: 'get_section',
    description:
      'Get the full content of a specific section identified by its heading. Use this when search_spec_context returns a truncated snippet and you need the complete section. Identify the document by UUID or by source_type + source_key.',
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234")'),
      source_type: z.string().optional().describe("Document type (e.g. 'prd', 'spec', 'design'). Required to disambiguate when multiple documents share the same source_key."),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
      section_heading: z.string().describe('The heading text of the section to retrieve (without ## markers, e.g. "Kafka Contract")'),
    }).refine(
      data => data.spec_id || (data.source_type && data.source_key),
      { message: 'Either spec_id or (source_type + source_key) must be provided' },
    ),
    outputSchema: z.object({
      spec_id: z.string(),
      section: z.string(),
      content: z.string(),
      status: z.enum(['found', 'not_found']),
    }),
    execute: async (inputData) => {
      const useCase = container.resolve('getSectionUseCase')
      return useCase.execute(inputData)
    },
  })
}
