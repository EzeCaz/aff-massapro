import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { format, subDays, startOfDay, parseISO } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const affid = searchParams.get('affid')

    if (!affid) {
      return NextResponse.json({ error: 'affid is required' }, { status: 400 })
    }

    const affiliate = await db.affiliate.findUnique({ where: { affid } })
    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    // Get clicks for last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30)
    const clicks = await db.click.findMany({
      where: {
        affid,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group clicks by day
    const clicksByDay = new Map<string, number>()
    for (let i = 0; i < 30; i++) {
      const date = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd')
      clicksByDay.set(date, 0)
    }

    for (const click of clicks) {
      const day = format(click.createdAt, 'yyyy-MM-dd')
      const current = clicksByDay.get(day) || 0
      clicksByDay.set(day, current + 1)
    }

    const trafficData = Array.from(clicksByDay.entries()).map(([date, count]) => ({
      date,
      label: format(parseISO(date), 'MMM dd'),
      clicks: count,
    }))

    // Get referrals for funnel
    const referrals = await db.referral.findMany({ where: { affid } })

    const totalClicks = affiliate.totalTraffic
    const leads = referrals.filter(r => r.leadStatus === 'Lead').length
    const callBooked = referrals.filter(r => r.leadStatus === 'Call Booked').length
    const activeSubscribers = referrals.filter(r => r.leadStatus === 'Active Subscriber').length
    const churned = referrals.filter(r => r.leadStatus === 'Churned').length
    const totalReferrals = referrals.length
    const paidSignups = activeSubscribers + churned

    const funnelData = [
      { stage: 'Traffic', count: totalClicks, percentage: 100 },
      { stage: 'Leads Created', count: totalReferrals, percentage: totalClicks > 0 ? Math.round((totalReferrals / totalClicks) * 100) : 0 },
      { stage: 'Booked Calls', count: callBooked + activeSubscribers + churned, percentage: totalClicks > 0 ? Math.round(((callBooked + activeSubscribers + churned) / totalClicks) * 100) : 0 },
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
      callBooked,
      activeSubscribers,
      churned,
      total: totalReferrals,
    }

    // UTM campaign performance
    const campaignPerformance = new Map<string, { total: number; conversions: number }>()
    for (const ref of referrals) {
      const campaign = ref.utmCampaign || 'unknown'
      const current = campaignPerformance.get(campaign) || { total: 0, conversions: 0 }
      current.total++
      if (ref.leadStatus === 'Active Subscriber' || ref.leadStatus === 'Churned') {
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

    return NextResponse.json({
      trafficData,
      funnelData,
      financialSummary,
      referralBreakdown,
      utmPerformance,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
