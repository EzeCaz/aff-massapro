import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const hashedPassword = await bcrypt.hash(password, 12)

    const admin = await prisma.admin.updateMany({
      where: { email },
      data: { password: hashedPassword },
    })

    const affiliate = await prisma.affiliate.updateMany({
      where: { email },
      data: { password: hashedPassword },
    })

    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      adminUpdated: admin.count,
      affiliateUpdated: affiliate.count,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
