import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, reviewNotes } = body

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status must be "approved" or "rejected"' }, { status: 400 })
    }

    const application = await db.affiliateApplication.findUnique({ where: { id } })
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ error: 'Application has already been reviewed' }, { status: 400 })
    }

    let generatedAffid: string | null = null
    let affiliateId: string | null = null

    if (status === 'approved') {
      // Generate affid: MP-NAME-###
      const namePart = application.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '')
      // Find the next available number
      const existingAffids = await db.affiliate.findMany({
        where: { affid: { startsWith: `MP-${namePart}-` } },
        select: { affid: true },
      })
      const existingNums = existingAffids.map(a => {
        const parts = a.affid.split('-')
        return parseInt(parts[parts.length - 1], 10) || 0
      })
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1
      generatedAffid = `MP-${namePart}-${String(nextNum).padStart(3, '0')}`

      // Create affiliate record with bcrypt-hashed default password
      const defaultPassword = 'changeme'
      const hashedPassword = await bcrypt.hash(defaultPassword, 12)

      const affiliate = await db.affiliate.create({
        data: {
          affid: generatedAffid,
          name: application.name,
          email: application.email,
          phone: application.phone,
          company: application.company,
          password: hashedPassword,
          isActive: true,
          isApproved: true,
          commissionType: 'standard',
        },
      })
      affiliateId = affiliate.id
    }

    // Update the application
    const updatedApp = await db.affiliateApplication.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: 'admin',
        reviewNotes: reviewNotes || null,
        generatedAffid,
        affiliateId,
      },
    })

    return NextResponse.json({
      application: updatedApp,
      generatedAffid,
      affiliateId,
    })
  } catch (error) {
    console.error('Error reviewing application:', error)
    return NextResponse.json({ error: 'Failed to review application' }, { status: 500 })
  }
}
