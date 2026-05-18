import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { parseISO } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const affid = searchParams.get('affid')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}
    if (affid) where.affid = affid
    if (type) where.type = type
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {}
      if (startDate) createdAt.gte = parseISO(startDate)
      if (endDate) createdAt.lte = parseISO(endDate)
      where.createdAt = createdAt
    }

    const entries = await db.commissionLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        affiliate: {
          select: { name: true, affid: true, email: true },
        },
        referral: {
          select: { leadName: true, leadEmail: true, planType: true, leadStatus: true },
        },
      },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching commissions:', error)
    return NextResponse.json({ error: 'Failed to fetch commission ledger' }, { status: 500 })
  }
}
