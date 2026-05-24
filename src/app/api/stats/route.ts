import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { format, subDays, startOfDay, endOfDay, parseISO, isValid } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const affid = searchParams.get('affid')
    const mode = searchParams.get('mode') // 'admin' for global stats

    // Date range parameters
    const fromDateStr = searchParams.get('from')
    const toDateStr = searchParams.get('to')
    const fromDate = fromDateStr && isValid(parseISO(fromDateStr)) ? startOfDay(parseISO(fromDateStr)) : subDays(new Date(), 30)
    const toDate = toDateStr && isValid(parseISO(toDateStr)) ? endOfDay(parseISO(toDateStr)) : new Date()

    // Filter parameters
    const filterAffid = searchParams.get('filter_affid') || ''
    const filterUtmSource = searchParams.get('filter_utm_source') || ''
    const filterUtmMedium = searchParams.get('filter_utm_medium') || ''
    const filterUtmCampaign = searchParams.get('filter_utm_campaign') || ''

    // If mode=admin, return global admin analytics
    if (mode === 'admin') {
      return getAdminStats(fromDate, toDate, filterAffid, filterUtmSource, filterUtmMedium, filterUtmCampaign)
    }

    if (!affid) {
      return NextResponse.json({ error: 'affid is required' }, { status: 400 })
    }

    const affiliate = await db.affiliate.findUnique({ where: { affid } })
    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    // Build click filter
    const clickWhere: Record<string, unknown> = {
      affid,
      createdAt: { gte: fromDate, lte: toDate },
    }

    // Get clicks for the date range
    const clicks = await db.click.findMany({
      where: clickWhere,
      orderBy: { createdAt: 'asc' },
    })

    // Group clicks by day
    const daysDiff = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)))
    const clicksByDay = new Map<string, { pageviews: number; buttonClicks: number }>()
    for (let i = 0; i < daysDiff; i++) {
      const date = format(subDays(toDate, daysDiff - 1 - i), 'yyyy-MM-dd')
      clicksByDay.set(date, { pageviews: 0, buttonClicks: 0 })
    }

    for (const click of clicks) {
      const day = format(click.createdAt, 'yyyy-MM-dd')
      const current = clicksByDay.get(day) || { pageviews: 0, buttonClicks: 0 }
      if (click.eventType === 'pageview') {
        current.pageviews++
      } else {
        current.buttonClicks++
      }
      clicksByDay.set(day, current)
    }

    const trafficData = Array.from(clicksByDay.entries()).map(([date, data]) => ({
      date,
      label: format(parseISO(date), 'MMM dd'),
      clicks: data.pageviews + data.buttonClicks,
      pageviews: data.pageviews,
      buttonClicks: data.buttonClicks,
    }))

    // Get referrals for funnel
    const referrals = await db.referral.findMany({ where: { affid } })

    const totalClicks = affiliate.totalTraffic
    const leads = referrals.filter(r => r.leadStatus === 'Lead').length
    const bookedCall = referrals.filter(r => r.leadStatus === 'Booked Call').length
    const payingCustomer = referrals.filter(r => r.leadStatus === 'Paying Customer').length
    const churned = referrals.filter(r => r.leadStatus === 'Churned').length
    const totalReferrals = referrals.length
    const paidSignups = payingCustomer + churned

    const funnelData = [
      { stage: 'Traffic', count: totalClicks, percentage: 100 },
      { stage: 'Leads Created', count: totalReferrals, percentage: totalClicks > 0 ? Math.round((totalReferrals / totalClicks) * 100) : 0 },
      { stage: 'Booked Calls', count: bookedCall + payingCustomer + churned, percentage: totalClicks > 0 ? Math.round(((bookedCall + payingCustomer + churned) / totalClicks) * 100) : 0 },
      { stage: 'Paid Signups', count: paidSignups, percentage: totalClicks > 0 ? Math.round((paidSignups / totalClicks) * 100) : 0 },
    ]

    // Financial summary
    const financialSummary = {
      totalEarnings: affiliate.totalEarnings,
      approvedBalance: affiliate.approvedBalance,
      paidBalance: affiliate.paidBalance,
      pendingBalance: affiliate.approvedBalance,
    }

    // Referral status breakdown
    const referralBreakdown = {
      leads,
      bookedCall,
      payingCustomer,
      churned,
      total: totalReferrals,
    }

    // UTM campaign performance
    const campaignPerformance = new Map<string, { total: number; conversions: number }>()
    for (const ref of referrals) {
      const campaign = ref.ltUtmCampaign || ref.ftUtmCampaign || 'unknown'
      const current = campaignPerformance.get(campaign) || { total: 0, conversions: 0 }
      current.total++
      if (ref.leadStatus === 'Paying Customer' || ref.leadStatus === 'Churned') {
        current.conversions++
      }
      campaignPerformance.set(campaign, current)
    }

    const utmPerformance = Array.from(campaignPerformance.entries()).map(([campaign, data]) => ({
      campaign,
      total: data.total,
      conversions: data.conversions,
      conversionRate: data.total > 0 ? Math.round((data.conversions / data.total) * 100) : 0,
    }))

    // Event breakdown
    const eventBreakdown: Record<string, number> = {}
    for (const click of clicks) {
      if (click.eventType === 'button_click' && click.eventId) {
        eventBreakdown[click.eventId] = (eventBreakdown[click.eventId] || 0) + 1
      }
    }

    // Traffic sources by UTM Source
    const trafficSources: Record<string, number> = {}
    for (const click of clicks) {
      const source = click.utmSource || 'direct'
      trafficSources[source] = (trafficSources[source] || 0) + 1
    }

    // Trend data
    const thisWeekClicks = clicks.filter(c => c.createdAt >= subDays(new Date(), 7)).length
    const lastWeekClicks = clicks.filter(c => c.createdAt >= subDays(new Date(), 14) && c.createdAt < subDays(new Date(), 7)).length
    const trendData = {
      thisWeek: thisWeekClicks,
      lastWeek: lastWeekClicks,
      change: lastWeekClicks > 0 ? Math.round(((thisWeekClicks - lastWeekClicks) / lastWeekClicks) * 100) : 0,
    }

    return NextResponse.json({
      trafficData,
      funnelData,
      financialSummary,
      referralBreakdown,
      utmPerformance,
      eventBreakdown,
      trafficSources,
      trendData,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

async function getAdminStats(
  fromDate: Date,
  toDate: Date,
  filterAffid: string,
  filterUtmSource: string,
  filterUtmMedium: string,
  filterUtmCampaign: string
) {
  try {
    // Build the base where clause for clicks
    const clickWhere: Record<string, unknown> = {
      createdAt: { gte: fromDate, lte: toDate },
    }
    if (filterAffid) {
      clickWhere.affid = filterAffid
    }
    if (filterUtmSource) {
      clickWhere.utmSource = filterUtmSource
    }
    if (filterUtmMedium) {
      clickWhere.utmMedium = filterUtmMedium
    }

    // Build referral where
    const referralWhere: Record<string, unknown> = {
      createdAt: { gte: fromDate, lte: toDate },
    }
    if (filterAffid) {
      referralWhere.affid = filterAffid
    }
    if (filterUtmCampaign) {
      referralWhere.ltUtmCampaign = filterUtmCampaign
    }

    // Total traffic
    const totalTraffic = await db.click.count({ where: clickWhere })

    // Count unique visitors
    const uniqueSessions = await db.click.findMany({
      where: { ...clickWhere, sessionId: { not: null } },
      select: { sessionId: true },
      distinct: ['sessionId'],
    })
    const uniqueVisitorCount = uniqueSessions.length

    const totalReferrals = await db.referral.count({ where: referralWhere })

    const bookedCalls = await db.referral.count({
      where: { ...referralWhere, leadStatus: { in: ['Booked Call', 'Paying Customer'] } },
    })

    const payingCustomers = await db.referral.count({
      where: { leadStatus: 'Paying Customer' },
    })

    const activeAffiliates = await db.affiliate.count({
      where: { isActive: true, isApproved: true },
    })

    const affiliateTraffic = totalTraffic

    const blendedRate = totalTraffic > 0 ? Math.round((totalReferrals / totalTraffic) * 100) : 0
    const bookingRate = totalReferrals > 0 ? Math.round((bookedCalls / totalReferrals) * 100) : 0

    // Event breakdown
    const eventClickWhere: Record<string, unknown> = {
      ...clickWhere,
      eventType: 'button_click',
    }
    const allClicks = await db.click.findMany({
      where: eventClickWhere,
      select: { eventId: true },
    })
    const eventBreakdown: Record<string, number> = {}
    for (const click of allClicks) {
      if (click.eventId) {
        eventBreakdown[click.eventId] = (eventBreakdown[click.eventId] || 0) + 1
      }
    }

    // Traffic sources + affid breakdown
    const allClicksForSource = await db.click.findMany({
      where: clickWhere,
      select: { utmSource: true, affid: true, utmMedium: true, utmCampaign: true },
    })
    const trafficSources: Record<string, number> = {}
    const trafficByAffid: Record<string, number> = {}
    const utmMediums: Record<string, number> = {}
    const utmCampaigns: Record<string, number> = {}
    for (const click of allClicksForSource) {
      const source = click.utmSource || 'direct'
      trafficSources[source] = (trafficSources[source] || 0) + 1
      trafficByAffid[click.affid] = (trafficByAffid[click.affid] || 0) + 1
      if (click.utmMedium) {
        utmMediums[click.utmMedium] = (utmMediums[click.utmMedium] || 0) + 1
      }
      if (click.utmCampaign) {
        utmCampaigns[click.utmCampaign] = (utmCampaigns[click.utmCampaign] || 0) + 1
      }
    }

    // Trend data (always based on last 2 weeks regardless of date filter)
    const thisWeekClicks = await db.click.count({
      where: { ...clickWhere, createdAt: { gte: subDays(new Date(), 7) } },
    })
    const lastWeekClicks = await db.click.count({
      where: { ...clickWhere, createdAt: { gte: subDays(new Date(), 14), lt: subDays(new Date(), 7) } },
    })

    // Lead form metrics
    const leadFormOpens = await db.click.count({
      where: {
        ...clickWhere,
        eventType: 'button_click',
        eventId: 'lead_form_open',
      },
    })

    const leadFormOpenEvents = await db.affiliateEvent.count({
      where: {
        eventName: 'lead_form_open',
        createdAt: { gte: fromDate, lte: toDate },
      },
    })
    const totalLeadFormOpens = leadFormOpens + leadFormOpenEvents

    const leadFormCtaIds = ['btn_hero_demo', 'btn_cta_signup', 'btn_nav_contact', 'btn_pricing_tier']
    const leadFormCtaClicks = await db.click.count({
      where: {
        ...clickWhere,
        eventType: 'button_click',
        eventId: { in: leadFormCtaIds },
      },
    })

    const leadFormSubmitRate = totalLeadFormOpens > 0
      ? Math.round((totalReferrals / totalLeadFormOpens) * 100)
      : 0

    const ctaToFormRate = leadFormCtaClicks > 0 && totalLeadFormOpens > 0
      ? Math.round((totalLeadFormOpens / leadFormCtaClicks) * 100)
      : 0

    // Get list of all affid values for filter dropdown
    const allAffids = await db.affiliate.findMany({
      where: { isActive: true },
      select: { affid: true, name: true },
      orderBy: { affid: 'asc' },
    })

    return NextResponse.json({
      totalTraffic,
      uniqueVisitors: uniqueVisitorCount,
      totalReferrals,
      bookedCalls,
      payingCustomers,
      activeAffiliates,
      affiliateTraffic,
      blendedRate,
      bookingRate,
      eventBreakdown,
      trafficSources,
      trafficByAffid,
      leadFormOpens: totalLeadFormOpens,
      leadFormCtaClicks,
      leadFormSubmitRate,
      ctaToFormRate,
      trendData: {
        thisWeek: thisWeekClicks,
        lastWeek: lastWeekClicks,
        change: lastWeekClicks > 0 ? Math.round(((thisWeekClicks - lastWeekClicks) / lastWeekClicks) * 100) : 0,
      },
      // Extra filter metadata
      filters: {
        utmSources: Object.keys(trafficSources).sort(),
        utmMediums: Object.keys(utmMediums).sort(),
        utmCampaigns: Object.keys(utmCampaigns).sort(),
        affids: allAffids.map(a => ({ affid: a.affid, name: a.name })),
      },
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 })
  }
}
