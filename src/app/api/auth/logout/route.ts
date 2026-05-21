import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth'

/**
 * POST /api/auth/logout
 * Clears all authentication cookies, effectively logging the user out.
 */
export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' })
  return clearAuthCookies(response)
}
