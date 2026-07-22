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

2. **Orient**: \`get_feature_overview(spec_id)\` — get the document's heading index. Use the returned section headings to **detect the document language** and scope your next search. The embedding model is English-only — headings reveal whether the document is in Portuguese or English.

3. **Read**: \`search_spec_context(spec_id, query)\` — make at most 2 calls, NEVER more. One broad query first, then at most ONE follow-up scoped to a heading from step 2. This tool returns only top-3 snippets per call; a 3rd call will NOT reveal new information.

### CRITICAL: Match Query Language to Document Language

The embedding model (\`paraphrase-multilingual-MiniLM-L12-v2\`) supports 50+ languages including Portuguese and English, but cross-language queries are less precise than same-language queries. For best results, mirror the document language.

**After \`get_feature_overview\`, check the headings:**
- Headings in **Portuguese** → write your query in **Portuguese**
- Headings in **English** → write your query in **English**

Mixing languages degrades precision. Same-language queries aligned with a specific heading from \`get_feature_overview\` give the best results.

4. **Act**: Use \`get_repo_tasks(spec_id)\` to see pending work, then \`update_task_status\` to mark progress. Use \`update_spec_chunk\` to edit sections.

### Query Writing Rules

Every \`search_spec_context\` query must be a single, plain-language question in ONE language. The embedding model works best with natural sentences, not technical keyword lists.

**Good queries** (natural sentence, one topic, one language):
- "How does the auth blocking flow work during login?"
- "What is the schema change for the deactivated column?"
- "How should the frontend handle the 423 response?"

**Bad queries** (keyword dump, mixed languages, multiple topics, code slugs):
- "Auth Blocking Login JWT Password Reset implementation details schema deactivated column TenantService JwtStrategy"
- "API Contracts B3 checkBySubdomain endpoint retorna subdomain deactivated"
- "Implementation Decisions Schema Change Domain Model"

**Rule**: Before writing a query, look at the headings from \`get_feature_overview\`. Pick the ONE heading that best matches your intent. Write a single-sentence question about that heading's topic. If you need more than 2 topics, prioritize and make only 2 queries.

### Common Anti-Patterns (DO NOT DO)

- **Spam-searching**: Making 3+ \`search_spec_context\` calls. STOP at 2. A 3rd call with different keywords will NOT find content the first 2 missed — it will just return lower-confidence noise.
- **Keyword-dumping**: Concatenating code symbols, mixed pt/en, and technical terms into a single string. This is NOT how vector search works. Each query is embedded as a sentence — a bag of mixed keywords produces a garbage embedding that matches nothing well.
- **Skipping \`list_card_documents\`**: Never go straight to \`search_spec_context\` with only a source_key and source_type. First confirm what documents exist.
- **Skipping \`get_feature_overview\`**: Never search blind. Use the heading index to target your query at the right section.
- **Reconstructing the full spec**: There is no "get full content" tool. \`search_spec_context\` returns snippets, \`get_feature_overview\` returns structure. Use them together — not as a substitute for reading the full document.`,

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
