import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createSaveSpecFromConfluenceTool(container: AppContainer) {
  return createTool({
    id: 'save_spec_from_confluence',
    description:
      'Import a Confluence page into SpecHub as a Spec document. Converts the page body from its original format (html, markdown, or adf) to clean Markdown, builds a metadata header from the page envelope, and persists via save_spec. Use this when migrating specs from Confluence to SpecHub. Pass the page envelope JSON as returned by the Confluence MCP getConfluencePage tool, plus the content body in the format you requested.',
    inputSchema: z.object({
      source_key: z.string().max(128).describe("Confluence page ID (e.g. '123456789'). Used as the unique key for the Spec."),
      page_envelope: z.object({
        id: z.string().optional(),
        title: z.string().optional(),
        space: z.object({
          key: z.string().optional(),
          name: z.string().optional(),
        }).optional(),
        version: z.object({
          number: z.number().optional(),
          by: z.object({ displayName: z.string().optional() }).optional(),
          when: z.string().optional(),
        }).optional(),
        history: z.object({
          createdBy: z.object({ displayName: z.string().optional() }).optional(),
          createdDate: z.string().optional(),
        }).optional(),
      }).passthrough().describe('Confluence page envelope JSON as returned by the Confluence MCP getConfluencePage tool.'),
      content: z.string().describe('Page body in the format specified by content_format.'),
      content_format: z.enum(['html', 'markdown', 'adf']).describe("Format of the page body. Use 'html' for best fidelity (Confluence storage format), 'markdown' for simplified text, or 'adf' for ADF JSON."),
      updated_by: z.string().describe("Identifier of who/what is making the change (e.g. 'claude-code', 'cezar@corp')."),
    }),
    outputSchema: z.object({
      spec_id: z.string(),
      title: z.string(),
      status: z.enum(['created', 'updated']),
    }),
    execute: async (inputData) => {
      const useCase = container.resolve('importSpecFromConfluenceUseCase')
      return useCase.execute(inputData)
    },
  })
}
