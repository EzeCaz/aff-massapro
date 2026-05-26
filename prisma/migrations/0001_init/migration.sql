-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Affiliate" (
    "id" TEXT NOT NULL,
    "affid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL DEFAULT 'changeme',
    "company" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "commissionType" TEXT NOT NULL DEFAULT 'standard',
    "customSignupComm" DOUBLE PRECISION,
    "customEnterprise" DOUBLE PRECISION,
    "customProfess" DOUBLE PRECISION,
    "customBasic" DOUBLE PRECISION,
    "notes" TEXT,
    "totalTraffic" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "website" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "generatedAffid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "affiliateId" TEXT,

    CONSTRAINT "AffiliateApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Click" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "affid" TEXT NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "pageUrl" TEXT,
    "eventType" TEXT NOT NULL DEFAULT 'pageview',
    "eventId" TEXT,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "affid" TEXT NOT NULL,
    "leadName" TEXT NOT NULL,
    "leadEmail" TEXT,
    "leadPhone" TEXT,
    "leadCompany" TEXT,
    "planType" TEXT NOT NULL,
    "leadStatus" TEXT NOT NULL,
    "signupCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthsActive" INTEGER NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ftUtmSource" TEXT,
    "ftUtmMedium" TEXT,
    "ftUtmCampaign" TEXT,
    "ftUtmContent" TEXT,
    "ftUtmTerm" TEXT,
    "ltUtmSource" TEXT,
    "ltUtmMedium" TEXT,
    "ltUtmCampaign" TEXT,
    "ltUtmContent" TEXT,
    "ltUtmTerm" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "affid" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLedger" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "affid" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "monthNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "affid" TEXT,
    "utmCampaign" TEXT,
    "pageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseEvent" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT,
    "affid" TEXT,
    "eventType" TEXT NOT NULL,
    "orderId" TEXT,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "planType" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "cartValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "sessionId" TEXT,
    "ftUtmSource" TEXT,
    "ftUtmMedium" TEXT,
    "ftUtmCampaign" TEXT,
    "ftUtmContent" TEXT,
    "ftUtmTerm" TEXT,
    "ltUtmSource" TEXT,
    "ltUtmMedium" TEXT,
    "ltUtmCampaign" TEXT,
    "ltUtmContent" TEXT,
    "ltUtmTerm" TEXT,
    "pageUrl" TEXT,
    "funnelSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_affid_key" ON "Affiliate"("affid");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_email_key" ON "Affiliate"("email");

-- CreateIndex
CREATE INDEX "Affiliate_affid_idx" ON "Affiliate"("affid");

-- CreateIndex
CREATE INDEX "Affiliate_email_idx" ON "Affiliate"("email");

-- CreateIndex
CREATE INDEX "Affiliate_isActive_idx" ON "Affiliate"("isActive");

-- CreateIndex
CREATE INDEX "Affiliate_isApproved_idx" ON "Affiliate"("isApproved");

-- CreateIndex
CREATE INDEX "AffiliateApplication_status_idx" ON "AffiliateApplication"("status");

-- CreateIndex
CREATE INDEX "AffiliateApplication_email_idx" ON "AffiliateApplication"("email");

-- CreateIndex
CREATE INDEX "Click_affiliateId_idx" ON "Click"("affiliateId");

-- CreateIndex
CREATE INDEX "Click_affid_idx" ON "Click"("affid");

-- CreateIndex
CREATE INDEX "Click_createdAt_idx" ON "Click"("createdAt");

-- CreateIndex
CREATE INDEX "Click_eventType_idx" ON "Click"("eventType");

-- CreateIndex
CREATE INDEX "Click_eventId_idx" ON "Click"("eventId");

-- CreateIndex
CREATE INDEX "Referral_affiliateId_idx" ON "Referral"("affiliateId");

-- CreateIndex
CREATE INDEX "Referral_affid_idx" ON "Referral"("affid");

-- CreateIndex
CREATE INDEX "Referral_leadStatus_idx" ON "Referral"("leadStatus");

-- CreateIndex
CREATE INDEX "Referral_leadEmail_idx" ON "Referral"("leadEmail");

-- CreateIndex
CREATE INDEX "Referral_createdAt_idx" ON "Referral"("createdAt");

-- CreateIndex
CREATE INDEX "Payout_affiliateId_idx" ON "Payout"("affiliateId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "CommissionLedger_affiliateId_idx" ON "CommissionLedger"("affiliateId");

-- CreateIndex
CREATE INDEX "CommissionLedger_affid_idx" ON "CommissionLedger"("affid");

-- CreateIndex
CREATE INDEX "CommissionLedger_type_idx" ON "CommissionLedger"("type");

-- CreateIndex
CREATE INDEX "CommissionLedger_createdAt_idx" ON "CommissionLedger"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_email_idx" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_role_idx" ON "Admin"("role");

-- CreateIndex
CREATE INDEX "AffiliateEvent_affid_idx" ON "AffiliateEvent"("affid");

-- CreateIndex
CREATE INDEX "AffiliateEvent_eventName_idx" ON "AffiliateEvent"("eventName");

-- CreateIndex
CREATE INDEX "AffiliateEvent_createdAt_idx" ON "AffiliateEvent"("createdAt");

-- CreateIndex
CREATE INDEX "PurchaseEvent_affiliateId_idx" ON "PurchaseEvent"("affiliateId");

-- CreateIndex
CREATE INDEX "PurchaseEvent_affid_idx" ON "PurchaseEvent"("affid");

-- CreateIndex
CREATE INDEX "PurchaseEvent_eventType_idx" ON "PurchaseEvent"("eventType");

-- CreateIndex
CREATE INDEX "PurchaseEvent_planType_idx" ON "PurchaseEvent"("planType");

-- CreateIndex
CREATE INDEX "PurchaseEvent_createdAt_idx" ON "PurchaseEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "AffiliateApplication" ADD CONSTRAINT "AffiliateApplication_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Click" ADD CONSTRAINT "Click_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateEvent" ADD CONSTRAINT "AffiliateEvent_affid_fkey" FOREIGN KEY ("affid") REFERENCES "Affiliate"("affid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseEvent" ADD CONSTRAINT "PurchaseEvent_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

