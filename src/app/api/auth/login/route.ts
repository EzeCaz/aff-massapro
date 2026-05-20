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

    const affiliate = await db.affiliate.findUnique({ where: { email } })

    if (!affiliate) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Check if the password is bcrypt-hashed (hashes start with $2a$, $2b$, or $2y$)
    const isHashed = affiliate.password.startsWith('$2')

    let isValid = false
    if (isHashed) {
      // Modern: bcrypt comparison
      isValid = await bcrypt.compare(password, affiliate.password)
    } else {
      // Legacy: plaintext comparison with auto-upgrade to bcrypt
      isValid = affiliate.password === password
      if (isValid) {
        const hashedPassword = await bcrypt.hash(password, 12)
        await db.affiliate.update({
          where: { id: affiliate.id },
          data: { password: hashedPassword },
        })
      }
    }

    if (!isValid) {
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

    // Create JWT token and set as httpOnly cookie
    const token = await createToken({
      id: affiliate.id,
      email: affiliate.email,
      name: affiliate.name,
      type: 'affiliate',
    })

    const response = NextResponse.json({
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

    return setAuthCookie(response, 'affiliate', token)
  } catch (error) {
    console.error('Error during login:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
