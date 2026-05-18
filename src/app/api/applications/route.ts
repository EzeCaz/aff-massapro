import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const applications = await db.affiliateApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        affiliate: {
          select: { id: true, affid: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(applications)
  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, company, website, message } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Check if email already exists as an affiliate or pending application
    const existingAffiliate = await db.affiliate.findUnique({ where: { email } })
    if (existingAffiliate) {
      return NextResponse.json({ error: 'An affiliate account with this email already exists' }, { status: 400 })
    }

    const existingApp = await db.affiliateApplication.findFirst({
      where: { email, status: 'pending' },
    })
    if (existingApp) {
      return NextResponse.json({ error: 'You already have a pending application' }, { status: 400 })
    }

    const application = await db.affiliateApplication.create({
      data: {
        name,
        email,
        phone: phone || null,
        company: company || null,
        website: website || null,
        message: message || null,
        status: 'pending',
      },
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Error creating application:', error)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
