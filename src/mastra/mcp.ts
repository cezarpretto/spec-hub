import { MCPServer } from "@mastra/mcp";
import { saveSpecTool } from "./tools/save-spec.js";
import { getFeatureOverviewTool } from "./tools/get-feature-overview.js";

export const specHubMcpServer = new MCPServer({
  id: "spechub",
  name: "SpecHub MCP Server",
  version: "0.1.0",
  description: "Centralized technical spec storage with vector search. Save, search, and manage specs without Confluence.",
  tools: {
    save_spec: saveSpecTool,
    get_feature_overview: getFeatureOverviewTool,
  },
});
