import { OAuth2Client } from 'google-auth-library'
import { randomBytes, createHash } from 'crypto'
import type { Request, Response } from 'express'

interface AuthSession {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge?: string
  codeChallengeMethod?: string
  idToken?: string
  used?: boolean
}

function sha256(verifier: string): Buffer {
  return createHash('sha256').update(verifier).digest()
}

function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function createOAuthServer(clientId: string, clientSecret: string) {
  const sessions = new Map<string, AuthSession>()
  const authCodes = new Map<string, AuthSession>()

  function genId(): string {
    return randomBytes(24).toString('hex')
  }

  const googleClient = new OAuth2Client(clientId, clientSecret)

  async function handleRegister(req: Request, res: Response) {
    const metadata = req.body || {}
    const registered = {
      client_id: 'spechub-mcp',
      client_secret: '',
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: metadata.client_name || 'SpecHub MCP Client',
      redirect_uris: metadata.redirect_uris || ['http://127.0.0.1/callback'],
      token_endpoint_auth_method: 'none',
    }
    res.status(201).json(registered)
  }

  async function handleAuthorize(req: Request, res: Response) {
    const { response_type, client_id, redirect_uri, state, code_challenge, code_challenge_method } = req.query

    if (response_type !== 'code') {
      res.status(400).json({ error: 'unsupported_response_type' })
      return
    }

    const sessionId = genId()
    const authSession: AuthSession = {
      clientId: (client_id as string) || 'spechub-mcp',
      redirectUri: (redirect_uri as string) || 'http://127.0.0.1/callback',
      state: (state as string) || '',
      codeChallenge: (code_challenge as string) || undefined,
      codeChallengeMethod: (code_challenge_method as string) || undefined,
    }
    sessions.set(sessionId, authSession)

    const googleRedirectUri = `http://localhost:${parseInt(process.env.PORT || '3456', 10)}/oauth/callback`
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', clientId)
    googleAuthUrl.searchParams.set('redirect_uri', googleRedirectUri)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'openid email profile')
    googleAuthUrl.searchParams.set('state', sessionId)
    googleAuthUrl.searchParams.set('access_type', 'offline')
    googleAuthUrl.searchParams.set('prompt', 'consent')

    res.redirect(googleAuthUrl.toString())
  }

  async function handleCallback(req: Request, res: Response) {
    const { code, state } = req.query

    if (!code || !state) {
      res.status(400).send('Missing code or state')
      return
    }

    const sessionId = state as string
    const session = sessions.get(sessionId)
    if (!session) {
      res.status(400).send('Invalid state')
      return
    }

    try {
      const googleRedirectUri = `http://localhost:${parseInt(process.env.PORT || '3456', 10)}/oauth/callback`
      const { tokens } = await googleClient.getToken({
        code: code as string,
        redirect_uri: googleRedirectUri,
      })

      const idToken = tokens.id_token
      if (!idToken) {
        res.status(500).send('No ID token received from Google')
        return
      }

      session.idToken = idToken

      const authCode = genId()
      authCodes.set(authCode, session)

      const redirectUrl = new URL(session.redirectUri)
      redirectUrl.searchParams.set('code', authCode)
      redirectUrl.searchParams.set('state', session.state)

      res.redirect(redirectUrl.toString())
    } catch (err) {
      console.error('Google OAuth callback error:', err)
      res.status(500).send('Failed to authenticate with Google')
    }
  }

  async function handleToken(req: Request, res: Response) {
    const { grant_type, code, code_verifier } = req.body || {}

    if (grant_type !== 'authorization_code' || !code) {
      res.status(400).json({ error: 'invalid_grant' })
      return
    }

    const session = authCodes.get(code as string)
    if (!session || session.used) {
      res.status(400).json({ error: 'invalid_grant' })
      return
    }

    if (session.codeChallenge) {
      if (!code_verifier) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'code_verifier required' })
        return
      }
      const method = session.codeChallengeMethod || 'S256'
      let computedChallenge: string
      if (method === 'S256') {
        computedChallenge = base64URLEncode(sha256(code_verifier as string))
      } else if (method === 'plain') {
        computedChallenge = code_verifier as string
      } else {
        res.status(400).json({ error: 'invalid_grant', error_description: `Unsupported code_challenge_method: ${method}` })
        return
      }
      if (computedChallenge !== session.codeChallenge) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'code_verifier mismatch' })
        return
      }
    }

    session.used = true
    authCodes.delete(code as string)

    res.json({
      access_token: session.idToken,
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'openid email',
    })
  }

  return { handleRegister, handleAuthorize, handleCallback, handleToken }
}
