import express from 'express'
import type { MCPServer } from '@mastra/mcp'

type OAuthMiddleware = (req: import('http').IncomingMessage, res: import('http').ServerResponse, url: URL) => Promise<{ proceed: boolean; handled: boolean }>

function getUrl(req: import('express').Request, port: number) {
  return new URL(req.url || '/', `http://localhost:${port}`)
}

async function handleMcp(specHubMcpServer: MCPServer, authMiddleware: OAuthMiddleware | undefined, req: import('express').Request, res: import('express').Response, httpPath: string) {
  const port = parseInt(process.env.PORT || '3456', 10)
  const url = getUrl(req, port)

  if (authMiddleware) {
    const result = await authMiddleware(req, res, url)
    if (!result.proceed) return
  }

  await specHubMcpServer.startHTTP({ url, httpPath, req, res })
}

export function createHttpServer(
  specHubMcpServer: MCPServer,
  authMiddleware: OAuthMiddleware | undefined,
  oauthHandlers?: {
    handleRegister: (req: express.Request, res: express.Response) => Promise<void>
    handleAuthorize: (req: express.Request, res: express.Response) => Promise<void>
    handleCallback: (req: express.Request, res: express.Response) => Promise<void>
    handleToken: (req: express.Request, res: express.Response) => Promise<void>
  },
) {
  const app = express()
  const mcpBase = '/api/mcp/spechub'

  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  if (authMiddleware) {
    app.get('/.well-known/oauth-protected-resource', async (req, res) => {
      const port = parseInt(process.env.PORT || '3456', 10)
      const url = new URL(req.url || '/', `http://localhost:${port}`)
      await authMiddleware(req, res, url)
    })
  }

  if (oauthHandlers) {
    app.post('/oauth/register', oauthHandlers.handleRegister)
    app.get('/oauth/authorize', oauthHandlers.handleAuthorize)
    app.get('/oauth/callback', oauthHandlers.handleCallback)
    app.post('/oauth/token', oauthHandlers.handleToken)
  }

  app.all('/mcp', async (req, res) => {
    await handleMcp(specHubMcpServer, authMiddleware, req, res, '/mcp')
  })

  app.all(`${mcpBase}/mcp`, async (req, res) => {
    await handleMcp(specHubMcpServer, authMiddleware, req, res, `${mcpBase}/mcp`)
  })

  app.all(`${mcpBase}/sse`, async (req, res) => {
    const port = parseInt(process.env.PORT || '3456', 10)
    const url = getUrl(req, port)

    if (authMiddleware) {
      const result = await authMiddleware(req, res, url)
      if (!result.proceed) return
    }

    await specHubMcpServer.startSSE({
      url,
      ssePath: `${mcpBase}/sse`,
      messagePath: `${mcpBase}/message`,
      req,
      res,
    })
  })

  app.all(`${mcpBase}/message`, async (req, res) => {
    const port = parseInt(process.env.PORT || '3456', 10)
    const url = getUrl(req, port)

    if (authMiddleware) {
      const result = await authMiddleware(req, res, url)
      if (!result.proceed) return
    }

    await specHubMcpServer.startSSE({
      url,
      ssePath: `${mcpBase}/sse`,
      messagePath: `${mcpBase}/message`,
      req,
      res,
    })
  })

  return app
}
