import express from 'express'
import type { MCPServer } from '@mastra/mcp'

type OAuthMiddleware = (req: import('http').IncomingMessage, res: import('http').ServerResponse, url: URL) => Promise<{ proceed: boolean; handled: boolean }>

export function createHttpServer(specHubMcpServer: MCPServer, authMiddleware: OAuthMiddleware | undefined) {
  const app = express()

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.all('/mcp', async (req, res) => {
    const port = parseInt(process.env.PORT || '3456', 10)
    const url = new URL(req.url || '/', `http://localhost:${port}`)

    if (authMiddleware) {
      const result = await authMiddleware(req, res, url)
      if (!result.proceed) return
    }

    await specHubMcpServer.startHTTP({ url, httpPath: '/mcp', req, res })
  })

  return app
}
