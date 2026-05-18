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

// POST /api/track/lead - Lead capture webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      affid,
      lead_name,
      lead_email,
      plan_type,
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
    const validStatuses = ['Lead', 'Call Booked', 'Active Subscriber', 'Churned']
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

    // Calculate commissions
    const monthlyCommission = COMMISSION_MAP[planType] || 10
    const signupCommission = leadStatus === 'Active Subscriber' ? 100 : 0

    // Create referral record
    const referral = await db.referral.create({
      data: {
        affiliateId: affiliate.id,
        affid,
        leadName: lead_name,
        leadEmail: lead_email || null,
        planType,
        leadStatus,
        signupCommission,
        monthlyCommission,
        monthsActive: 0,
        totalCommission: signupCommission,
        utmCampaign: utm_campaign || null,
        utmContent: utm_content || null,
      },
    })

    // Update affiliate stats
    await db.affiliate.update({
      where: { id: affiliate.id },
      data: {
        totalConversions: { increment: 1 },
        totalEarnings: { increment: signupCommission },
        approvedBalance: { increment: signupCommission },
      },
    })

    return NextResponse.json(
      {
        success: true,
        referral: {
          id: referral.id,
          affid: referral.affid,
          leadName: referral.leadName,
          leadEmail: referral.leadEmail,
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
