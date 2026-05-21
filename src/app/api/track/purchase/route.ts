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

// POST /api/track/purchase - Track cart and purchase events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      affid,
      session_id,
      event_type,
      order_id,
      revenue,
      currency,
      plan_type,
      quantity,
      cart_value,
      customer_email,
      customer_name,
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
      page_url,
      funnel_steps,
    } = body

    if (!event_type) {
      return NextResponse.json(
        { error: 'event_type is required (add_to_cart, purchase, funnel_step)' },
        { status: 400, headers: corsHeaders }
      )
    }

    const validEventTypes = ['add_to_cart', 'purchase', 'funnel_step']
    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json(
        { error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` },
        { status: 400, headers: corsHeaders }
      )
    }

    // Look up affiliate if affid is provided
    let affiliateId: string | null = null
    if (affid) {
      const affiliate = await db.affiliate.findUnique({ where: { affid } })
      if (affiliate) {
        affiliateId = affiliate.id
      }
    }

    // Store the purchase/cart event
    const purchaseEvent = await db.purchaseEvent.create({
      data: {
        affiliateId: affiliateId,
        affid: affid || null,
        eventType: event_type,
        orderId: order_id || null,
        revenue: revenue ? parseFloat(String(revenue)) : 0,
        currency: currency || 'USD',
        planType: plan_type || null,
        quantity: quantity || 1,
        cartValue: cart_value ? parseFloat(String(cart_value)) : 0,
        customerEmail: customer_email || null,
        customerName: customer_name || null,
        sessionId: session_id || null,
        ftUtmSource: ft_utm_source || null,
        ftUtmMedium: ft_utm_medium || null,
        ftUtmCampaign: ft_utm_campaign || null,
        ftUtmContent: ft_utm_content || null,
        ftUtmTerm: ft_utm_term || null,
        ltUtmSource: lt_utm_source || null,
        ltUtmMedium: lt_utm_medium || null,
        ltUtmCampaign: lt_utm_campaign || null,
        ltUtmContent: lt_utm_content || null,
        ltUtmTerm: lt_utm_term || null,
        pageUrl: page_url || null,
        funnelSteps: funnel_steps ? JSON.stringify(funnel_steps) : null,
      },
    })

    // If this is a purchase event AND we have an affiliate, handle commission logic
    if (event_type === 'purchase' && affiliateId && affid) {
      const affiliate = await db.affiliate.findUnique({ where: { id: affiliateId } })
      if (affiliate && affiliate.isActive) {
        const planType = plan_type || 'Basic'
        const signupComm = getSignupComm(affiliate)
        const monthlyComm = getMonthlyComm(affiliate, planType)

        // Check if a referral already exists for this customer + affiliate
        let referral = null
        if (customer_email) {
          referral = await db.referral.findFirst({
            where: {
              leadEmail: customer_email,
              affiliateId: affiliate.id,
            },
            orderBy: { createdAt: 'desc' },
          })
        }

        if (referral) {
          // Update existing referral to "Paying Customer"
          if (referral.leadStatus !== 'Paying Customer') {
            await db.referral.update({
              where: { id: referral.id },
              data: {
                leadStatus: 'Paying Customer',
                planType,
                signupCommission: signupComm,
                monthlyCommission: monthlyComm,
                totalCommission: signupComm,
              },
            })

            // Create signup commission ledger entry
            await db.commissionLedger.create({
              data: {
                affiliateId: affiliate.id,
                affid,
                referralId: referral.id,
                type: 'signup',
                amount: signupComm,
                description: `Signup commission for ${referral.leadName} (${planType}) — purchase event`,
              },
            })

            // Update affiliate stats
            await db.affiliate.update({
              where: { id: affiliate.id },
              data: {
                totalConversions: { increment: 1 },
                totalEarnings: { increment: signupComm },
                approvedBalance: { increment: signupComm },
              },
            })
          }
        } else {
          // Create a new referral for this purchase
          const newReferral = await db.referral.create({
            data: {
              affiliateId: affiliate.id,
              affid,
              leadName: customer_name || 'Purchase Customer',
              leadEmail: customer_email || null,
              planType,
              leadStatus: 'Paying Customer',
              signupCommission: signupComm,
              monthlyCommission: monthlyComm,
              totalCommission: signupComm,
              ftUtmSource: ft_utm_source || null,
              ftUtmMedium: ft_utm_medium || null,
              ftUtmCampaign: ft_utm_campaign || null,
              ftUtmContent: ft_utm_content || null,
              ftUtmTerm: ft_utm_term || null,
              ltUtmSource: lt_utm_source || null,
              ltUtmMedium: lt_utm_medium || null,
              ltUtmCampaign: lt_utm_campaign || null,
              ltUtmContent: lt_utm_content || null,
              ltUtmTerm: lt_utm_term || null,
            },
          })

          // Create signup commission ledger entry
          await db.commissionLedger.create({
            data: {
              affiliateId: affiliate.id,
              affid,
              referralId: newReferral.id,
              type: 'signup',
              amount: signupComm,
              description: `Signup commission for ${customer_name || 'Purchase Customer'} (${planType}) — purchase event`,
            },
          })

          // Update affiliate stats
          await db.affiliate.update({
            where: { id: affiliate.id },
            data: {
              totalConversions: { increment: 1 },
              totalEarnings: { increment: signupComm },
              approvedBalance: { increment: signupComm },
            },
          })
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        event: {
          id: purchaseEvent.id,
          eventType: purchaseEvent.eventType,
          affid: purchaseEvent.affid,
          revenue: purchaseEvent.revenue,
          planType: purchaseEvent.planType,
          createdAt: purchaseEvent.createdAt,
        },
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error tracking purchase event:', error)
    return NextResponse.json(
      { error: 'Failed to track purchase event' },
      { status: 500, headers: corsHeaders }
    )
  }
}
