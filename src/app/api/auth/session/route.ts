import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

/**
 * GET /api/auth/session
 * Validates the current session cookie and returns user data.
 * Used by the client to restore auth state on page load.
 */
export async function GET(request: NextRequest) {
  try {
    const { token, type } = getTokenFromCookies(request)

    if (!token || !type) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ authenticated: false, reason: 'token_expired' }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      type: payload.type,
      user: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      },
    })
  } catch (error) {
    console.error('Error checking session:', error)
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
