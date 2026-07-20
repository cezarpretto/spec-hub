import { MCPServer } from '@mastra/mcp'
import { createSaveSpecTool } from './tools/save-spec.js'
import { createGetFeatureOverviewTool } from './tools/get-feature-overview.js'
import { createSearchSpecContextTool } from './tools/search-spec-context.js'
import { createGetRepoTasksTool } from './tools/get-repo-tasks.js'
import { createUpdateTaskStatusTool } from './tools/update-task-status.js'
import { createUpdateSpecChunkTool } from './tools/update-spec-chunk.js'
import type { AppContainer } from '../container/types.js'

export function createSpecHubMcpServer(container: AppContainer) {
  return new MCPServer({
    id: 'spechub',
    name: 'SpecHub MCP Server',
    version: '0.1.0',
    description: 'Centralized technical spec storage with vector search. Save, search, and manage specs without Confluence.',
    tools: {
      save_spec: createSaveSpecTool(container),
      get_feature_overview: createGetFeatureOverviewTool(container),
      search_spec_context: createSearchSpecContextTool(container),
      get_repo_tasks: createGetRepoTasksTool(container),
      update_task_status: createUpdateTaskStatusTool(container),
      update_spec_chunk: createUpdateSpecChunkTool(container),
    },
  })
}
