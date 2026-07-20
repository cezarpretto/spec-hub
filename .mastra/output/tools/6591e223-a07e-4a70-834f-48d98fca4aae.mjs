import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

function createGetFeatureOverviewTool(container) {
  return createTool({
    id: "get_feature_overview",
    description: "Returns spec metadata and an index of headings (## and ###) extracted from the Markdown content. Identify the spec by its UUID or by source_type + source_key (e.g. JIRA + SHELL-1010).",
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the spec, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "JIRA:SHELL-1010")'),
      source_type: z.string().optional().describe("External tracking tool type (e.g. 'JIRA', 'LINEAR', 'GITHUB')"),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1010')")
    }).refine(
      (data) => data.spec_id || data.source_type && data.source_key,
      { message: "Either spec_id or (source_type + source_key) must be provided" }
    ),
    outputSchema: z.object({
      spec_id: z.string(),
      title: z.string(),
      source: z.object({
        type: z.string(),
        key: z.string()
      }),
      sections: z.array(z.object({
        heading: z.string(),
        level: z.number()
      })),
      updated_at: z.string()
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("getFeatureOverviewUseCase");
      return useCase.execute(inputData);
    }
  });
}

export { createGetFeatureOverviewTool };
