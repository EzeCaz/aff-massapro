import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const affid = searchParams.get('affid')
    const mode = searchParams.get('mode') // 'admin' for global stats, 'filters' for filter options

    // If mode=filters, return available filter values
    if (mode === 'filters') {
      return getFilterOptions()
    }

    // Parse date range
    const dateFromStr = searchParams.get('dateFrom')
    const dateToStr = searchParams.get('dateTo')
    const dateFrom = dateFromStr ? startOfDay(parseISO(dateFromStr)) : subDays(new Date(), 30)
    const dateTo = dateToStr ? endOfDay(parseISO(dateToStr)) : new Date()

    // Parse UTM filters
    const utmSource = searchParams.get('utmSource')
    const utmMedium = searchParams.get('utmMedium')
    const utmCampaign = searchParams.get('utmCampaign')
    const utmTerm = searchParams.get('utmTerm')
    const utmContent = searchParams.get('utmContent')
    const filterAffid = searchParams.get('affid') // separate from the affiliate-specific stats affid

    // Build where clause for clicks
    const clickWhere: any = {
      createdAt: { gte: dateFrom, lte: dateTo },
    }
    if (utmSource) clickWhere.utmSource = utmSource
    if (utmMedium) clickWhere.utmMedium = utmMedium
    if (utmCampaign) clickWhere.utmCampaign = utmCampaign
    if (utmTerm) clickWhere.utmTerm = utmTerm
    if (utmContent) clickWhere.utmContent = utmContent
    if (filterAffid) clickWhere.affid = filterAffid

    // Build where clause for referrals
    const referralWhere: any = {
      createdAt: { gte: dateFrom, lte: dateTo },
    }
    if (filterAffid) referralWhere.affid = filterAffid

    // If mode=admin, return global admin analytics
    if (mode === 'admin') {
      return getAdminStats(clickWhere, referralWhere, dateFrom, dateTo)
    }

    if (!affid) {
      return NextResponse.json({ error: 'affid is required' }, { status: 400 })
    }

    const affiliate = await db.affiliate.findUnique({ where: { affid } })
    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    // Override click where with affiliate-specific filter
    const affiliateClickWhere = { ...clickWhere, affid }
    const affiliateReferralWhere = { ...referralWhere, affid }

    // Get clicks for the date range
    const clicks = await db.click.findMany({
      where: affiliateClickWhere,
      orderBy: { createdAt: 'asc' },
    })

    // Group clicks by day
    const daysDiff = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)))
    const clicksByDay = new Map<string, { pageviews: number; buttonClicks: number }>()
    for (let i = 0; i < daysDiff; i++) {
      const date = format(subDays(dateTo, daysDiff - 1 - i), 'yyyy-MM-dd')
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
    const referrals = await db.referral.findMany({ where: affiliateReferralWhere })

    const totalClicks = clicks.length
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

    // UTM campaign performance (using last-touch UTMs)
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

    // Trend data (week-over-week within the date range)
    const thisWeekStart = subDays(new Date(), 7)
    const lastWeekStart = subDays(new Date(), 14)
    const thisWeekClicks = clicks.filter(c => c.createdAt >= thisWeekStart).length
    const lastWeekClicks = clicks.filter(c => c.createdAt >= lastWeekStart && c.createdAt < thisWeekStart).length
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

async function getFilterOptions() {
  try {
    // Get distinct UTM values and affid values from the Click table
    const allClicks = await db.click.findMany({
      select: {
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        affid: true,
      },
    })

    const utmSources = [...new Set(allClicks.map(c => c.utmSource).filter(Boolean))] as string[]
    const utmMediums = [...new Set(allClicks.map(c => c.utmMedium).filter(Boolean))] as string[]
    const utmCampaigns = [...new Set(allClicks.map(c => c.utmCampaign).filter(Boolean))] as string[]
    const affids = [...new Set(allClicks.map(c => c.affid).filter(Boolean))] as string[]

    return NextResponse.json({
      utmSources: utmSources.sort(),
      utmMediums: utmMediums.sort(),
      utmCampaigns: utmCampaigns.sort(),
      affids: affids.sort(),
    })
  } catch (error) {
    console.error('Error fetching filter options:', error)
    return NextResponse.json({ error: 'Failed to fetch filter options' }, { status: 500 })
  }
}

async function getAdminStats(clickWhere: any, referralWhere: any, dateFrom: Date, dateTo: Date) {
  try {
    // Total traffic across all affiliates
    const totalTraffic = await db.click.count({ where: clickWhere })

    // Count unique visitors by distinct session IDs
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

    const affiliateTraffic = await db.click.count({ where: clickWhere })

    const blendedRate = totalTraffic > 0 ? Math.round((totalReferrals / totalTraffic) * 100) : 0
    const bookingRate = totalReferrals > 0 ? Math.round((bookedCalls / totalReferrals) * 100) : 0

    // Event breakdown across all affiliates
    const allClicks = await db.click.findMany({
      where: { ...clickWhere, eventType: 'button_click' },
      select: { eventId: true },
    })
    const eventBreakdown: Record<string, number> = {}
    for (const click of allClicks) {
      if (click.eventId) {
        eventBreakdown[click.eventId] = (eventBreakdown[click.eventId] || 0) + 1
      }
    }

    // Traffic sources
    const allClicksForSource = await db.click.findMany({
      where: clickWhere,
      select: { utmSource: true, affid: true },
    })
    const trafficSources: Record<string, number> = {}
    const trafficByAffid: Record<string, number> = {}
    for (const click of allClicksForSource) {
      const source = click.utmSource || 'direct'
      trafficSources[source] = (trafficSources[source] || 0) + 1
      trafficByAffid[click.affid] = (trafficByAffid[click.affid] || 0) + 1
    }

    // Trend data (within the filtered date range)
    const rangeMid = new Date((dateFrom.getTime() + dateTo.getTime()) / 2)
    const thisWeekStart = rangeMid
    const thisWeekClicks = await db.click.count({
      where: { ...clickWhere, createdAt: { gte: thisWeekStart, lte: dateTo } },
    })
    const lastWeekClicks = await db.click.count({
      where: { ...clickWhere, createdAt: { gte: dateFrom, lt: thisWeekStart } },
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
        createdAt: { gte: dateFrom, lte: dateTo },
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
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 })
  }
}
