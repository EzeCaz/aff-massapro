import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createToken, setAuthCookie, verifyToken } from '@/lib/auth'

const ADMIN_COOKIE_NAME = 'massapro_admin_session'

export async function POST(request: NextRequest) {
  try {
    // Verify the requester is a super_admin
    const cookie = request.cookies.get(ADMIN_COOKIE_NAME)
    if (!cookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(cookie.value)
    if (!payload || payload.type !== 'admin' || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can create admin accounts' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, name, role } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    // Check if admin already exists
    const existing = await db.admin.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Admin with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const admin = await db.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'admin',
        isActive: true,
      },
    })

    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    })
  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 })
  }
}
