import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { baseUrl, affid, affiliateName, utmContent } = body

    if (!baseUrl || !affid) {
      return NextResponse.json({ error: 'baseUrl and affid are required' }, { status: 400 })
    }

    const slug = affiliateName
      ? affiliateName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : 'affiliate'

    const params = new URLSearchParams()
    params.set('affid', affid)
    params.set('utm_source', 'affiliate')
    params.set('utm_medium', 'cpc')
    params.set('utm_campaign', slug)

    if (utmContent) {
      params.set('utm_content', utmContent)
    }

    const url = new URL(baseUrl)
    const separator = url.search ? '&' : '?'
    const trackingLink = `${url.origin}${url.pathname}${separator}${params.toString()}`

    return NextResponse.json({
      trackingLink,
      affid,
      utm_source: 'affiliate',
      utm_medium: 'cpc',
      utm_campaign: slug,
      utm_content: utmContent || null,
    })
  } catch (error) {
    console.error('Error generating link:', error)
    return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })
  }
}
