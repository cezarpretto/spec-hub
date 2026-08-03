import { extractBearerToken } from '@mastra/mcp'
import { createStaticTokenStrategy } from './static-token-strategy.js'
import { createGoogleOAuthAuth } from './google-oauth-strategy.js'
import type { AuthSetup, AuthMiddlewareResult, AuthStrategy } from './types.js'

function write401(res: import('http').ServerResponse, oauthEnabled: boolean, error: string, description?: string) {
  const params: string[] = []
  if (oauthEnabled) {
    const port = parseInt(process.env.PORT || '3456', 10)
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${port}`
    const resourceUrl = `${baseUrl}/.well-known/oauth-protected-resource`
    params.push(`resource_metadata="${resourceUrl.replace(/"/g, '\\"')}"`)
  }
  params.push(`error="${error.replace(/"/g, '\\"')}"`)
  if (description) params.push(`error_description="${description.replace(/"/g, '\\"')}"`)

  res.writeHead(401, {
    'Content-Type': 'application/json',
    'WWW-Authenticate': `Bearer ${params.join(', ')}`,
  })
  res.end(JSON.stringify({ error, error_description: description || error }))
}

export function createAuthMiddleware(opts?: { publicUrl?: string }): AuthSetup | undefined {
  const googleOAuth = createGoogleOAuthAuth(opts)
  const staticToken = createStaticTokenStrategy()

  const strategies: AuthStrategy[] = []
  if (staticToken.isConfigured()) strategies.push(staticToken)
  if (googleOAuth) strategies.push(googleOAuth.strategy)

  if (strategies.length === 0) return undefined

  const oauthEnabled = !!googleOAuth
  const googleMiddleware = googleOAuth?.middleware
  const enabledStrategies = strategies.map(s => s.id)

  const combinedMiddleware = async (req: import('http').IncomingMessage, res: import('http').ServerResponse, url: URL): Promise<AuthMiddlewareResult> => {
    if (url.pathname === '/.well-known/oauth-protected-resource' && googleMiddleware) {
      if (req.method === 'GET' || req.method === 'OPTIONS') {
        return googleMiddleware(req, res, url)
      }
    }

    if (!url.pathname.startsWith('/mcp') && !url.pathname.startsWith('/api/mcp')) {
      return { proceed: true, handled: false }
    }

    const authHeader = req.headers['authorization']
    const token = extractBearerToken(authHeader as string | undefined)
    if (!token) {
      write401(res, oauthEnabled, 'unauthorized', 'Bearer token required')
      return { proceed: false, handled: true }
    }

    for (const strategy of strategies) {
      const result = await strategy.validateToken(token)
      if (result.valid) {
        return { proceed: true, handled: false, tokenValidation: result }
      }
    }

    write401(res, oauthEnabled, 'invalid_token', 'Token validation failed')
    return { proceed: false, handled: true }
  }

  return { middleware: combinedMiddleware, oauthEnabled, enabledStrategies }
}
