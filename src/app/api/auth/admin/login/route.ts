import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createToken, setAuthCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({ where: { email } })

    if (!admin) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!admin.isActive) {
      return NextResponse.json({ error: 'Admin account is deactivated' }, { status: 403 })
    }

    const isValid = await bcrypt.compare(password, admin.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Create JWT token and set as httpOnly cookie
    const token = await createToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      type: 'admin',
    })

    const response = NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    })

    return setAuthCookie(response, 'admin', token)
  } catch (error) {
    console.error('Error during admin login:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
