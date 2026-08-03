import { umzug } from './infrastructure/database/umzug.js'
import { buildContainer } from './container/index.js'
import { createSpecHubMcpServer } from './mastra/mcp.js'
import { createAuthMiddleware } from './mastra/auth/index.js'
import { createHttpServer } from './mastra/server.js'
import { createOAuthServer } from './mastra/oauth.js'

const port = parseInt(process.env.PORT || '3456', 10)
const publicUrl = process.env.PUBLIC_URL || `http://localhost:${port}`

await umzug.up()

const container = buildContainer()

const embeddingService = container.resolve('embeddingService')
await embeddingService.initialize()

const specHubMcpServer = createSpecHubMcpServer(container)
const authSetup = createAuthMiddleware({ publicUrl })

let oauthHandlers: ReturnType<typeof createOAuthServer> | undefined
if (authSetup?.oauthEnabled) {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  oauthHandlers = createOAuthServer(clientId, clientSecret, { publicUrl })
}

const app = createHttpServer(specHubMcpServer, authSetup, oauthHandlers)

app.listen(port, () => {
  const authLabel = authSetup ? ` (auth: ${authSetup.enabledStrategies.join('+')})` : ' (no auth)'
  console.log(`SpecHub MCP server listening on http://localhost:${port}${authLabel}`)
})
