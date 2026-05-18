import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const affiliate = await db.affiliate.findUnique({ where: { email } })

    if (!affiliate) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Simple password check (in production, use hashed passwords)
    if (affiliate.password !== password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!affiliate.isApproved) {
      return NextResponse.json({
        error: 'Your account is pending approval',
        needsApproval: true,
      }, { status: 403 })
    }

    if (!affiliate.isActive) {
      return NextResponse.json({
        error: 'Your account has been deactivated',
        inactive: true,
      }, { status: 403 })
    }

    return NextResponse.json({
      id: affiliate.id,
      affid: affiliate.affid,
      name: affiliate.name,
      email: affiliate.email,
      phone: affiliate.phone,
      company: affiliate.company,
      commissionType: affiliate.commissionType,
      isActive: affiliate.isActive,
      isApproved: affiliate.isApproved,
    })
  } catch (error) {
    console.error('Error during login:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
