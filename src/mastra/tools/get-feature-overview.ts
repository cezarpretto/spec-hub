import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { dbOps } from "../../lib/db/queries.js";
import type { GetFeatureOverviewOutput } from "../../lib/types.js";

export const getFeatureOverviewTool = createTool({
  id: "get_feature_overview",
  description:
    "Returns spec metadata and an index of headings (## and ###) extracted from the Markdown content, without returning the full content. Useful for understanding the document structure before diving into details.",
  inputSchema: z.object({
    spec_id: z.string().describe("UUID of the spec to retrieve the overview for"),
  }),
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
  execute: async (inputData): Promise<GetFeatureOverviewOutput> => {
    const { spec_id } = inputData;

    const spec = await dbOps.getSpecById(spec_id);
    if (!spec) {
      throw new Error(`Spec not found: ${spec_id}`);
    }

    const sections = extractHeadings(spec.content);

    return {
      spec_id: spec.id,
      title: spec.title,
      source: {
        type: spec.source_type,
        key: spec.source_key,
      },
      sections,
      updated_at: spec.updated_at,
    };
  },
});

function extractHeadings(markdown: string): { heading: string; level: number }[] {
  const headingRegex = /^(##|###) (.+)$/gm;
  const sections: { heading: string; level: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(markdown)) !== null) {
    sections.push({
      heading: match[2].trim(),
      level: match[1] === "##" ? 2 : 3,
    });
  }

  return sections;
}
