import { MCPServer } from '@mastra/mcp'
import { createSaveSpecTool } from './tools/save-spec.js'
import { createGetFeatureOverviewTool } from './tools/get-feature-overview.js'
import { createSearchSpecContextTool } from './tools/search-spec-context.js'
import { createGetRepoTasksTool } from './tools/get-repo-tasks.js'
import { createUpdateTaskStatusTool } from './tools/update-task-status.js'
import { createUpdateSpecChunkTool } from './tools/update-spec-chunk.js'
import { createListCardDocumentsTool } from './tools/list-card-documents.js'
import type { AppContainer } from '../container/types.js'

export function createSpecHubMcpServer(container: AppContainer) {
  return new MCPServer({
    id: 'spechub',
    name: 'SpecHub MCP Server',
    version: '0.1.0',
    description: 'Centralized technical spec storage with vector search. Save, search, and manage specs without Confluence.',
    instructions: `## SpecHub Workflow Guide

Follow this pattern for EVERY spec-related task. Skipping steps or over-calling tools wastes tokens and creates noise.

### Golden Path (3 calls max for most tasks)

1. **Discover**: \`list_card_documents(source_key)\` — always first. Learn what artifacts exist (prd, spec, design, etc.). Never assume the source_key maps to a single document.

2. **Orient**: \`get_feature_overview(spec_id)\` — get the document's heading index. Use the returned section headings to understand structure and scope your next search.

3. **Read**: \`search_spec_context(spec_id, query)\` — ONE broad query to find the section you need. If the first result isn't enough, make ONE more call targeting a specific heading from step 2. STOP after 2 calls — this tool returns only top-3 snippets; repeating calls with keyword variations will not improve results.

4. **Act**: Use \`get_repo_tasks(spec_id)\` to see pending work, then \`update_task_status\` to mark progress. Use \`update_spec_chunk\` to edit sections.

### Common Anti-Patterns (DO NOT DO)

- **Spam-searching**: Making 5+ \`search_spec_context\` calls in parallel with slight keyword variations. This tool is scoped search, not full-document retrieval. More calls = more noise, not more coverage.
- **Keyword-dumping**: Using queries like "Schema Change deactivated column migration TenantService JwtStrategy" instead of a natural sentence. Write a real question, not a bag of keywords.
- **Skipping \`list_card_documents\`**: Never go straight to \`search_spec_context\` with only a source_key and source_type. First confirm what documents exist.
- **Skipping \`get_feature_overview\`**: Never search blind. Use the heading index to target your query at the right section.
- **Reconstructing the full spec**: There is no "get full content" tool. \`search_spec_context\` returns snippets, \`get_feature_overview\` returns structure. Use them together — not as a substitute for reading the full document.

### Why This Matters

Each \`search_spec_context\` call costs an embedding comparison + full-text search. The results degrade with broad/vague queries. A focused, heading-aware query is always more precise than 5 keyword-dump queries.`,
    tools: {
      save_spec: createSaveSpecTool(container),
      get_feature_overview: createGetFeatureOverviewTool(container),
      search_spec_context: createSearchSpecContextTool(container),
      get_repo_tasks: createGetRepoTasksTool(container),
      update_task_status: createUpdateTaskStatusTool(container),
      update_spec_chunk: createUpdateSpecChunkTool(container),
      list_card_documents: createListCardDocumentsTool(container),
    },
  })
}
