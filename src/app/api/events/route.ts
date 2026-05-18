import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { format, subDays, parseISO } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const affid = searchParams.get('affid')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!affid) {
      return NextResponse.json({ error: 'affid is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { affid }
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {}
      if (startDate) createdAt.gte = parseISO(startDate)
      if (endDate) createdAt.lte = parseISO(endDate)
      where.createdAt = createdAt
    }

    // Event breakdown by eventId
    const clicks = await db.click.findMany({ where })

    const eventBreakdown: Record<string, number> = {}
    let pageviews = 0
    let buttonClicks = 0

    for (const click of clicks) {
      if (click.eventType === 'pageview') {
        pageviews++
      } else if (click.eventType === 'button_click' && click.eventId) {
        buttonClicks++
        eventBreakdown[click.eventId] = (eventBreakdown[click.eventId] || 0) + 1
      }
    }

    // Traffic sources by UTM source
    const trafficSources: Record<string, number> = {}
    for (const click of clicks) {
      const source = click.utmSource || 'direct'
      trafficSources[source] = (trafficSources[source] || 0) + 1
    }

    // Traffic by affiliate (affid)
    const trafficByAffid: Record<string, number> = {}
    for (const click of clicks) {
      trafficByAffid[click.affid] = (trafficByAffid[click.affid] || 0) + 1
    }

    // Trend data (daily for last 30 days)
    const trendData = []
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const dayClicks = clicks.filter(c => format(new Date(c.createdAt), 'yyyy-MM-dd') === date)
      trendData.push({
        date,
        label: format(subDays(new Date(), i), 'MMM dd'),
        pageviews: dayClicks.filter(c => c.eventType === 'pageview').length,
        buttonClicks: dayClicks.filter(c => c.eventType === 'button_click').length,
        total: dayClicks.length,
      })
    }

    return NextResponse.json({
      eventBreakdown,
      trafficSources,
      trafficByAffid,
      trendData,
      summary: { pageviews, buttonClicks, total: clicks.length },
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Failed to fetch event analytics' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { affid, eventId, eventType, sessionId, utm_source, utm_medium, utm_campaign, utm_content, utm_term, page_url } = body

    if (!affid) {
      return NextResponse.json({ error: 'affid is required' }, { status: 400 })
    }

    const affiliate = await db.affiliate.findUnique({ where: { affid } })
    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }
    if (!affiliate.isActive) {
      return NextResponse.json({ error: 'Affiliate is not active' }, { status: 404 })
    }

    const click = await db.click.create({
      data: {
        affiliateId: affiliate.id,
        affid,
        utmSource: utm_source || null,
        utmMedium: utm_medium || null,
        utmCampaign: utm_campaign || null,
        utmContent: utm_content || null,
        utmTerm: utm_term || null,
        pageUrl: page_url || null,
        eventType: eventType || (eventId ? 'button_click' : 'pageview'),
        eventId: eventId || null,
        sessionId: sessionId || null,
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    })

    await db.affiliate.update({
      where: { id: affiliate.id },
      data: { totalTraffic: { increment: 1 } },
    })

    return NextResponse.json({ success: true, clickId: click.id }, { status: 201 })
  } catch (error) {
    console.error('Error recording event:', error)
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
  }
}
