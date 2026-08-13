import { MCPServer } from '@mastra/mcp'
import { createSaveSpecTool } from './tools/save-spec.js'
import { createGetFeatureOverviewTool } from './tools/get-feature-overview.js'
import { createSearchSpecContextTool } from './tools/search-spec-context.js'
import { createGetRepoTasksTool } from './tools/get-repo-tasks.js'
import { createUpdateTaskStatusTool } from './tools/update-task-status.js'
import { createUpdateSpecChunkTool } from './tools/update-spec-chunk.js'
import { createListCardDocumentsTool } from './tools/list-card-documents.js'
import { createGetSectionTool } from './tools/get-section.js'
import { createSaveSpecFromConfluenceTool } from './tools/save-spec-from-confluence.js'
import { createSaveSpecFromJiraTool } from './tools/save-spec-from-jira.js'
import { listWorkflowResources, getWorkflowContent } from './workflows/index.js'
import type { AppContainer } from '../container/types.js'

export function createSpecHubMcpServer(container: AppContainer) {
  return new MCPServer({
    id: 'spechub',
    name: 'SpecHub MCP Server',
    version: '0.1.0',
    description: 'Centralized technical spec storage with vector search. Save, search, and manage specs without Confluence.',
    instructions: `## SpecHub Workflow Guide

Follow this pattern for EVERY spec-related task. Skipping steps or over-calling tools wastes tokens and creates noise.

### Importing Specs from Jira / Confluence

When the spec already lives in Jira or Confluence, **import it in one call** — don't rewrite manually.

- \`save_spec_from_jira(source_key, issue_envelope, description, description_format, comments?, updated_by)\`
- \`save_spec_from_confluence(source_key, page_envelope, content, content_format, updated_by)\`

Both accept the envelope JSON + body returned by the source MCP (\`getJiraIssue\` / \`getConfluencePage\`) and convert in-process. The tool composes a metadata header (e.g. \`**Source**: JIRA · PROJ-123 · **Status**: In Progress\`) plus the converted body and (for Jira) comments, then persists via \`save_spec\` — embedding + changelog included. The resulting spec is searchable via \`search_spec_context\` and editable via \`update_spec_chunk\` like any other.

**Format choice — prefer the rich format:**

| Source | \`format\` | Fidelity | When |
| :--- | :--- | :--- | :--- |
| Jira | \`adf\` | High (preserves panels, tables, badges, mentions) | **Recommended default** |
| Jira | \`markdown\` | Low (simplified text — loses tables/panels) | Only when you intentionally want a stripped-down version |
| Confluence | \`html\` | High (storage format with macros) | **Recommended default** |
| Confluence | \`markdown\` | Low | Only when you intentionally want a stripped-down version |

Rule: **always prefer the rich format**. You can simplify later with \`update_spec_chunk\`, but you cannot reconstruct a table that was lost during the simplified conversion.

Before importing, run \`list_card_documents(source_key)\` to discover existing docs and avoid silent overwrites. For local artifacts (techspec.md, architecture.md, tasks.md from \`cy-create-techspec\`), use the \`spechub://workflows/save-artifacts\` MCP resource instead.

### Golden Path (3 calls max for most tasks)

1. **Discover**: \`list_card_documents(source_key)\` — always first. Learn what artifacts exist (prd, spec, design, etc.). Never assume the source_key maps to a single document.

2. **Orient**: \`get_feature_overview(spec_id)\` — get the heading index. Use headings to detect the document language and understand sections. Run this BEFORE any search.

3. **Read**: \`search_spec_context(spec_id, query)\` — make at most 2 calls, NEVER more. One broad query first, then at most ONE follow-up scoped to a heading from step 2. This tool returns top-3 snippets per call; beyond 2 calls there is nothing new to find.

4. **Act**: Use \`get_repo_tasks(spec_id)\` to see pending work. The task's \`context_snippet\` IS your implementation brief — it summarizes what to build for that repo. Then use \`update_task_status\` to mark progress and \`update_spec_chunk\` to edit sections.

### Spec vs Task: What Lives Where

Understanding this distinction prevents wasted search calls:

| Tool | Contains | Example |
|------|----------|---------|
| \`search_spec_context\` | Architectural decisions, API contracts, design rationale, user stories, testing strategy | "POST /auth/login returns 423 with TENANT_DEACTIVATED", "Schema: add deactivated column to tenants" |
| \`context_snippet\` on a task | Implementation summary for a specific repo | "AuthStore captures HTTP 423, LoginForm shows specific message instead of generic error" |

**Critical rule**: When implementing a task, you already have the \`context_snippet\` from \`get_repo_tasks\`. That's your brief. Use \`search_spec_context\` ONLY to confirm API contracts, schema decisions, and design choices — NOT to hunt for class names, component names, or test file lists. Those details live in the codebase, not in the spec.

### Match Query Language to Document Language

The embedding model (\`paraphrase-multilingual-MiniLM-L12-v2\`) supports 50+ languages. Same-language queries give the best results — check headings from \`get_feature_overview\` and mirror the language in your query. Cross-language searches are less precise.

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

**CRITICAL RULE — Cite the heading**: The heading name from \`get_feature_overview\` contains the EXACT keywords that appear in that section. Your paraphrased vocabulary may not. ALWAYS include the heading name verbatim in your query.

**Right way** (heading-first):
1. \`get_feature_overview\` returns headings: ["API Contracts", "Fluxo do Frontend", "Schema Change", ...]
2. You want to know the endpoint contract → heading is "API Contracts"
3. Query: "What does the API Contracts section define?" — NOT "Qual é o contrato do novo endpoint?"

This works because "API" and "Contracts" appear as words in that section's text. Your paraphrase "contrato do novo endpoint" uses words that DON'T appear there — they match a different section (e.g. User Stories) instead.

**Rule**: Look at the headings. Pick one. Write a single-sentence question that INCLUDES that heading's name. If you need more than 2 topics, prioritize and make only 2 queries.

### Common Anti-Patterns (DO NOT DO)

- **Searching for code in the spec**: The spec describes WHAT and WHY — architecture, contracts, decisions. It does NOT contain class names, component implementations, or test file names. If the \`context_snippet\` says "AuthStore captures HTTP 423", don't search the spec for "AuthStore" — that detail is for the codebase, not the spec.
- **Spam-searching**: Making 3+ \`search_spec_context\` calls. STOP at 2. A 3rd call will NOT find content the first 2 missed — if you didn't find it in 2 calls, it's not in the spec.
- **Keyword-dumping**: Concatenating code symbols, mixed languages, and technical terms into a search string. Each query is embedded as a sentence — a bag of mixed keywords produces a garbage embedding.
- **Skipping \`list_card_documents\`**: Never go straight to \`search_spec_context\` without confirming what documents exist.
- **Skipping \`get_feature_overview\`**: Never search blind. Use the heading index.
- **Reconstructing the full spec**: If \`search_spec_context\` returns a truncated snippet (ending with "..."), use \`get_section(spec_id, heading)\` to fetch the complete section content. \`get_section\` returns the full Markdown for a single heading — ideal for reading lists, contracts, or decisions that don't fit in a snippet.`,

    resources: {
      listResources: async () => listWorkflowResources(),
      getResourceContent: async ({ uri }) => {
        const content = await getWorkflowContent(uri)
        if (!content) throw new Error(`Workflow not found: ${uri}`)
        return content
      },
    },

    tools: {
      save_spec: createSaveSpecTool(container),
      get_feature_overview: createGetFeatureOverviewTool(container),
      search_spec_context: createSearchSpecContextTool(container),
      get_repo_tasks: createGetRepoTasksTool(container),
      update_task_status: createUpdateTaskStatusTool(container),
      update_spec_chunk: createUpdateSpecChunkTool(container),
      list_card_documents: createListCardDocumentsTool(container),
      get_section: createGetSectionTool(container),
      save_spec_from_confluence: createSaveSpecFromConfluenceTool(container),
      save_spec_from_jira: createSaveSpecFromJiraTool(container),
    },
  })
}
