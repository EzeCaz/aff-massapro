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

async function recordEvent(params: {
  eventName: string
  affid?: string | null
  utmCampaign?: string | null
  pageUrl?: string | null
  sessionId?: string | null
  eventType?: string | null
  eventLabel?: string | null
}) {
  const { eventName, affid, utmCampaign, pageUrl, sessionId, eventType, eventLabel } = params

  if (!eventName) {
    return { error: 'eventName is required', status: 400 }
  }

  // If affid provided, validate the affiliate exists and is active
  let affiliateId: string | null = null
  if (affid) {
    const affiliate = await db.affiliate.findUnique({ where: { affid } })
    if (affiliate) {
      if (!affiliate.isActive) {
        return { error: 'Affiliate is not active', status: 404 }
      }
      affiliateId = affiliate.id
    }
    // If affiliate not found, still record the event but without affiliate link
  }

  const event = await db.affiliateEvent.create({
    data: {
      eventName,
      affid: affid || null,
      utmCampaign: utmCampaign || null,
      pageUrl: pageUrl || null,
    },
  })

  return { success: true, eventId: event.id, status: 200 }
}

// GET /api/track/event - Pixel-based event tracking (returns 1x1 transparent GIF)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const eventName = searchParams.get('event') || searchParams.get('eventName')
    const affid = searchParams.get('affid')
    const utmCampaign = searchParams.get('utm_campaign')
    const pageUrl = searchParams.get('page_url')

    await recordEvent({
      eventName: eventName || undefined,
      affid,
      utmCampaign,
      pageUrl,
      eventType: searchParams.get('event_type'),
      eventLabel: searchParams.get('event_label'),
    })

    // Always return the pixel, even on error, to avoid breaking the page
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
    console.error('Error tracking event pixel:', error)
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

// POST /api/track/event - JSON-based event tracking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await recordEvent({
      eventName: body.eventName || body.event_name,
      affid: body.affid,
      utmCampaign: body.utm_campaign || body.utmCampaign,
      pageUrl: body.page_url || body.pageUrl,
      sessionId: body.session_id || body.sessionId,
      eventType: body.event_type || body.eventType,
      eventLabel: body.event_label || body.eventLabel,
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { success: true, eventId: result.eventId },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error tracking event:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500, headers: corsHeaders }
    )
  }
}
