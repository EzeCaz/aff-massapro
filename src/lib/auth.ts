import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'massapro-auth-secret-key-2024-change-in-production'
)

const COOKIE_NAMES = {
  admin: 'massapro_admin_session',
  affiliate: 'massapro_affiliate_session',
} as const

export interface AuthTokenPayload {
  id: string
  email: string
  name: string
  role?: string
  type: 'admin' | 'affiliate'
}

/**
 * Create a signed JWT token with the given payload.
 * Token expires in 24 hours.
 */
export async function createToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(AUTH_SECRET)
}

/**
 * Verify a JWT token and return the payload, or null if invalid/expired.
 */
export async function verifyToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET)
    return payload as unknown as AuthTokenPayload
  } catch {
    return null
  }
}

/**
 * Extract auth token and type from request cookies.
 */
export function getTokenFromCookies(request: NextRequest): {
  token: string | null
  type: 'admin' | 'affiliate' | null
} {
  const adminToken = request.cookies.get(COOKIE_NAMES.admin)?.value
  const affiliateToken = request.cookies.get(COOKIE_NAMES.affiliate)?.value

  if (adminToken) return { token: adminToken, type: 'admin' }
  if (affiliateToken) return { token: affiliateToken, type: 'affiliate' }
  return { token: null, type: null }
}

/**
 * Set an authentication cookie on the response.
 */
export function setAuthCookie(
  response: NextResponse,
  type: 'admin' | 'affiliate',
  token: string
): NextResponse {
  response.cookies.set({
    name: COOKIE_NAMES[type],
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 86400, // 24 hours
  })
  return response
}

/**
 * Clear all authentication cookies on the response.
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  for (const name of Object.values(COOKIE_NAMES)) {
    response.cookies.set({
      name,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  }
  return response
}
