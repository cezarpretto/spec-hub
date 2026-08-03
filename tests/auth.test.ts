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

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })

  it('health endpoint returns 200 with Google OAuth configured', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })

  it('health endpoint returns 200 with only access token configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_ALLOWED_DOMAINS
    process.env.SPECHUB_ACCESS_TOKENS = 'secret-token-123'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })

  it('rejects POST /mcp without token when Google OAuth is configured', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('rejects POST /mcp without token when only access token is configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_ALLOWED_DOMAINS
    process.env.SPECHUB_ACCESS_TOKENS = 'secret-token-123'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: jsonRpcInitialize,
    })
    expect(res.status).toBe(401)
  })

  it('rejects POST /mcp with invalid token when Google OAuth is configured', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid-token' },
    })
    expect(res.status).toBe(401)
  })

  it('rejects POST /mcp with invalid access token', async () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_ALLOWED_DOMAINS
    process.env.SPECHUB_ACCESS_TOKENS = 'secret-token-123'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: 'Bearer wrong-token',
      },
      body: jsonRpcInitialize,
    })
    expect(res.status).toBe(401)
  })

  it('passes POST /mcp with valid access token', async () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_ALLOWED_DOMAINS
    process.env.SPECHUB_ACCESS_TOKENS = 'secret-token-123'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: 'Bearer secret-token-123',
      },
      body: jsonRpcInitialize,
    })
    expect(res.status).toBe(200)
  })

  it('passes POST /mcp with one of multiple access tokens', async () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_ALLOWED_DOMAINS
    process.env.SPECHUB_ACCESS_TOKENS = 'token-alpha, token-beta, token-gamma'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: 'Bearer token-beta',
      },
      body: jsonRpcInitialize,
    })
    expect(res.status).toBe(200)
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

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token-wrong-domain' },
    })
    expect(res.status).toBe(401)
  })

  it('passes POST /mcp with valid token from allowed domain (email domain, no hd)', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'gmail.com'

    const { __mockVerifyIdToken } = await import('google-auth-library')
    __mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'user123',
        email: 'user@gmail.com',
        exp: 9999999999,
      }),
    })

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: 'Bearer valid-token-gmail',
      },
      body: jsonRpcInitialize,
    })
    expect(res.status).toBe(200)
  })

  it('passes POST /mcp with valid token from allowed domain (with hd)', async () => {
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

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
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

  it('passes POST /mcp with access token when both strategies are configured', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'
    process.env.SPECHUB_ACCESS_TOKENS = 'secret-token-123'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: 'Bearer secret-token-123',
      },
      body: jsonRpcInitialize,
    })
    expect(res.status).toBe(200)
  })

  it('passes POST /mcp with Google id_token when both strategies are configured', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'
    process.env.SPECHUB_ACCESS_TOKENS = 'secret-token-123'

    const { __mockVerifyIdToken } = await import('google-auth-library')
    __mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'user456',
        email: 'user@example.com',
        hd: 'example.com',
        exp: 9999999999,
      }),
    })

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const app = createHttpServer(specHubMcpServer, authSetup)
    port = await startTestServer(app)

    const res = await fetchUrl('/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: 'Bearer google-id-token-456',
      },
      body: jsonRpcInitialize,
    })
    expect(res.status).toBe(200)
  })

  it('uses PUBLIC_URL for resource and authorizationServers when configured', async () => {
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

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { MCPServer } = await import('@mastra/mcp')

    const publicUrl = 'https://spechub.example.com'
    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware({ publicUrl })
    const app = createHttpServer(specHubMcpServer, authSetup)
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

  it('authorize redirect uses PUBLIC_URL in Google redirect_uri', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'

    const publicUrl = 'https://spechub.example.com'
    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { createOAuthServer } = await import('../src/mastra/oauth.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware({ publicUrl })
    const oauthHandlers = createOAuthServer(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      { publicUrl },
    )
    const app = createHttpServer(specHubMcpServer, authSetup, oauthHandlers)
    port = await startTestServer(app)

    const res = await fetchUrl('/authorize?response_type=code&client_id=test&redirect_uri=http://127.0.0.1/callback', {
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    const location = res.headers.get('location')
    expect(location).toBeTruthy()
    const googleUrl = new URL(location!)
    expect(googleUrl.searchParams.get('redirect_uri')).toBe(`${publicUrl}/oauth/callback`)
  })

  it('oauth flow works without PUBLIC_URL using localhost fallback', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')
    const { createHttpServer } = await import('../src/mastra/server.js')
    const { createOAuthServer } = await import('../src/mastra/oauth.js')
    const { MCPServer } = await import('@mastra/mcp')

    const specHubMcpServer = new MCPServer({ name: 'test', version: '1.0.0', tools: {} })
    const authSetup = createAuthMiddleware()
    const oauthHandlers = createOAuthServer(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    )
    const app = createHttpServer(specHubMcpServer, authSetup, oauthHandlers)
    port = await startTestServer(app)

    const res = await fetchUrl('/authorize?response_type=code&client_id=test&redirect_uri=http://127.0.0.1/callback', {
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    const location = res.headers.get('location')
    expect(location).toBeTruthy()
    const googleUrl = new URL(location!)
    const portValue = parseInt(process.env.PORT || '3456', 10)
    expect(googleUrl.searchParams.get('redirect_uri')).toBe(`http://localhost:${portValue}/oauth/callback`)
  })

  it('returns proper AuthSetup with only access-token enabled', async () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_ALLOWED_DOMAINS
    process.env.SPECHUB_ACCESS_TOKENS = 'my-secret-token'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')

    const authSetup = createAuthMiddleware()
    expect(authSetup).toBeDefined()
    expect(authSetup!.oauthEnabled).toBe(false)
    expect(authSetup!.enabledStrategies).toEqual(['access-token'])
  })

  it('returns proper AuthSetup with both strategies enabled', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_ALLOWED_DOMAINS = 'example.com'
    process.env.SPECHUB_ACCESS_TOKENS = 'my-secret-token'

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')

    const authSetup = createAuthMiddleware()
    expect(authSetup).toBeDefined()
    expect(authSetup!.oauthEnabled).toBe(true)
    expect(authSetup!.enabledStrategies).toEqual(['access-token', 'google-oauth'])
  })

  it('returns undefined when no auth is configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_ALLOWED_DOMAINS
    delete process.env.SPECHUB_ACCESS_TOKENS

    const { createAuthMiddleware } = await import('../src/mastra/auth/index.js')

    const authSetup = createAuthMiddleware()
    expect(authSetup).toBeUndefined()
  })
})
