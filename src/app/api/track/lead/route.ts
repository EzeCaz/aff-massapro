import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

const COMMISSION_MAP: Record<string, number> = {
  Enterprise: 100,
  Professional: 50,
  Basic: 10,
}

function getSignupComm(affiliate: { commissionType: string; customSignupComm: number | null }): number {
  if (affiliate.commissionType === 'premium') return 150
  if (affiliate.commissionType === 'custom' && affiliate.customSignupComm) return affiliate.customSignupComm
  return 100
}

function getMonthlyComm(affiliate: { commissionType: string; customEnterprise: number | null; customProfess: number | null; customBasic: number | null }, planType: string): number {
  if (affiliate.commissionType === 'custom') {
    if (planType === 'Enterprise' && affiliate.customEnterprise) return affiliate.customEnterprise
    if (planType === 'Professional' && affiliate.customProfess) return affiliate.customProfess
    if (planType === 'Basic' && affiliate.customBasic) return affiliate.customBasic
  }
  return COMMISSION_MAP[planType] || 10
}

// POST /api/track/lead - Lead capture webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      affid,
      lead_name,
      lead_email,
      lead_phone,
      lead_company,
      plan_type,
      // First-touch UTMs
      ft_utm_source,
      ft_utm_medium,
      ft_utm_campaign,
      ft_utm_content,
      ft_utm_term,
      // Last-touch UTMs
      lt_utm_source,
      lt_utm_medium,
      lt_utm_campaign,
      lt_utm_content,
      lt_utm_term,
      // Legacy UTM support (maps to last-touch)
      utm_campaign,
      utm_content,
      initial_status,
    } = body

    // Validate required fields
    if (!lead_name) {
      return NextResponse.json(
        { error: 'lead_name is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Default to no_affiliate if no affid provided
    const effectiveAffid = affid || 'no_affiliate'
    const isDirectTraffic = effectiveAffid === 'no_affiliate'

    // Look up affiliate — if not found, fall back to no_affiliate
    let affiliate = await db.affiliate.findUnique({ where: { affid: effectiveAffid } })
    if (!affiliate) {
      affiliate = await db.affiliate.findUnique({ where: { affid: 'no_affiliate' } })
    }
    if (!affiliate) {
      // Create the no_affiliate account if it doesn't exist
      affiliate = await db.affiliate.create({
        data: {
          affid: 'no_affiliate',
          name: 'No Affiliate (Direct Traffic)',
          email: 'no-affiliate@massapro.system',
          isActive: true,
          isApproved: true,
          commissionType: 'standard',
        },
      })
    }

    // Determine lead status (default to "Lead")
    const leadStatus = initial_status || 'Lead'

    // Validate lead status (new statuses + legacy support)
    const newStatuses = ['Lead', 'Attendee', 'Test', 'Lost', 'Won']
    const legacyStatuses = ['Booked Call', 'Paying Customer', 'Churned']
    const validStatuses = [...newStatuses, ...legacyStatuses]
    if (!validStatuses.includes(leadStatus)) {
      return NextResponse.json(
        { error: `Invalid initial_status. Must be one of: ${newStatuses.join(', ')}` },
        { status: 400, headers: corsHeaders }
      )
    }

    // Determine plan type (default to "Basic")
    const planType = plan_type || 'Basic'
    const validPlans = ['Enterprise', 'Professional', 'Basic']
    if (!validPlans.includes(planType)) {
      return NextResponse.json(
        { error: `Invalid plan_type. Must be one of: ${validPlans.join(', ')}` },
        { status: 400, headers: corsHeaders }
      )
    }

    // Calculate commissions — NO commissions for direct (no_affiliate) traffic
    const monthlyCommission = isDirectTraffic ? 0 : getMonthlyComm(affiliate, planType)
    const isPayingCustomer = leadStatus === 'Paying Customer' || leadStatus === 'Won'
    const signupCommission = (!isDirectTraffic && isPayingCustomer) ? getSignupComm(affiliate) : 0

    // Auto-create funnel events for this lead:
    // A lead submission implies: 1) a CTA click, 2) a form open, and 3) the form submission.
    // We create these Click records if they weren't already tracked by the client-side tracker.
    const now = new Date()
    const sessionId = body.session_id || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const pageUrl = body.page_url || null

    // Determine a CTA event ID based on plan type for better attribution
    const ctaEventId = planType === 'Enterprise' ? 'btn_pricing_tier' : 'btn_cta_signup'

    // 1. Create CTA click event (user must have clicked a CTA to reach the form)
    await db.click.create({
      data: {
        affiliateId: affiliate.id,
        affid: effectiveAffid,
        utmSource: lt_utm_source || null,
        utmMedium: lt_utm_medium || null,
        utmCampaign: lt_utm_campaign || utm_campaign || null,
        utmContent: lt_utm_content || utm_content || null,
        utmTerm: lt_utm_term || null,
        pageUrl,
        eventType: 'button_click',
        eventId: ctaEventId,
        sessionId,
        createdAt: new Date(now.getTime() - 5000), // 5s before form open
      },
    })

    // 2. Create form open event (user must have opened the form to submit it)
    await db.click.create({
      data: {
        affiliateId: affiliate.id,
        affid: effectiveAffid,
        utmSource: lt_utm_source || null,
        utmMedium: lt_utm_medium || null,
        utmCampaign: lt_utm_campaign || utm_campaign || null,
        utmContent: lt_utm_content || utm_content || null,
        utmTerm: lt_utm_term || null,
        pageUrl,
        eventType: 'button_click',
        eventId: 'lead_form_open',
        sessionId,
        createdAt: new Date(now.getTime() - 2000), // 2s before submission
      },
    })

    // Create referral record
    const referral = await db.referral.create({
      data: {
        affiliateId: affiliate.id,
        affid: effectiveAffid,
        leadName: lead_name,
        leadEmail: lead_email || null,
        leadPhone: lead_phone || null,
        leadCompany: lead_company || null,
        planType,
        leadStatus,
        signupCommission,
        monthlyCommission,
        monthsActive: 0,
        totalCommission: signupCommission,
        ftUtmSource: ft_utm_source || null,
        ftUtmMedium: ft_utm_medium || null,
        ftUtmCampaign: ft_utm_campaign || null,
        ftUtmContent: ft_utm_content || null,
        ftUtmTerm: ft_utm_term || null,
        ltUtmSource: lt_utm_source || null,
        ltUtmMedium: lt_utm_medium || null,
        ltUtmCampaign: lt_utm_campaign || utm_campaign || null,
        ltUtmContent: lt_utm_content || utm_content || null,
        ltUtmTerm: lt_utm_term || null,
      },
    })

    // Create commission ledger entry if signup commission applies
    if (signupCommission > 0) {
      await db.commissionLedger.create({
        data: {
          affiliateId: affiliate.id,
          affid,
          referralId: referral.id,
          type: 'signup',
          amount: signupCommission,
          description: `Signup commission for ${lead_name} (${planType})`,
        },
      })
    }

    // Update affiliate stats
    const affiliateUpdate: Record<string, unknown> = {}
    if (signupCommission > 0) {
      affiliateUpdate.totalConversions = { increment: 1 }
      affiliateUpdate.totalEarnings = { increment: signupCommission }
      affiliateUpdate.approvedBalance = { increment: signupCommission }
    }
    if (Object.keys(affiliateUpdate).length > 0) {
      await db.affiliate.update({
        where: { id: affiliate.id },
        data: affiliateUpdate,
      })
    }

    return NextResponse.json(
      {
        success: true,
        referral: {
          id: referral.id,
          affid: referral.affid,
          leadName: referral.leadName,
          leadEmail: referral.leadEmail,
          leadPhone: referral.leadPhone,
          leadCompany: referral.leadCompany,
          planType: referral.planType,
          leadStatus: referral.leadStatus,
          signupCommission: referral.signupCommission,
          monthlyCommission: referral.monthlyCommission,
          totalCommission: referral.totalCommission,
          createdAt: referral.createdAt,
        },
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500, headers: corsHeaders }
    )
  }
}
