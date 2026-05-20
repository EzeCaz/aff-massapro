import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// CORS headers for cross-origin requests from receptionist.massapro.com
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// 1x1 transparent GIF pixel (base64 decoded)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

const NO_AFFILIATE_ID = 'no_affiliate'

async function recordClick(params: {
  affid: string
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  page_url?: string | null
  event_type?: string | null
  event_id?: string | null
  session_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
}) {
  let { affid, utm_source, utm_medium, utm_campaign, utm_content, utm_term, page_url, event_type, event_id, session_id, ip_address, user_agent } = params

  // If no affid provided, default to no_affiliate
  if (!affid) {
    affid = NO_AFFILIATE_ID
  }

  // Look up the affiliate
  let affiliate = await db.affiliate.findUnique({ where: { affid } })

  // If affiliate not found but we have an affid, create a "no_affiliate" fallback
  // This handles cases where a new affiliate's link is used before they're in the system
  if (!affiliate) {
    // Try to use the no_affiliate account for unattributed traffic
    affiliate = await db.affiliate.findUnique({ where: { affid: NO_AFFILIATE_ID } })
    if (!affiliate) {
      // Create the no_affiliate account if it doesn't exist
      affiliate = await db.affiliate.create({
        data: {
          affid: NO_AFFILIATE_ID,
          name: 'No Affiliate (Direct Traffic)',
          email: 'no-affiliate@massapro.system',
          isActive: true,
          isApproved: true,
          commissionType: 'standard',
        },
      })
    }
  }

  const eventType = event_type || (event_id ? 'button_click' : 'pageview')

  const click = await db.click.create({
    data: {
      affiliateId: affiliate.id,
      affid,
      utmSource: utm_source || null,
      utmMedium: utm_medium || null,
      utmCampaign: utm_campaign || null,
      utmContent: utm_content || null,
      utmTerm: utm_term || null,
      pageUrl: page_url || null,
      eventType,
      eventId: event_id || null,
      sessionId: session_id || null,
      ipAddress: ip_address || null,
      userAgent: user_agent || null,
    },
  })

  await db.affiliate.update({
    where: { id: affiliate.id },
    data: { totalTraffic: { increment: 1 } },
  })

  return { success: true, clickId: click.id, status: 200 }
}

// POST /api/track/click - JSON-based click tracking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await recordClick({
      affid: body.affid,
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      utm_term: body.utm_term,
      page_url: body.page_url,
      event_type: body.event_type,
      event_id: body.event_id,
      session_id: body.session_id,
      ip_address: body.ip_address || request.headers.get('x-forwarded-for') || null,
      user_agent: body.user_agent || request.headers.get('user-agent') || null,
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { success: true, clickId: result.clickId },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error tracking click:', error)
    return NextResponse.json(
      { error: 'Failed to track click' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// GET /api/track/click - Pixel-based click tracking (returns 1x1 transparent GIF)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const affid = searchParams.get('affid')

    await recordClick({
      affid: affid || undefined,
      utm_source: searchParams.get('utm_source'),
      utm_medium: searchParams.get('utm_medium'),
      utm_campaign: searchParams.get('utm_campaign'),
      utm_content: searchParams.get('utm_content'),
      utm_term: searchParams.get('utm_term'),
      page_url: searchParams.get('page_url'),
      event_type: searchParams.get('event_type'),
      event_id: searchParams.get('event_id'),
      session_id: searchParams.get('session_id'),
      ip_address: request.headers.get('x-forwarded-for') || null,
      user_agent: request.headers.get('user-agent') || null,
    })

    // Always return the pixel, even on error, to avoid breaking the landing page
    return new Response(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...corsHeaders,
      },
    })
  } catch (error) {
    console.error('Error tracking click pixel:', error)
    // Still return the pixel on error
    return new Response(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  }
}
