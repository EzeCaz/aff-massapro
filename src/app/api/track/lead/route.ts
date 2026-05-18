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
    if (!affid) {
      return NextResponse.json(
        { error: 'affid is required' },
        { status: 400, headers: corsHeaders }
      )
    }
    if (!lead_name) {
      return NextResponse.json(
        { error: 'lead_name is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate affiliate exists and is active
    const affiliate = await db.affiliate.findUnique({ where: { affid } })
    if (!affiliate) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404, headers: corsHeaders }
      )
    }
    if (!affiliate.isActive) {
      return NextResponse.json(
        { error: 'Affiliate is not active' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Determine lead status (default to "Lead")
    const leadStatus = initial_status || 'Lead'

    // Validate lead status
    const validStatuses = ['Lead', 'Booked Call', 'Paying Customer', 'Churned']
    if (!validStatuses.includes(leadStatus)) {
      return NextResponse.json(
        { error: `Invalid initial_status. Must be one of: ${validStatuses.join(', ')}` },
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

    // Calculate commissions based on affiliate's commission structure
    const monthlyCommission = getMonthlyComm(affiliate, planType)
    const isPayingCustomer = leadStatus === 'Paying Customer'
    const signupCommission = isPayingCustomer ? getSignupComm(affiliate) : 0

    // Create referral record
    const referral = await db.referral.create({
      data: {
        affiliateId: affiliate.id,
        affid,
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
        ltUtmSource: lt_utm_source || utm_campaign ? null : null,  // use lt_ if provided, else legacy
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
