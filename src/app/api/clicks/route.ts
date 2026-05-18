import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const affid = searchParams.get('affid')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}
    if (affid) where.affid = affid
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      }
    }

    const clicks = await db.click.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })

    return NextResponse.json(clicks)
  } catch (error) {
    console.error('Error fetching clicks:', error)
    return NextResponse.json({ error: 'Failed to fetch clicks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { affid, utmSource, utmMedium, utmCampaign, utmContent, ipAddress, userAgent, landingPage } = body

    if (!affid) {
      return NextResponse.json({ error: 'affid is required' }, { status: 400 })
    }

    const affiliate = await db.affiliate.findUnique({ where: { affid } })
    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    const click = await db.click.create({
      data: {
        affiliateId: affiliate.id,
        affid,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmContent: utmContent || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        landingPage: landingPage || null,
      },
    })

    // Update affiliate total traffic
    await db.affiliate.update({
      where: { id: affiliate.id },
      data: { totalTraffic: { increment: 1 } },
    })

    return NextResponse.json(click, { status: 201 })
  } catch (error) {
    console.error('Error creating click:', error)
    return NextResponse.json({ error: 'Failed to create click' }, { status: 500 })
  }
}
