import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const affid = searchParams.get('affid')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (affid) where.affid = affid

    const payouts = await db.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        affiliate: {
          select: { name: true, affid: true, email: true },
        },
      },
    })

    return NextResponse.json(payouts)
  } catch (error) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { affiliateId, amount, periodStart, periodEnd } = body

    if (!affiliateId || !amount || !periodStart || !periodEnd) {
      return NextResponse.json({ error: 'affiliateId, amount, periodStart, and periodEnd are required' }, { status: 400 })
    }

    const affiliate = await db.affiliate.findUnique({ where: { id: affiliateId } })
    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    const payout = await db.payout.create({
      data: {
        affiliateId,
        affid: affiliate.affid,
        amount,
        status: 'pending',
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    })

    return NextResponse.json(payout, { status: 201 })
  } catch (error) {
    console.error('Error creating payout:', error)
    return NextResponse.json({ error: 'Failed to create payout' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { payoutIds, status } = body

    if (!payoutIds || !Array.isArray(payoutIds) || !status) {
      return NextResponse.json({ error: 'payoutIds (array) and status are required' }, { status: 400 })
    }

    if (!['approved', 'processed'].includes(status)) {
      return NextResponse.json({ error: 'Status must be approved or processed' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status }
    if (status === 'processed') {
      updateData.processedAt = new Date()
    }

    const result = await db.payout.updateMany({
      where: { id: { in: payoutIds } },
      data: updateData,
    })

    // If processing payouts, update affiliate paid balances
    if (status === 'processed') {
      const payouts = await db.payout.findMany({
        where: { id: { in: payoutIds } },
      })

      // Group by affiliate and update balances
      const affiliateUpdates = new Map<string, number>()
      for (const payout of payouts) {
        const current = affiliateUpdates.get(payout.affiliateId) || 0
        affiliateUpdates.set(payout.affiliateId, current + payout.amount)
      }

      for (const [affiliateId, amount] of affiliateUpdates) {
        await db.affiliate.update({
          where: { id: affiliateId },
          data: {
            paidBalance: { increment: amount },
            approvedBalance: { decrement: amount },
          },
        })
      }
    }

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Error updating payouts:', error)
    return NextResponse.json({ error: 'Failed to update payouts' }, { status: 500 })
  }
}
