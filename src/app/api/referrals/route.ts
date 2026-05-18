import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const affid = searchParams.get('affid')

    const where: Record<string, unknown> = {}
    if (affid) where.affid = affid

    const referrals = await db.referral.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(referrals)
  } catch (error) {
    console.error('Error fetching referrals:', error)
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { affid, leadName, leadEmail, planType, leadStatus, utmCampaign, utmContent } = body

    if (!affid || !leadName || !planType || !leadStatus) {
      return NextResponse.json({ error: 'affid, leadName, planType, and leadStatus are required' }, { status: 400 })
    }

    const affiliate = await db.affiliate.findUnique({ where: { affid } })
    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    const commissionMap: Record<string, number> = {
      Enterprise: 100,
      Professional: 50,
      Basic: 10,
    }

    const monthlyCommission = commissionMap[planType] || 10
    const signupCommission = (leadStatus === 'Active Subscriber' || leadStatus === 'Churned') ? 100 : 0

    const referral = await db.referral.create({
      data: {
        affiliateId: affiliate.id,
        affid,
        leadName,
        leadEmail: leadEmail || null,
        planType,
        leadStatus,
        signupCommission,
        monthlyCommission,
        monthsActive: 0,
        totalCommission: signupCommission,
        utmCampaign: utmCampaign || null,
        utmContent: utmContent || null,
      },
    })

    // Update affiliate stats
    const totalCommission = signupCommission
    await db.affiliate.update({
      where: { id: affiliate.id },
      data: {
        totalConversions: { increment: 1 },
        totalEarnings: { increment: totalCommission },
        approvedBalance: { increment: totalCommission },
      },
    })

    return NextResponse.json(referral, { status: 201 })
  } catch (error) {
    console.error('Error creating referral:', error)
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 })
  }
}
