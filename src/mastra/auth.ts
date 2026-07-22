import { createOAuthMiddleware } from '@mastra/mcp'
import { OAuth2Client } from 'google-auth-library'

export function createAuthMiddleware() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const allowedDomainsRaw = process.env.GOOGLE_ALLOWED_DOMAINS

  if (!clientId || !clientSecret || !allowedDomainsRaw) {
    return undefined
  }

  const allowedDomains = allowedDomainsRaw.split(',').map(d => d.trim())
  const oauthClient = new OAuth2Client(clientId)
  const port = parseInt(process.env.PORT || '3456', 10)
  const baseUrl = `http://localhost:${port}`

  return createOAuthMiddleware({
    mcpPath: '/',
    oauth: {
      resource: `${baseUrl}/api/mcp/spechub/mcp`,
      authorizationServers: [`${baseUrl}/oauth`],
      scopesSupported: ['openid', 'email'],
      validateToken: async (token: string) => {
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
              errorDescription: `Domain ${payload.hd || 'unknown'} is not allowed`,
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
    },
  })
}
