import { createHash, timingSafeEqual } from 'crypto'
import type { AuthStrategy } from './types.js'

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

function parseAccessTokens(): string[] {
  const raw = process.env.SPECHUB_ACCESS_TOKENS
  if (!raw) return []
  return raw
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)
}

export function createStaticTokenStrategy(): AuthStrategy {
  return {
    id: 'access-token',

    isConfigured() {
      return parseAccessTokens().length > 0
    },

    async validateToken(token: string) {
      const configured = parseAccessTokens()
      const provided = hashToken(token)

      for (const configToken of configured) {
        if (timingSafeEqual(provided, hashToken(configToken))) {
          return {
            valid: true,
            scopes: ['mcp:read', 'mcp:write'],
            subject: 'agent',
            claims: { authType: 'access_token' },
          }
        }
      }

      return { valid: false, error: 'invalid_token', errorDescription: 'Access token not recognized' }
    },
  }
}
