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
    const withTests = searchParams.get('withTests') !== 'false' // default true, exclude when 'false'

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
    if (!withTests) referralWhere.leadStatus = { notIn: ['Test'] }

    // Parse series breakdown parameter
    const seriesBy = searchParams.get('seriesBy') || '' // e.g. 'utmSource', 'utmMedium', 'utmCampaign', 'affid'

    // If mode=admin, return global admin analytics
    if (mode === 'admin') {
      return getAdminStats(clickWhere, referralWhere, dateFrom, dateTo, withTests, seriesBy)
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
    const attendees = referrals.filter(r => r.leadStatus === 'Attendee' || r.leadStatus === 'Booked Call').length
    const noShows = referrals.filter(r => r.leadStatus === 'No Show').length
    const tests = referrals.filter(r => r.leadStatus === 'Test').length
    const won = referrals.filter(r => r.leadStatus === 'Won' || r.leadStatus === 'Paying Customer').length
    const lost = referrals.filter(r => r.leadStatus === 'Lost' || r.leadStatus === 'Churned').length
    const totalReferrals = referrals.length
    const paidSignups = won

    const funnelData = [
      { stage: 'Traffic', count: totalClicks, percentage: 100 },
      { stage: 'Leads', count: totalReferrals, percentage: totalClicks > 0 ? Math.round((totalReferrals / totalClicks) * 100) : 0 },
      { stage: 'Attendees', count: attendees + tests + won, percentage: totalClicks > 0 ? Math.round(((attendees + tests + won) / totalClicks) * 100) : 0 },
      { stage: 'Won', count: won, percentage: totalClicks > 0 ? Math.round((won / totalClicks) * 100) : 0 },
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
      attendees,
      noShows,
      tests,
      won,
      lost,
      total: totalReferrals,
    }

    // UTM campaign performance (using last-touch UTMs)
    const campaignPerformance = new Map<string, { total: number; conversions: number }>()
    for (const ref of referrals) {
      const campaign = ref.ltUtmCampaign || ref.ftUtmCampaign || 'unknown'
      const current = campaignPerformance.get(campaign) || { total: 0, conversions: 0 }
      current.total++
      if (ref.leadStatus === 'Won' || ref.leadStatus === 'Paying Customer') {
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

async function getAdminStats(clickWhere: any, referralWhere: any, dateFrom: Date, dateTo: Date, withTests: boolean = true, seriesBy: string = '') {
  try {
    // If excluding tests, find session IDs that submitted test leads to exclude their click traffic too
    let effectiveClickWhere = { ...clickWhere }
    if (!withTests) {
      // Find affiliates that have test referrals
      const testReferrals = await db.referral.findMany({
        where: { leadStatus: 'Test', createdAt: { gte: dateFrom, lte: dateTo } },
        select: { affid: true },
      })
      const testAffids = new Set(testReferrals.map(r => r.affid))
      if (testAffids.size > 0) {
        // Only exclude an affiliate's clicks if ALL their referrals in this period are tests
        // If they have a mix of real + test leads, keep their traffic (it includes real leads)
        const affidsToExclude: string[] = []
        for (const aff of testAffids) {
          const nonTestCount = await db.referral.count({
            where: { affid: aff, leadStatus: { notIn: ['Test'] }, createdAt: { gte: dateFrom, lte: dateTo } },
          })
          if (nonTestCount === 0) {
            affidsToExclude.push(aff)
          }
        }
        if (affidsToExclude.length > 0) {
          // If affid was already filtered to a specific value, don't override
          if (!effectiveClickWhere.affid || typeof effectiveClickWhere.affid === 'string') {
            effectiveClickWhere.affid = { notIn: affidsToExclude }
          } else if (effectiveClickWhere.affid?.notIn) {
            effectiveClickWhere.affid = { notIn: [...effectiveClickWhere.affid.notIn, ...affidsToExclude] }
          }
        }
      }
    }

    // Total traffic across all affiliates
    const totalTraffic = await db.click.count({ where: effectiveClickWhere })

    // Count unique visitors by distinct session IDs
    const uniqueSessions = await db.click.findMany({
      where: { ...effectiveClickWhere, sessionId: { not: null } },
      select: { sessionId: true },
      distinct: ['sessionId'],
    })
    const uniqueVisitorCount = uniqueSessions.length

    const totalReferrals = await db.referral.count({ where: referralWhere })

    const bookedCalls = await db.referral.count({
      where: { ...referralWhere, leadStatus: { in: ['Attendee', 'Booked Call', ...(withTests ? ['Test'] : []), 'Won', 'Paying Customer'] } },
    })

    const payingCustomers = await db.referral.count({
      where: { leadStatus: { in: ['Won', 'Paying Customer'] } },
    })

    const activeAffiliates = await db.affiliate.count({
      where: { isActive: true, isApproved: true },
    })

    const affiliateTraffic = await db.click.count({ where: effectiveClickWhere })

    const blendedRate = totalTraffic > 0 ? Math.round((totalReferrals / totalTraffic) * 100) : 0
    const bookingRate = totalReferrals > 0 ? Math.round((bookedCalls / totalReferrals) * 100) : 0

    // Event breakdown across all affiliates
    const allClicks = await db.click.findMany({
      where: { ...effectiveClickWhere, eventType: 'button_click' },
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
      where: effectiveClickWhere,
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
      where: { ...effectiveClickWhere, createdAt: { gte: thisWeekStart, lte: dateTo } },
    })
    const lastWeekClicks = await db.click.count({
      where: { ...effectiveClickWhere, createdAt: { gte: dateFrom, lt: thisWeekStart } },
    })

    // Lead form metrics
    const leadFormOpens = await db.click.count({
      where: {
        ...effectiveClickWhere,
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
        ...effectiveClickWhere,
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

    // Daily time-series for KPI sparklines
    const daysDiff = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)))
    const dailyTraffic: { date: string; value: number }[] = []
    const dailyUniqueVisitors: { date: string; value: number }[] = []
    const dailyCtaClicks: { date: string; value: number }[] = []
    const dailyFormOpens: { date: string; value: number }[] = []
    const dailyReferrals: { date: string; value: number }[] = []
    const dailyConversionRate: { date: string; value: number }[] = []
    const dailyBookingRate: { date: string; value: number }[] = []

    // Fetch all clicks and referrals for daily grouping
    const [allClicksForDaily, allReferralsForDaily] = await Promise.all([
      db.click.findMany({ where: effectiveClickWhere, select: { createdAt: true, eventType: true, eventId: true, sessionId: true } }),
      db.referral.findMany({ where: referralWhere, select: { createdAt: true, leadStatus: true } }),
    ])

    for (let i = 0; i < daysDiff; i++) {
      const dayStart = new Date(dateFrom.getTime() + i * 86400000)
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      const dayLabel = format(dayStart, 'yyyy-MM-dd')

      const dayClicks = allClicksForDaily.filter(c => c.createdAt >= dayStart && c.createdAt < dayEnd)
      const dayReferrals = allReferralsForDaily.filter(r => r.createdAt >= dayStart && r.createdAt < dayEnd)
      const dayUniqueSessions = new Set(dayClicks.filter(c => c.sessionId).map(c => c.sessionId)).size
      const dayCtaClicks = dayClicks.filter(c => c.eventType === 'button_click' && ['btn_hero_demo', 'btn_cta_signup', 'btn_nav_contact', 'btn_pricing_tier'].includes(c.eventId || '')).length
      const dayFormOpens = dayClicks.filter(c => c.eventType === 'button_click' && c.eventId === 'lead_form_open').length
      const dayTraffic = dayClicks.length
      const dayReferralCount = dayReferrals.length
      const dayBooked = dayReferrals.filter(r => ['Attendee', 'Booked Call', 'Won', 'Paying Customer', ...(withTests ? ['Test'] : [])].includes(r.leadStatus)).length

      dailyTraffic.push({ date: dayLabel, value: dayTraffic })
      dailyUniqueVisitors.push({ date: dayLabel, value: dayUniqueSessions })
      dailyCtaClicks.push({ date: dayLabel, value: dayCtaClicks })
      dailyFormOpens.push({ date: dayLabel, value: dayFormOpens })
      dailyReferrals.push({ date: dayLabel, value: dayReferralCount })
      dailyConversionRate.push({ date: dayLabel, value: dayTraffic > 0 ? Math.round((dayReferralCount / dayTraffic) * 100) : 0 })
      dailyBookingRate.push({ date: dayLabel, value: dayReferralCount > 0 ? Math.round((dayBooked / dayReferralCount) * 100) : 0 })
    }

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
      dailyTimeSeries: {
        traffic: dailyTraffic,
        uniqueVisitors: dailyUniqueVisitors,
        ctaClicks: dailyCtaClicks,
        formOpens: dailyFormOpens,
        referrals: dailyReferrals,
        conversionRate: dailyConversionRate,
        bookingRate: dailyBookingRate,
      },
      ...(seriesBy ? await getTimeSeriesByGroup(effectiveClickWhere, referralWhere, dateFrom, dateTo, withTests, seriesBy) : {}),
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 })
  }
}

async function getTimeSeriesByGroup(
  clickWhere: any,
  referralWhere: any,
  dateFrom: Date,
  dateTo: Date,
  withTests: boolean,
  seriesBy: string
) {
  // Determine which field to group by
  const validFields = ['utmSource', 'utmMedium', 'utmCampaign', 'affid']
  if (!validFields.includes(seriesBy)) return {}

  const daysDiff = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)))

  // Fetch all clicks with the grouping field
  const allClicks = await db.click.findMany({
    where: clickWhere,
    select: {
      createdAt: true,
      eventType: true,
      eventId: true,
      sessionId: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      affid: true,
    },
  })

  // Fetch all referrals with the grouping field (via affid)
  const allReferrals = await db.referral.findMany({
    where: referralWhere,
    select: {
      createdAt: true,
      leadStatus: true,
      affid: true,
    },
  })

  // Get distinct group values
  const groupValues = [...new Set(allClicks.map(c => c[seriesBy] || '(direct)'))].sort() as string[]

  // Build daily time-series per group
  const seriesData: Record<string, {
    traffic: { date: string; value: number }[]
    uniqueVisitors: { date: string; value: number }[]
    ctaClicks: { date: string; value: number }[]
    formOpens: { date: string; value: number }[]
    referrals: { date: string; value: number }[]
    conversionRate: { date: string; value: number }[]
    bookingRate: { date: string; value: number }[]
  }> = {}

  const ctaIds = ['btn_hero_demo', 'btn_cta_signup', 'btn_nav_contact', 'btn_pricing_tier']

  for (const groupVal of groupValues) {
    const groupClicks = allClicks.filter(c => (c[seriesBy] || '(direct)') === groupVal)
    const groupAffid = seriesBy === 'affid' ? groupVal : null
    const groupReferrals = groupAffid
      ? allReferrals.filter(r => r.affid === groupAffid)
      : allReferrals // For UTM-based grouping on referrals, we use the affid from the referral (approximation)

    const traffic: { date: string; value: number }[] = []
    const uniqueVisitors: { date: string; value: number }[] = []
    const ctaClicks: { date: string; value: number }[] = []
    const formOpens: { date: string; value: number }[] = []
    const referrals: { date: string; value: number }[] = []
    const conversionRate: { date: string; value: number }[] = []
    const bookingRate: { date: string; value: number }[] = []

    for (let i = 0; i < daysDiff; i++) {
      const dayStart = new Date(dateFrom.getTime() + i * 86400000)
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      const dayLabel = format(dayStart, 'yyyy-MM-dd')

      const dayClicks = groupClicks.filter(c => c.createdAt >= dayStart && c.createdAt < dayEnd)
      const dayReferrals = groupReferrals.filter(r => r.createdAt >= dayStart && r.createdAt < dayEnd)
      const dayUniqueSessions = new Set(dayClicks.filter(c => c.sessionId).map(c => c.sessionId)).size
      const dayCtaClicks = dayClicks.filter(c => c.eventType === 'button_click' && ctaIds.includes(c.eventId || '')).length
      const dayFormOpens = dayClicks.filter(c => c.eventType === 'button_click' && c.eventId === 'lead_form_open').length
      const dayTraffic = dayClicks.length
      const dayReferralCount = dayReferrals.length
      const dayBooked = dayReferrals.filter(r => ['Attendee', 'Booked Call', 'Won', 'Paying Customer', ...(withTests ? ['Test'] : [])].includes(r.leadStatus)).length

      traffic.push({ date: dayLabel, value: dayTraffic })
      uniqueVisitors.push({ date: dayLabel, value: dayUniqueSessions })
      ctaClicks.push({ date: dayLabel, value: dayCtaClicks })
      formOpens.push({ date: dayLabel, value: dayFormOpens })
      referrals.push({ date: dayLabel, value: dayReferralCount })
      conversionRate.push({ date: dayLabel, value: dayTraffic > 0 ? Math.round((dayReferralCount / dayTraffic) * 100) : 0 })
      bookingRate.push({ date: dayLabel, value: dayReferralCount > 0 ? Math.round((dayBooked / dayReferralCount) * 100) : 0 })
    }

    seriesData[groupVal] = { traffic, uniqueVisitors, ctaClicks, formOpens, referrals, conversionRate, bookingRate }
  }

  return { seriesBy, seriesData }
}
