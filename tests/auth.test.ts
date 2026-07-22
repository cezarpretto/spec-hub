import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import { createServer } from 'http'

const originalEnv = { ...process.env }
let server: ReturnType<typeof createServer>
let port: number

vi.mock('google-auth-library', () => {
  const mockVerifyIdToken = vi.fn()
  function MockOAuth2Client() {
    return { verifyIdToken: mockVerifyIdToken }
  }
  return {
    OAuth2Client: MockOAuth2Client,
    __mockVerifyIdToken: mockVerifyIdToken,
  }
})

async function startTestServer(app: express.Express): Promise<number> {
  return new Promise((resolve) => {
    server = createServer(app)
    server.listen(0, () => {
      const addr = server.address()
      resolve(typeof addr === 'object' && addr ? addr.port : 3456)
    })
  })
}

const jsonRpcInitialize = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0.0' },
  },
})

async function fetchUrl(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`http://localhost:${port}${path}`, options)
}

describe('auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    server?.close()
    process.env = { ...originalEnv }
  })

  it('health endpoint returns 200 without auth configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_ALLOWED_DOMAINS

    const { createAuthMiddleware } = await import('../src/mastra/auth.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authMiddleware = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authMiddleware)
    port = await startTestServer(app)

    const res = await fetchUrl('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })

  it('health endpoint returns 200 with auth configured', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'

    const { createAuthMiddleware } = await import('../src/mastra/auth.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authMiddleware = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authMiddleware)
    port = await startTestServer(app)

    const res = await fetchUrl('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })

  it('rejects POST /mcp without token when auth is configured', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'

    const { createAuthMiddleware } = await import('../src/mastra/auth.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authMiddleware = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authMiddleware)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('rejects POST /mcp with invalid token when auth is configured', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'

    const { createAuthMiddleware } = await import('../src/mastra/auth.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authMiddleware = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authMiddleware)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid-token' },
    })
    expect(res.status).toBe(401)
  })

  it('rejects POST /mcp with token from non-allowed domain', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'

    const { __mockVerifyIdToken } = await import('google-auth-library')
    __mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'user123',
        email: 'user@evil.com',
        hd: 'evil.com',
        exp: 9999999999,
      }),
    })

    const { createAuthMiddleware } = await import('../src/mastra/auth.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authMiddleware = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authMiddleware)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token-wrong-domain' },
    })
    expect(res.status).toBe(401)
  })

  it('passes POST /mcp with valid token from allowed domain', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'

    const { __mockVerifyIdToken } = await import('google-auth-library')
    __mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'user123',
        email: 'user@example.com',
        hd: 'example.com',
        exp: 9999999999,
      }),
    })

    const { createAuthMiddleware } = await import('../src/mastra/auth.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authMiddleware = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authMiddleware)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: 'Bearer valid-token',
      },
      body: jsonRpcInitialize,
    })
    expect(res.status).toBe(200)
  })
})
