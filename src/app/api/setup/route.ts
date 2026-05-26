import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    try {
      const result = await prisma.$queryRaw<Array<{count: bigint}>>`
        SELECT count(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'Admin'
      `
      const tableCount = Number(result[0]?.count ?? 0)
      
      if (tableCount > 0) {
        const adminCount = await prisma.admin.count()
        const affCount = await prisma.affiliate.count()
        await prisma.$disconnect()
        return NextResponse.json({
          success: true,
          message: 'Database already initialized.',
          stats: { admins: adminCount, affiliates: affCount },
        })
      }
    } catch (e) {
      // Tables don't exist yet, proceed with creation
    }

    console.log('[Setup] Creating tables...')

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Affiliate" (
        "id" TEXT NOT NULL, "affid" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
        "phone" TEXT, "password" TEXT NOT NULL DEFAULT 'changeme', "company" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT false, "isApproved" BOOLEAN NOT NULL DEFAULT false,
        "commissionType" TEXT NOT NULL DEFAULT 'standard',
        "customSignupComm" DOUBLE PRECISION, "customEnterprise" DOUBLE PRECISION,
        "customProfess" DOUBLE PRECISION, "customBasic" DOUBLE PRECISION, "notes" TEXT,
        "totalTraffic" INTEGER NOT NULL DEFAULT 0, "totalConversions" INTEGER NOT NULL DEFAULT 0,
        "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "approvedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "paidBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Admin" (
        "id" TEXT NOT NULL, "email" TEXT NOT NULL, "password" TEXT NOT NULL, "name" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'admin', "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Click" (
        "id" TEXT NOT NULL, "affiliateId" TEXT NOT NULL, "affid" TEXT NOT NULL,
        "utmSource" TEXT, "utmMedium" TEXT, "utmCampaign" TEXT, "utmContent" TEXT, "utmTerm" TEXT,
        "pageUrl" TEXT, "eventType" TEXT NOT NULL DEFAULT 'pageview', "eventId" TEXT,
        "sessionId" TEXT, "ipAddress" TEXT, "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Click_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AffiliateEvent" (
        "id" TEXT NOT NULL, "eventName" TEXT NOT NULL, "affid" TEXT, "utmCampaign" TEXT,
        "pageUrl" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AffiliateEvent_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Referral" (
        "id" TEXT NOT NULL, "affiliateId" TEXT NOT NULL, "affid" TEXT NOT NULL,
        "leadName" TEXT NOT NULL, "leadEmail" TEXT, "leadPhone" TEXT, "leadCompany" TEXT,
        "planType" TEXT NOT NULL, "leadStatus" TEXT NOT NULL,
        "signupCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "monthlyCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "monthsActive" INTEGER NOT NULL DEFAULT 0,
        "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "ftUtmSource" TEXT, "ftUtmMedium" TEXT, "ftUtmCampaign" TEXT, "ftUtmContent" TEXT, "ftUtmTerm" TEXT,
        "ltUtmSource" TEXT, "ltUtmMedium" TEXT, "ltUtmCampaign" TEXT, "ltUtmContent" TEXT, "ltUtmTerm" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Payout" (
        "id" TEXT NOT NULL, "affiliateId" TEXT NOT NULL, "affid" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending',
        "periodStart" TIMESTAMP(3) NOT NULL, "periodEnd" TIMESTAMP(3) NOT NULL,
        "processedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CommissionLedger" (
        "id" TEXT NOT NULL, "affiliateId" TEXT NOT NULL, "affid" TEXT NOT NULL,
        "referralId" TEXT NOT NULL, "type" TEXT NOT NULL, "amount" DOUBLE PRECISION NOT NULL,
        "description" TEXT, "monthNumber" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CommissionLedger_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AffiliateApplication" (
        "id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "phone" TEXT,
        "company" TEXT, "website" TEXT, "message" TEXT, "status" TEXT NOT NULL DEFAULT 'pending',
        "reviewedAt" TIMESTAMP(3), "reviewedBy" TEXT, "reviewNotes" TEXT, "generatedAffid" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "affiliateId" TEXT,
        CONSTRAINT "AffiliateApplication_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PurchaseEvent" (
        "id" TEXT NOT NULL, "affiliateId" TEXT, "affid" TEXT, "eventType" TEXT NOT NULL,
        "orderId" TEXT, "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "currency" TEXT NOT NULL DEFAULT 'USD', "planType" TEXT,
        "quantity" INTEGER NOT NULL DEFAULT 1, "cartValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "customerEmail" TEXT, "customerName" TEXT, "sessionId" TEXT,
        "ftUtmSource" TEXT, "ftUtmMedium" TEXT, "ftUtmCampaign" TEXT, "ftUtmContent" TEXT, "ftUtmTerm" TEXT,
        "ltUtmSource" TEXT, "ltUtmMedium" TEXT, "ltUtmCampaign" TEXT, "ltUtmContent" TEXT, "ltUtmTerm" TEXT,
        "pageUrl" TEXT, "funnelSteps" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PurchaseEvent_pkey" PRIMARY KEY ("id")
      );
    `)

    // Create indexes
    const indexes = [
      'CREATE UNIQUE INDEX IF NOT EXISTS "Affiliate_affid_key" ON "Affiliate"("affid")',
      'CREATE UNIQUE INDEX IF NOT EXISTS "Affiliate_email_key" ON "Affiliate"("email")',
      'CREATE INDEX IF NOT EXISTS "Affiliate_affid_idx" ON "Affiliate"("affid")',
      'CREATE INDEX IF NOT EXISTS "Affiliate_email_idx" ON "Affiliate"("email")',
      'CREATE INDEX IF NOT EXISTS "Affiliate_isActive_idx" ON "Affiliate"("isActive")',
      'CREATE INDEX IF NOT EXISTS "Affiliate_isApproved_idx" ON "Affiliate"("isApproved")',
      'CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email")',
      'CREATE INDEX IF NOT EXISTS "Admin_email_idx" ON "Admin"("email")',
      'CREATE INDEX IF NOT EXISTS "Admin_role_idx" ON "Admin"("role")',
      'CREATE INDEX IF NOT EXISTS "Click_affiliateId_idx" ON "Click"("affiliateId")',
      'CREATE INDEX IF NOT EXISTS "Click_affid_idx" ON "Click"("affid")',
      'CREATE INDEX IF NOT EXISTS "Click_createdAt_idx" ON "Click"("createdAt")',
      'CREATE INDEX IF NOT EXISTS "Click_eventType_idx" ON "Click"("eventType")',
      'CREATE INDEX IF NOT EXISTS "Click_eventId_idx" ON "Click"("eventId")',
      'CREATE INDEX IF NOT EXISTS "AffiliateEvent_affid_idx" ON "AffiliateEvent"("affid")',
      'CREATE INDEX IF NOT EXISTS "AffiliateEvent_eventName_idx" ON "AffiliateEvent"("eventName")',
      'CREATE INDEX IF NOT EXISTS "AffiliateEvent_createdAt_idx" ON "AffiliateEvent"("createdAt")',
      'CREATE INDEX IF NOT EXISTS "Referral_affiliateId_idx" ON "Referral"("affiliateId")',
      'CREATE INDEX IF NOT EXISTS "Referral_affid_idx" ON "Referral"("affid")',
      'CREATE INDEX IF NOT EXISTS "Referral_leadStatus_idx" ON "Referral"("leadStatus")',
      'CREATE INDEX IF NOT EXISTS "Referral_leadEmail_idx" ON "Referral"("leadEmail")',
      'CREATE INDEX IF NOT EXISTS "Referral_createdAt_idx" ON "Referral"("createdAt")',
      'CREATE INDEX IF NOT EXISTS "Payout_affiliateId_idx" ON "Payout"("affiliateId")',
      'CREATE INDEX IF NOT EXISTS "Payout_status_idx" ON "Payout"("status")',
      'CREATE INDEX IF NOT EXISTS "CommissionLedger_affiliateId_idx" ON "CommissionLedger"("affiliateId")',
      'CREATE INDEX IF NOT EXISTS "CommissionLedger_affid_idx" ON "CommissionLedger"("affid")',
      'CREATE INDEX IF NOT EXISTS "PurchaseEvent_affiliateId_idx" ON "PurchaseEvent"("affiliateId")',
      'CREATE INDEX IF NOT EXISTS "PurchaseEvent_affid_idx" ON "PurchaseEvent"("affid")',
      'CREATE INDEX IF NOT EXISTS "PurchaseEvent_eventType_idx" ON "PurchaseEvent"("eventType")',
      'CREATE INDEX IF NOT EXISTS "PurchaseEvent_planType_idx" ON "PurchaseEvent"("planType")',
      'CREATE INDEX IF NOT EXISTS "PurchaseEvent_createdAt_idx" ON "PurchaseEvent"("createdAt")',
    ]

    const fkeys = [
      'ALTER TABLE "Click" ADD CONSTRAINT "Click_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
      'ALTER TABLE "AffiliateEvent" ADD CONSTRAINT "AffiliateEvent_affid_fkey" FOREIGN KEY ("affid") REFERENCES "Affiliate"("affid") ON DELETE SET NULL ON UPDATE CASCADE',
      'ALTER TABLE "Referral" ADD CONSTRAINT "Referral_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
      'ALTER TABLE "Payout" ADD CONSTRAINT "Payout_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
      'ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
      'ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
      'ALTER TABLE "PurchaseEvent" ADD CONSTRAINT "PurchaseEvent_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE',
      'ALTER TABLE "AffiliateApplication" ADD CONSTRAINT "AffiliateApplication_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    ]

    for (const idx of indexes) {
      try { await prisma.$executeRawUnsafe(idx) } catch (e) { /* may exist */ }
    }
    for (const fk of fkeys) {
      try { await prisma.$executeRawUnsafe(fk) } catch (e) { /* may exist */ }
    }

    console.log('[Setup] Tables and indexes created. Seeding data...')

    const admin1 = await prisma.admin.create({
      data: { email: 'eze@massapro.com', password: '$2a$12$LJ3m4ys3Lh0mZv8V0Ia2quJKl0gXvHqYqrFwmR5G0kSlN8KF6yWGe', name: 'Eze', role: 'super_admin', isActive: true },
    })
    const admin2 = await prisma.admin.create({
      data: { email: 'eitan@targetaudience.co', password: '$2a$12$LJ3m4ys3Lh0mZv8V0Ia2quJKl0gXvHqYqrFwmR5G0kSlN8KF6yWGe', name: 'Eitan', role: 'admin', isActive: true },
    })

    const aff1 = await prisma.affiliate.create({
      data: { affid: 'no_affiliate', name: 'No Affiliate (Direct Traffic)', email: 'no-affiliate@massapro.system', isActive: true, isApproved: true, commissionType: 'standard' },
    })
    const aff2 = await prisma.affiliate.create({
      data: { affid: 'MP-EITAN-001', name: 'Eitan', email: 'eitan@targetaudience.co', password: '$2a$12$LJ3m4ys3Lh0mZv8V0Ia2quJKl0gXvHqYqrFwmR5G0kSlN8KF6yWGe', isActive: true, isApproved: true, commissionType: 'standard' },
    })
    const aff3 = await prisma.affiliate.create({
      data: { affid: 'MP-ROBERTO-001', name: 'Roberto Singler', email: 'rsingler18@gmail.com', password: '$2a$12$LJ3m4ys3Lh0mZv8V0Ia2quJKl0gXvHqYqrFwmR5G0kSlN8KF6yWGe', isActive: true, isApproved: true, commissionType: 'standard' },
    })

    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      message: 'Database created, indexes added, and data seeded!',
      data: {
        admins: [admin1.email, admin2.email],
        affiliates: [aff1.affid, aff2.affid, aff3.affid],
      },
    })
  } catch (error: any) {
    console.error('[Setup] Error:', error)
    return NextResponse.json(
      { error: error.message, detail: error.meta?.cause || '' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const adminCount = await prisma.admin.count()
    const affCount = await prisma.affiliate.count()
    const clickCount = await prisma.click.count()
    await prisma.$disconnect()
    return NextResponse.json({ status: 'connected', tables: { admins: adminCount, affiliates: affCount, clicks: clickCount } })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 })
  }
}
