import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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

const VALID_STATUSES = ['Lead', 'Call Booked', 'Active Subscriber', 'Churned']
const VALID_PLANS = ['Enterprise', 'Professional', 'Basic']

// PUT /api/track/status - Lead status update webhook
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      referral_id,
      lead_email,
      affid,
      new_status,
      plan_type,
      months_active,
    } = body

    // Validate new_status is provided
    if (!new_status) {
      return NextResponse.json(
        { error: 'new_status is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!VALID_STATUSES.includes(new_status)) {
      return NextResponse.json(
        { error: `Invalid new_status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate plan_type if provided
    if (plan_type && !VALID_PLANS.includes(plan_type)) {
      return NextResponse.json(
        { error: `Invalid plan_type. Must be one of: ${VALID_PLANS.join(', ')}` },
        { status: 400, headers: corsHeaders }
      )
    }

    // Find the referral by ID or by email+affid
    let referral

    if (referral_id) {
      referral = await db.referral.findUnique({ where: { id: referral_id } })
      if (!referral) {
        return NextResponse.json(
          { error: 'Referral not found with the provided referral_id' },
          { status: 404, headers: corsHeaders }
        )
      }
    } else if (lead_email && affid) {
      // Find by email + affid combination
      const affiliate = await db.affiliate.findUnique({ where: { affid } })
      if (!affiliate) {
        return NextResponse.json(
          { error: 'Affiliate not found' },
          { status: 404, headers: corsHeaders }
        )
      }
      referral = await db.referral.findFirst({
        where: {
          leadEmail: lead_email,
          affiliateId: affiliate.id,
        },
        orderBy: { createdAt: 'desc' },
      })
      if (!referral) {
        return NextResponse.json(
          { error: 'No referral found with the provided email and affid combination' },
          { status: 404, headers: corsHeaders }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Either referral_id or both lead_email and affid are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const previousStatus = referral.leadStatus
    const updateData: Record<string, unknown> = {
      leadStatus: new_status,
    }

    // Calculate commission changes
    let signupCommissionDelta = 0
    let conversionDelta = 0

    // If transitioning to "Active Subscriber" from a non-active status
    if (new_status === 'Active Subscriber' && previousStatus !== 'Active Subscriber') {
      signupCommissionDelta = 100
      conversionDelta = 1
      updateData.signupCommission = 100
    }

    // If transitioning from "Active Subscriber" to something else (shouldn't normally happen, but handle gracefully)
    // We don't reverse the signup commission once earned

    // Update plan_type if provided
    if (plan_type) {
      updateData.planType = plan_type
      updateData.monthlyCommission = COMMISSION_MAP[plan_type] || 10
    }

    // Update months_active if provided
    if (months_active !== undefined) {
      updateData.monthsActive = months_active
    }

    // Recalculate total commission
    const finalSignupCommission = updateData.signupCommission as number ?? referral.signupCommission
    const finalMonthlyCommission = updateData.monthlyCommission as number ?? referral.monthlyCommission
    const finalMonthsActive = updateData.monthsActive as number ?? referral.monthsActive
    updateData.totalCommission = finalSignupCommission + (finalMonthlyCommission * finalMonthsActive)

    // Update the referral
    const updatedReferral = await db.referral.update({
      where: { id: referral.id },
      data: updateData,
    })

    // Update affiliate stats if there are commission changes
    if (signupCommissionDelta !== 0 || conversionDelta !== 0) {
      const affiliateUpdateData: Record<string, unknown> = {}
      if (signupCommissionDelta !== 0) {
        affiliateUpdateData.totalEarnings = { increment: signupCommissionDelta }
        affiliateUpdateData.approvedBalance = { increment: signupCommissionDelta }
      }
      if (conversionDelta !== 0) {
        affiliateUpdateData.totalConversions = { increment: conversionDelta }
      }
      await db.affiliate.update({
        where: { id: referral.affiliateId },
        data: affiliateUpdateData,
      })
    }

    return NextResponse.json(
      {
        success: true,
        referral: {
          id: updatedReferral.id,
          affid: updatedReferral.affid,
          leadName: updatedReferral.leadName,
          leadEmail: updatedReferral.leadEmail,
          planType: updatedReferral.planType,
          leadStatus: updatedReferral.leadStatus,
          previousStatus,
          signupCommission: updatedReferral.signupCommission,
          monthlyCommission: updatedReferral.monthlyCommission,
          monthsActive: updatedReferral.monthsActive,
          totalCommission: updatedReferral.totalCommission,
          updatedAt: updatedReferral.updatedAt,
        },
      },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error updating lead status:', error)
    return NextResponse.json(
      { error: 'Failed to update lead status' },
      { status: 500, headers: corsHeaders }
    )
  }
}
