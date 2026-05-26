import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const LEAD_STATUSES = ['Lead', 'Attendee', 'No Show', 'Test', 'Lost', 'Won']
// Legacy statuses still accepted for backwards compatibility
const LEGACY_STATUSES = ['Booked Call', 'Paying Customer', 'Churned']
const ALL_STATUSES = [...LEAD_STATUSES, ...LEGACY_STATUSES]

const VALID_PLANS = ['Enterprise', 'Professional', 'Basic']

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

// PATCH /api/referrals/[id] - Update lead status (admin dashboard)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { leadStatus, planType } = body

    if (!leadStatus && !planType) {
      return NextResponse.json(
        { error: 'At least one of leadStatus or planType is required' },
        { status: 400 }
      )
    }

    // Validate lead status
    if (leadStatus && !ALL_STATUSES.includes(leadStatus)) {
      return NextResponse.json(
        { error: `Invalid leadStatus. Must be one of: ${LEAD_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate plan type
    if (planType && !VALID_PLANS.includes(planType)) {
      return NextResponse.json(
        { error: `Invalid planType. Must be one of: ${VALID_PLANS.join(', ')}` },
        { status: 400 }
      )
    }

    // Find the referral
    const referral = await db.referral.findUnique({ where: { id } })
    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    // Get affiliate for commission calculations
    const affiliate = await db.affiliate.findUnique({ where: { id: referral.affiliateId } })
    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    const previousStatus = referral.leadStatus
    const newStatus = leadStatus || referral.leadStatus
    const newPlan = planType || referral.planType

    const updateData: Record<string, unknown> = {}

    // Status is changing
    if (leadStatus) {
      updateData.leadStatus = leadStatus
    }

    // Plan is changing
    if (planType) {
      updateData.planType = planType
      updateData.monthlyCommission = getMonthlyComm(affiliate, planType)
    }

    // Calculate commission changes
    let signupCommissionDelta = 0
    let conversionDelta = 0

    // "Won" triggers signup commission (same as old "Paying Customer")
    // Also handle legacy "Paying Customer" → triggers signup commission too
    const isWonStatus = (status: string) => status === 'Won' || status === 'Paying Customer'
    const isPreviousWon = isWonStatus(previousStatus)

    if (leadStatus && isWonStatus(newStatus) && !isPreviousWon) {
      const signupComm = getSignupComm(affiliate)
      signupCommissionDelta = signupComm
      conversionDelta = 1
      updateData.signupCommission = signupComm
    }

    // If moving AWAY from Won status, reverse the signup commission
    if (leadStatus && !isWonStatus(newStatus) && isPreviousWon) {
      signupCommissionDelta = -referral.signupCommission
      conversionDelta = -1
      updateData.signupCommission = 0
    }

    // Recalculate total commission
    const finalSignupCommission = (updateData.signupCommission as number) ?? referral.signupCommission
    const finalMonthlyCommission = (updateData.monthlyCommission as number) ?? referral.monthlyCommission
    const finalMonthsActive = referral.monthsActive
    updateData.totalCommission = finalSignupCommission + (finalMonthlyCommission * finalMonthsActive)

    // Update the referral
    const updatedReferral = await db.referral.update({
      where: { id },
      data: updateData,
    })

    // Create commission ledger entry for signup commission
    if (signupCommissionDelta > 0) {
      await db.commissionLedger.create({
        data: {
          affiliateId: affiliate.id,
          affid: referral.affid,
          referralId: referral.id,
          type: 'signup',
          amount: signupCommissionDelta,
          description: `Signup commission for ${referral.leadName} (${newPlan}) — status changed to ${newStatus}`,
        },
      })
    }

    // If reversing commission, create adjustment entry
    if (signupCommissionDelta < 0) {
      await db.commissionLedger.create({
        data: {
          affiliateId: affiliate.id,
          affid: referral.affid,
          referralId: referral.id,
          type: 'adjustment',
          amount: signupCommissionDelta,
          description: `Reversal of signup commission for ${referral.leadName} — status changed from ${previousStatus} to ${newStatus}`,
        },
      })
    }

    // Update affiliate stats
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

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Error updating referral:', error)
    return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 })
  }
}

// GET /api/referrals/[id] - Get a single referral
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const referral = await db.referral.findUnique({
      where: { id },
      include: {
        affiliate: {
          select: { name: true, affid: true, email: true },
        },
      },
    })

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    return NextResponse.json(referral)
  } catch (error) {
    console.error('Error fetching referral:', error)
    return NextResponse.json({ error: 'Failed to fetch referral' }, { status: 500 })
  }
}
