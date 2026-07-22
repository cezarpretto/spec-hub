import { createOAuthMiddleware } from '@mastra/mcp'
import { OAuth2Client } from 'google-auth-library'
import type { TokenValidationResult } from '@mastra/mcp'

export function createAuthMiddleware() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const allowedDomainsRaw = process.env.GOOGLE_ALLOWED_DOMAINS

  if (!clientId || !allowedDomainsRaw) {
    return undefined
  }

  const allowedDomains = allowedDomainsRaw.split(',').map(d => d.trim())
  const oauthClient = new OAuth2Client(clientId)
  const port = parseInt(process.env.PORT || '3456', 10)

  async function validateToken(token: string, _resource: string): Promise<TokenValidationResult> {
    try {
      const ticket = await oauthClient.verifyIdToken({
        idToken: token,
        audience: clientId,
      })
      const payload = ticket.getPayload()
      if (!payload) {
        return { valid: false, error: 'invalid_token', errorDescription: 'Token payload is empty' }
      }
      if (!payload.hd || !allowedDomains.includes(payload.hd)) {
        return {
          valid: false,
          error: 'access_denied',
          errorDescription: `Domain ${payload.hd || 'unknown'} is not allowed. Allowed domains: ${allowedDomains.join(', ')}`,
        }
      }
      return {
        valid: true,
        scopes: ['mcp:read', 'mcp:write'],
        subject: payload.sub,
        claims: payload as unknown as Record<string, unknown>,
        expiresAt: payload.exp,
      }
    } catch (err) {
      return {
        valid: false,
        error: 'invalid_token',
        errorDescription: err instanceof Error ? err.message : 'Token validation failed',
      }
    }
  }

  return createOAuthMiddleware({
    mcpPath: '/',
    oauth: {
      resource: `http://localhost:${port}/mcp`,
      authorizationServers: ['https://accounts.google.com'],
      scopesSupported: ['mcp:read', 'mcp:write'],
      validateToken,
    },
  })
}
