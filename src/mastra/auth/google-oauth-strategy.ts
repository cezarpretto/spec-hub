import { createOAuthMiddleware } from '@mastra/mcp'
import { OAuth2Client } from 'google-auth-library'
import type { AuthStrategy, AuthMiddleware } from './types.js'

export function createGoogleOAuthAuth(opts?: { publicUrl?: string }): { strategy: AuthStrategy, middleware: AuthMiddleware } | undefined {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const allowedDomainsRaw = process.env.GOOGLE_ALLOWED_DOMAINS

  if (!clientId || !clientSecret || !allowedDomainsRaw) {
    return undefined
  }

  const allowedDomains = allowedDomainsRaw.split(',').map(d => d.trim())
  const oauthClient = new OAuth2Client(clientId)
  const port = parseInt(process.env.PORT || '3456', 10)
  const baseUrl = opts?.publicUrl || process.env.PUBLIC_URL || `http://localhost:${port}`

  const strategy: AuthStrategy = {
    id: 'google-oauth',

    isConfigured() {
      return true
    },

    async validateToken(token: string) {
      try {
        const ticket = await oauthClient.verifyIdToken({
          idToken: token,
          audience: clientId,
        })
        const payload = ticket.getPayload()
        if (!payload) {
          return { valid: false, error: 'invalid_token', errorDescription: 'Token payload is empty' }
        }
        const domain = payload.hd || (payload.email ? payload.email.split('@')[1] : null)
        if (!domain || !allowedDomains.includes(domain)) {
          return {
            valid: false,
            error: 'access_denied',
            errorDescription: `Domain ${domain || 'unknown'} is not allowed`,
          }
        }
        return {
          valid: true,
          scopes: ['openid', 'email'],
          subject: payload.sub,
          claims: payload as unknown as Record<string, unknown>,
          expiresAt: payload.exp,
        }
      } catch (err) {
        return {
          valid: false,
          error: 'invalid_token',
          errorDescription: (err as Error).message,
        }
      }
    },
  }

  const middleware = createOAuthMiddleware({
    mcpPath: '/',
    oauth: {
      resource: `${baseUrl}/api/mcp/spechub/mcp`,
      authorizationServers: [`${baseUrl}`],
      scopesSupported: ['openid', 'email'],
      validateToken: strategy.validateToken,
    },
  })

  return { strategy, middleware }
}
