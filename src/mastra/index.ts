import { Mastra } from '@mastra/core/mastra'
import { umzug } from '../infrastructure/database/umzug.js'
import { buildContainer } from '../container/index.js'
import { createSpecHubMcpServer } from './mcp.js'
import { createAuthMiddleware } from './auth.js'
import { createHttpServer } from './server.js'

const port = parseInt(process.env.PORT || '3456', 10)

await umzug.up()

const container = buildContainer()

const embeddingService = container.resolve('embeddingService')
await embeddingService.initialize()

const specHubMcpServer = createSpecHubMcpServer(container)

const authMiddleware = createAuthMiddleware()
const app = createHttpServer(specHubMcpServer, authMiddleware)

app.listen(port, () => {
  console.log(`SpecHub MCP server listening on http://localhost:${port}`)
})

export const mastra = new Mastra({
  mcpServers: {
    specHub: specHubMcpServer,
  },
})
