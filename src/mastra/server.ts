import express from 'express'
import type { MCPServer } from '@mastra/mcp'

interface AuthMiddlewareResult {
  proceed: boolean
  handled: boolean
  tokenValidation?: {
    valid: boolean
    claims?: Record<string, unknown>
    subject?: string
  }
}

type OAuthMiddleware = (req: import('http').IncomingMessage, res: import('http').ServerResponse, url: URL) => Promise<AuthMiddlewareResult>

function getUrl(req: import('express').Request, port: number) {
  return new URL(req.url || '/', `http://localhost:${port}`)
}

function applyAuthClaims(req: import('express').Request, result: AuthMiddlewareResult) {
  if (result.tokenValidation?.claims) {
    ;(req as any).auth = result.tokenValidation.claims
  }
}

async function handleMcp(specHubMcpServer: MCPServer, authMiddleware: OAuthMiddleware | undefined, req: import('express').Request, res: import('express').Response, httpPath: string) {
  const port = parseInt(process.env.PORT || '3456', 10)
  const url = getUrl(req, port)

  if (authMiddleware) {
    const result = await authMiddleware(req, res, url)
    if (!result.proceed) return
    applyAuthClaims(req, result)
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

    app.get('/.well-known/oauth-authorization-server', (_req, res) => {
      res.json({
        issuer: `http://localhost:${parseInt(process.env.PORT || '3456', 10)}`,
        authorization_endpoint: `http://localhost:${parseInt(process.env.PORT || '3456', 10)}/authorize`,
        token_endpoint: `http://localhost:${parseInt(process.env.PORT || '3456', 10)}/token`,
        registration_endpoint: `http://localhost:${parseInt(process.env.PORT || '3456', 10)}/register`,
        scopes_supported: ['openid', 'email'],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        token_endpoint_auth_methods_supported: ['none'],
      })
    })
  }

  if (oauthHandlers) {
    app.post('/oauth/register', oauthHandlers.handleRegister)
    app.post('/register', oauthHandlers.handleRegister)

    app.get('/oauth/authorize', oauthHandlers.handleAuthorize)
    app.get('/authorize', oauthHandlers.handleAuthorize)

    app.get('/oauth/callback', oauthHandlers.handleCallback)
    app.get('/callback', oauthHandlers.handleCallback)

    app.post('/oauth/token', oauthHandlers.handleToken)
    app.post('/token', oauthHandlers.handleToken)
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
      applyAuthClaims(req, result)
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
      applyAuthClaims(req, result)
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
