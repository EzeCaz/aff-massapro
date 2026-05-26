import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Temporary migration endpoint - backfill missing CTA/form open events for existing leads
// DELETE after running once
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { secret } = body

    // Simple auth check
    if (secret !== 'backfill_funnel_events_2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all referrals that don't have corresponding CTA click events
    const referrals = await db.referral.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
      include: { affiliate: true },
    })

    let backfilled = 0

    for (const ref of referrals) {
      // Check if this referral already has CTA click events from the same time period
      const existingCtaClicks = await db.click.count({
        where: {
          affid: ref.affid,
          eventType: 'button_click',
          eventId: { in: ['btn_hero_demo', 'btn_cta_signup', 'btn_nav_contact', 'btn_pricing_tier'] },
          createdAt: {
            gte: new Date(ref.createdAt.getTime() - 60000), // within 1 min before referral
            lte: new Date(ref.createdAt.getTime() + 60000), // within 1 min after referral
          },
        },
      })

      if (existingCtaClicks > 0) {
        continue // Already has CTA events, skip
      }

      // Backfill: Create CTA click + form open events for this referral
      const sessionId = `sess_backfill_${ref.id}`
      const ctaEventId = ref.planType === 'Enterprise' ? 'btn_pricing_tier' : 'btn_cta_signup'

      // 1. CTA click (5 seconds before form open)
      await db.click.create({
        data: {
          affiliateId: ref.affiliateId,
          affid: ref.affid,
          utmSource: ref.ltUtmSource || ref.ftUtmSource || null,
          utmMedium: ref.ltUtmMedium || ref.ftUtmMedium || null,
          utmCampaign: ref.ltUtmCampaign || ref.ftUtmCampaign || null,
          utmContent: ref.ltUtmContent || ref.ftUtmContent || null,
          utmTerm: ref.ltUtmTerm || ref.ftUtmTerm || null,
          pageUrl: null,
          eventType: 'button_click',
          eventId: ctaEventId,
          sessionId,
          createdAt: new Date(ref.createdAt.getTime() - 5000),
        },
      })

      // 2. Form open event (2 seconds before submission)
      await db.click.create({
        data: {
          affiliateId: ref.affiliateId,
          affid: ref.affid,
          utmSource: ref.ltUtmSource || ref.ftUtmSource || null,
          utmMedium: ref.ltUtmMedium || ref.ftUtmMedium || null,
          utmCampaign: ref.ltUtmCampaign || ref.ftUtmCampaign || null,
          utmContent: ref.ltUtmContent || ref.ftUtmContent || null,
          utmTerm: ref.ltUtmTerm || ref.ftUtmTerm || null,
          pageUrl: null,
          eventType: 'button_click',
          eventId: 'lead_form_open',
          sessionId,
          createdAt: new Date(ref.createdAt.getTime() - 2000),
        },
      })

      backfilled++
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled funnel events for ${backfilled} referrals`,
      totalReferrals: referrals.length,
      backfilled,
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
