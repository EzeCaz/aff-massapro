import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

/**
 * Middleware for protecting API routes based on authentication and role.
 *
 * Public routes (no auth needed):
 *   - /api/track/*        (pixel tracking)
 *   - /api/auth/*         (login, session, logout)
 *   - /api/generate-link  (link generation)
 *
 * Admin-only routes:
 *   - /api/admins         (full CRUD)
 *   - /api/payouts        (write: POST, PUT)
 *   - /api/commissions    (all)
 *   - /api/applications/* (PUT = approve/reject)
 *
 * Authenticated routes (admin OR affiliate):
 *   - /api/affiliates     (GET for both; POST/PUT/DELETE for admin only)
 *   - /api/clicks         (GET)
 *   - /api/referrals      (GET)
 *   - /api/events         (GET)
 *   - /api/stats          (GET)
 */

// Routes that are completely public
const PUBLIC_ROUTE_PREFIXES = [
  '/api/track',
  '/api/auth',
  '/api/generate-link',
]

// Routes that require admin role for ALL methods
const ADMIN_ONLY_ROUTE_PREFIXES = [
  '/api/admins',
  '/api/commissions',
]

// Routes where write operations require admin role
const ADMIN_WRITE_ROUTES: { pattern: RegExp; methods: string[] }[] = [
  { pattern: /^\/api\/affiliates$/, methods: ['POST'] },
  { pattern: /^\/api\/affiliates\/[^/]+$/, methods: ['PUT', 'DELETE', 'PATCH'] },
  { pattern: /^\/api\/applications\/[^/]+$/, methods: ['PUT', 'PATCH'] },
  { pattern: /^\/api\/payouts$/, methods: ['POST', 'PUT', 'PATCH'] },
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only process API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow public routes
  if (PUBLIC_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Check admin-only routes
  const isAdminOnlyRoute = ADMIN_ONLY_ROUTE_PREFIXES.some(
    prefix => pathname.startsWith(prefix)
  )

  // Check if this is a write operation that requires admin
  const isAdminWriteOp = ADMIN_WRITE_ROUTES.some(
    route => route.pattern.test(pathname) && route.methods.includes(request.method)
  )

  if (isAdminOnlyRoute || isAdminWriteOp) {
    // Require admin authentication
    const { token, type } = getTokenFromCookies(request)

    if (!token || type !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'admin') {
      return NextResponse.json(
        { error: 'Invalid or expired admin session' },
        { status: 403 }
      )
    }

    // Add admin info to request headers for downstream use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-auth-type', 'admin')
    requestHeaders.set('x-auth-role', payload.role || 'admin')
    requestHeaders.set('x-auth-email', payload.email)

    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  // For other routes, require any authenticated user (admin or affiliate)
  const { token } = getTokenFromCookies(request)

  if (!token) {
    // Allow GET requests without auth for backwards compatibility
    // (some components fetch data without checking auth)
    if (request.method === 'GET') {
      return NextResponse.next()
    }
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    )
  }

  // Add auth info to request headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-auth-type', payload.type)
  if (payload.role) requestHeaders.set('x-auth-role', payload.role)
  requestHeaders.set('x-auth-email', payload.email)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
