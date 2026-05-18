import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const affiliate = await db.affiliate.findUnique({
      where: { id },
      include: {
        _count: {
          select: { clicks: true, referrals: true, payouts: true },
        },
      },
    })

    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    return NextResponse.json(affiliate)
  } catch (error) {
    console.error('Error fetching affiliate:', error)
    return NextResponse.json({ error: 'Failed to fetch affiliate' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, phone, isActive, approvedBalance, paidBalance, totalEarnings } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (isActive !== undefined) updateData.isActive = isActive
    if (approvedBalance !== undefined) updateData.approvedBalance = approvedBalance
    if (paidBalance !== undefined) updateData.paidBalance = paidBalance
    if (totalEarnings !== undefined) updateData.totalEarnings = totalEarnings

    const affiliate = await db.affiliate.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(affiliate)
  } catch (error) {
    console.error('Error updating affiliate:', error)
    return NextResponse.json({ error: 'Failed to update affiliate' }, { status: 500 })
  }
}
