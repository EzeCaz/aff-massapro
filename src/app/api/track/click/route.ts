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

async function recordClick(params: {
  affid: string
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  page_url?: string | null
  ip_address?: string | null
  user_agent?: string | null
}) {
  const { affid, utm_source, utm_medium, utm_campaign, utm_content, page_url, ip_address, user_agent } = params

  if (!affid) {
    return { error: 'affid is required', status: 400 }
  }

  const affiliate = await db.affiliate.findUnique({ where: { affid } })
  if (!affiliate) {
    return { error: 'Affiliate not found', status: 404 }
  }
  if (!affiliate.isActive) {
    return { error: 'Affiliate is not active', status: 404 }
  }

  const click = await db.click.create({
    data: {
      affiliateId: affiliate.id,
      affid,
      utmSource: utm_source || null,
      utmMedium: utm_medium || null,
      utmCampaign: utm_campaign || null,
      utmContent: utm_content || null,
      landingPage: page_url || null,
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
      page_url: body.page_url,
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

    const result = await recordClick({
      affid: affid || undefined,
      utm_source: searchParams.get('utm_source'),
      utm_medium: searchParams.get('utm_medium'),
      utm_campaign: searchParams.get('utm_campaign'),
      utm_content: searchParams.get('utm_content'),
      page_url: searchParams.get('page_url'),
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
