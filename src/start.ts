import { umzug } from './infrastructure/database/umzug.js'
import { buildContainer } from './container/index.js'
import { createSpecHubMcpServer } from './mastra/mcp.js'
import { createAuthMiddleware } from './mastra/auth.js'
import { createHttpServer } from './mastra/server.js'

const port = parseInt(process.env.PORT || '3456', 10)

await umzug.up()

const container = buildContainer()

const embeddingService = container.resolve('embeddingService')
await embeddingService.initialize()

const specHubMcpServer = createSpecHubMcpServer(container)
const authMiddleware = createAuthMiddleware()
const app = createHttpServer(specHubMcpServer, authMiddleware)

app.listen(port, () => {
  console.log(`SpecHub MCP server listening on http://localhost:${port}${authMiddleware ? ' (auth enabled)' : ' (no auth)'}`)
})
