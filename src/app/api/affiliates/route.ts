import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const affiliates = await db.affiliate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { clicks: true, referrals: true, payouts: true },
        },
      },
    })
    return NextResponse.json(affiliates)
  } catch (error) {
    console.error('Error fetching affiliates:', error)
    return NextResponse.json({ error: 'Failed to fetch affiliates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, affid, company, commissionType, isActive, isApproved } = body

    if (!name || !email || !affid) {
      return NextResponse.json({ error: 'Name, email, and affid are required' }, { status: 400 })
    }

    const affiliate = await db.affiliate.create({
      data: {
        name,
        email,
        phone: phone || null,
        company: company || null,
        affid,
        isActive: isActive !== undefined ? isActive : true,
        isApproved: isApproved !== undefined ? isApproved : true,
        commissionType: commissionType || 'standard',
      },
    })

    return NextResponse.json(affiliate, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating affiliate:', error)
    const message = error instanceof Error && error.message.includes('Unique')
      ? 'Affiliate with this email or affid already exists'
      : 'Failed to create affiliate'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
