import { Mastra } from "@mastra/core/mastra";
import { specHubMcpServer } from "./mcp.js";
import { runMigrations } from "../lib/db/migrations.js";
import { initEmbedding } from "../lib/embedding/index.js";

const port = parseInt(process.env.PORT || "3456", 10);

await runMigrations();
await initEmbedding();

export const mastra = new Mastra({
  mcpServers: {
    specHub: specHubMcpServer,
  },
  server: {
    port,
  },
});
