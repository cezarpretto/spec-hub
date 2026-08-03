import type { TokenValidationResult } from '@mastra/mcp'

export interface AuthStrategy {
  readonly id: string
  isConfigured(): boolean
  validateToken(token: string): Promise<TokenValidationResult>
}

export interface AuthMiddlewareResult {
  proceed: boolean
  handled: boolean
  tokenValidation?: TokenValidationResult
}

export type AuthMiddleware = (req: import('http').IncomingMessage, res: import('http').ServerResponse, url: URL) => Promise<AuthMiddlewareResult>

export interface AuthSetup {
  middleware: AuthMiddleware
  oauthEnabled: boolean
  enabledStrategies: string[]
}
