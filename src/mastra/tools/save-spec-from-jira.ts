import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { AppContainer } from '../../container/types.js'

export function createSaveSpecFromJiraTool(container: AppContainer) {
  return createTool({
    id: 'save_spec_from_jira',
    description:
      'Import a Jira issue into SpecHub as a Spec document. Converts the issue description and comments from their original format (markdown, adf, or html) to clean Markdown, builds a metadata header from the issue envelope, and persists via save_spec. Use this when migrating specs from Jira to SpecHub. Pass the issue envelope JSON as returned by the Jira MCP getJiraIssue tool, plus the description and (optionally) comments in the format you requested.',
    inputSchema: z.object({
      source_key: z.string().max(128).describe("Jira issue key (e.g. 'PROJ-123'). Used as the unique key for the Spec."),
      issue_envelope: z.object({
        key: z.string().optional(),
        fields: z.object({
          summary: z.string().optional(),
          status: z.object({ name: z.string().optional() }).optional(),
          priority: z.object({ name: z.string().optional() }).optional(),
          assignee: z.object({
            displayName: z.string().optional(),
            emailAddress: z.string().optional(),
          }).nullable().optional(),
          reporter: z.object({
            displayName: z.string().optional(),
            emailAddress: z.string().optional(),
          }).nullable().optional(),
          labels: z.array(z.string()).optional(),
          created: z.string().optional(),
          updated: z.string().optional(),
        }).optional(),
      }).passthrough().describe('Jira issue envelope JSON as returned by the Jira MCP getJiraIssue tool.'),
      description: z.string().describe('Issue description body in the format specified by description_format.'),
      description_format: z.enum(['markdown', 'adf', 'html']).describe("Format of the description body. Use 'adf' for Jira ADF JSON (best fidelity), 'markdown' for simplified text, or 'html' for HTML."),
      comments: z.array(z.object({
        author: z.string().describe('Comment author display name or identifier.'),
        body: z.string().describe('Comment body in the format specified by body_format.'),
        body_format: z.enum(['markdown', 'adf', 'html']).describe('Format of the comment body.'),
        created: z.string().describe("ISO timestamp of the comment (e.g. '2026-08-10T14:30:00Z')."),
      })).optional().describe('Optional list of comments to include in the Spec, ordered chronologically.'),
      updated_by: z.string().describe("Identifier of who/what is making the change (e.g. 'claude-code', 'cezar@corp')."),
    }),
    outputSchema: z.object({
      spec_id: z.string(),
      title: z.string(),
      status: z.enum(['created', 'updated']),
    }),
    execute: async (inputData) => {
      const useCase = container.resolve('importSpecFromJiraUseCase')
      return useCase.execute(inputData)
    },
  })
}
