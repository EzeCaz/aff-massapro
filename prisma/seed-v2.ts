import { PrismaClient } from '@prisma/client'
import { subDays, subHours } from 'date-fns'

const prisma = new PrismaClient()

const EVENT_IDS = ['btn_hero_demo', 'btn_pricing_tier', 'btn_cta_signup', 'btn_nav_contact']
const UTM_SOURCES = ['google', 'facebook', 'linkedin', 'twitter', 'affiliate', 'email', 'direct']
const UTM_MEDIUMS = ['cpc', 'cpm', 'social', 'email', 'referral', 'organic']
const UTM_CAMPAIGNS = ['spring-launch', 'summer-promo', 'q1-push', 'webinar-series', 'content-marketing', 'partner-drive']
const UTM_CONTENTS = ['banner-top', 'sidebar-widget', 'footer-link', 'popup-modal', 'inline-text', 'hero-section']
const UTM_TERMS = ['ai-receptionist', 'virtual-secretary', 'massapro-demo', 'booking-automation', 'lead-capture']

const AFFILIATES = [
  { affid: 'MP-SARAH-001', name: 'Sarah Mitchell', email: 'sarah@digitalgrowth.co', phone: '+1 (555) 101-2001', company: 'Digital Growth Agency', isActive: true, isApproved: true, commissionType: 'premium', totalTraffic: 0, totalConversions: 0, totalEarnings: 0, approvedBalance: 0, paidBalance: 0 },
  { affid: 'MP-JOHN-002', name: 'John Parker', email: 'john@techpartners.io', phone: '+1 (555) 202-3002', company: 'Tech Partners LLC', isActive: true, isApproved: true, commissionType: 'standard', totalTraffic: 0, totalConversions: 0, totalEarnings: 0, approvedBalance: 0, paidBalance: 0 },
  { affid: 'MP-EMILY-003', name: 'Emily Rodriguez', email: 'emily@cloudsolutions.com', phone: '+1 (555) 303-4003', company: 'Cloud Solutions Inc', isActive: true, isApproved: true, commissionType: 'custom', customSignupComm: 125, customEnterprise: 120, customProfess: 60, customBasic: 15, totalTraffic: 0, totalConversions: 0, totalEarnings: 0, approvedBalance: 0, paidBalance: 0 },
  { affid: 'MP-DAVID-004', name: 'David Kim', email: 'david@salesforceconsulting.net', phone: '+1 (555) 404-5004', company: 'Salesforce Consulting', isActive: true, isApproved: true, commissionType: 'standard', totalTraffic: 0, totalConversions: 0, totalEarnings: 0, approvedBalance: 0, paidBalance: 0 },
  { affid: 'MP-LISA-005', name: 'Lisa Chen', email: 'lisa@startupaccelerator.com', phone: '+1 (555) 505-6005', company: 'Startup Accelerator', isActive: false, isApproved: false, commissionType: 'standard', totalTraffic: 0, totalConversions: 0, totalEarnings: 0, approvedBalance: 0, paidBalance: 0 },
]

const APPLICATIONS = [
  { name: 'Marcus Thompson', email: 'marcus@inboundmarketing.co', phone: '+1 (555) 606-7006', company: 'Inbound Marketing Co', website: 'https://inboundmarketing.co', message: 'I run a marketing agency and would love to promote MassaPro to my clients. We have a network of 200+ small businesses who could benefit from an AI receptionist.', status: 'pending' },
  { name: 'Rachel Adams', email: 'rachel@businessautomation.io', phone: '+1 (555) 707-8007', company: 'Business Automation', website: 'https://businessautomation.io', message: 'We specialize in business automation tools and MassaPro fits perfectly into our portfolio. Looking forward to a long-term partnership.', status: 'approved', generatedAffid: 'MP-RACHEL-006' },
  { name: 'Tom Wilson', email: 'tom@freelanceconsulting.com', phone: '+1 (555) 808-9008', company: '', website: '', message: 'I want to earn some side income by promoting MassaPro.', status: 'rejected', reviewNotes: 'Insufficient experience and no relevant audience.' },
]

const LEAD_NAMES = [
  'Alex Morgan', 'Jordan Taylor', 'Casey Williams', 'Riley Brown', 'Morgan Davis',
  'Quinn Martinez', 'Avery Wilson', 'Drew Anderson', 'Blake Thomas', 'Sage Jackson',
  'Reese White', 'Dakota Harris', 'Rowan Clark', 'Finley Lewis', 'Emery Robinson',
  'Harper Walker', 'Phoenix Young', 'Skyler King', 'Lennox Scott', 'Arden Green',
  'Remy Adams', 'Ellis Baker', 'Nico Nelson', 'Noa Hill', 'Sasha Campbell',
]

const COMPANIES = ['Acme Corp', 'Globex Inc', 'Initech', 'Umbrella Corp', 'Wayne Enterprises', 'Stark Industries', 'Cyberdyne Systems', 'Soylent Corp', 'Massive Dynamic', 'Oscorp']

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  console.log('Clearing existing data...')

  await prisma.commissionLedger.deleteMany()
  await prisma.payout.deleteMany()
  await prisma.referral.deleteMany()
  await prisma.click.deleteMany()
  await prisma.affiliateApplication.deleteMany()
  await prisma.affiliate.deleteMany()

  console.log('Creating affiliates...')
  const affiliateRecords: Record<string, string> = {}

  for (const aff of AFFILIATES) {
    const record = await prisma.affiliate.create({ data: aff })
    affiliateRecords[aff.affid] = record.id
  }

  // Create the approved application's affiliate too
  const rachelAff = await prisma.affiliate.create({
    data: {
      affid: 'MP-RACHEL-006',
      name: 'Rachel Adams',
      email: 'rachel@businessautomation.io',
      phone: '+1 (555) 707-8007',
      company: 'Business Automation',
      isActive: true,
      isApproved: true,
      commissionType: 'standard',
      totalTraffic: 0,
      totalConversions: 0,
      totalEarnings: 0,
      approvedBalance: 0,
      paidBalance: 0,
    },
  })
  affiliateRecords['MP-RACHEL-006'] = rachelAff.id

  console.log('Creating applications...')
  for (const app of APPLICATIONS) {
    const appData: Record<string, unknown> = { ...app }
    if (app.status === 'approved' && app.generatedAffid) {
      appData.affiliateId = affiliateRecords[app.generatedAffid]
      appData.reviewedAt = subDays(new Date(), 5)
      appData.reviewedBy = 'admin'
    } else if (app.status === 'rejected') {
      appData.reviewedAt = subDays(new Date(), 3)
      appData.reviewedBy = 'admin'
    }
    await prisma.affiliateApplication.create({ data: appData as any })
  }

  console.log('Creating click data (30 days)...')
  const activeAffids = ['MP-SARAH-001', 'MP-JOHN-002', 'MP-EMILY-003', 'MP-DAVID-004', 'MP-RACHEL-006']

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = subDays(new Date(), dayOffset)
    const clicksThisDay = randomInt(8, 25)

    for (let i = 0; i < clicksThisDay; i++) {
      const affid = randomFrom(activeAffids)
      const isPageview = Math.random() > 0.35
      const clickDate = subHours(date, randomInt(0, 23))

      await prisma.click.create({
        data: {
          affiliateId: affiliateRecords[affid],
          affid,
          utmSource: randomFrom(UTM_SOURCES),
          utmMedium: randomFrom(UTM_MEDIUMS),
          utmCampaign: randomFrom(UTM_CAMPAIGNS),
          utmContent: randomFrom(UTM_CONTENTS),
          utmTerm: randomFrom(UTM_TERMS),
          pageUrl: 'https://receptionist.massapro.com/',
          eventType: isPageview ? 'pageview' : 'button_click',
          eventId: isPageview ? null : randomFrom(EVENT_IDS),
          sessionId: `sess_${randomInt(100000, 999999)}`,
          ipAddress: `${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt: clickDate,
        },
      })

      // Increment traffic count
      await prisma.affiliate.update({
        where: { id: affiliateRecords[affid] },
        data: { totalTraffic: { increment: 1 } },
      })
    }
  }

  console.log('Creating referrals...')
  const planTypes = ['Enterprise', 'Professional', 'Basic']
  const statuses = ['Lead', 'Booked Call', 'Paying Customer', 'Churned']
  const referralIds: string[] = []

  for (let i = 0; i < LEAD_NAMES.length; i++) {
    const affid = randomFrom(activeAffids)
    const planType = randomFrom(planTypes)
    const status = randomFrom(statuses)
    const affiliateId = affiliateRecords[affid]
    const ftSource = randomFrom(UTM_SOURCES)
    const ftMedium = randomFrom(UTM_MEDIUMS)
    const ftCampaign = randomFrom(UTM_CAMPAIGNS)
    const ltSource = Math.random() > 0.5 ? randomFrom(UTM_SOURCES) : ftSource
    const ltMedium = Math.random() > 0.5 ? randomFrom(UTM_MEDIUMS) : ftMedium
    const ltCampaign = Math.random() > 0.5 ? randomFrom(UTM_CAMPAIGNS) : ftCampaign
    const createdAt = subDays(new Date(), randomInt(1, 28))

    const signupComm = status === 'Paying Customer' ? 100 : 0
    const monthsActive = status === 'Paying Customer' ? randomInt(1, 8) : 0
    const monthlyComm = planType === 'Enterprise' ? 100 : planType === 'Professional' ? 50 : 10
    const totalComm = signupComm + (monthlyComm * monthsActive)

    const referral = await prisma.referral.create({
      data: {
        affiliateId,
        affid,
        leadName: LEAD_NAMES[i],
        leadEmail: `${LEAD_NAMES[i].toLowerCase().replace(/\s+/g, '.')}@example.com`,
        leadPhone: `+1 (555) ${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
        leadCompany: randomFrom(COMPANIES),
        planType,
        leadStatus: status,
        signupCommission: signupComm,
        monthlyCommission: monthlyComm,
        monthsActive,
        totalCommission: totalComm,
        ftUtmSource: ftSource,
        ftUtmMedium: ftMedium,
        ftUtmCampaign: ftCampaign,
        ftUtmContent: randomFrom(UTM_CONTENTS),
        ftUtmTerm: randomFrom(UTM_TERMS),
        ltUtmSource: ltSource,
        ltUtmMedium: ltMedium,
        ltUtmCampaign: ltCampaign,
        ltUtmContent: randomFrom(UTM_CONTENTS),
        ltUtmTerm: randomFrom(UTM_TERMS),
        createdAt,
      },
    })
    referralIds.push(referral.id)

    // Update affiliate stats
    if (signupComm > 0 || totalComm > 0) {
      await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          totalConversions: { increment: status === 'Paying Customer' ? 1 : 0 },
          totalEarnings: { increment: totalComm },
          approvedBalance: { increment: totalComm },
        },
      })
    }

    // Create commission ledger entries for paying customers
    if (status === 'Paying Customer') {
      // Signup commission
      await prisma.commissionLedger.create({
        data: {
          affiliateId,
          affid,
          referralId: referral.id,
          type: 'signup',
          amount: signupComm,
          description: `Signup commission for ${LEAD_NAMES[i]} (${planType})`,
          createdAt: subDays(createdAt, 0),
        },
      })

      // Monthly recurring commissions
      for (let m = 1; m <= monthsActive; m++) {
        await prisma.commissionLedger.create({
          data: {
            affiliateId,
            affid,
            referralId: referral.id,
            type: 'recurring',
            amount: monthlyComm,
            description: `Month ${m} recurring commission for ${LEAD_NAMES[i]} (${planType})`,
            monthNumber: m,
            createdAt: subDays(new Date(), Math.max(0, 28 - m * 30)),
          },
        })
      }
    }
  }

  console.log('Creating payouts...')
  // Create some payouts for each active affiliate
  for (const affid of activeAffids.slice(0, 3)) {
    const affiliateId = affiliateRecords[affid]
    const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } })
    if (!affiliate || affiliate.approvedBalance <= 0) continue

    // Create a pending payout for partial balance
    const payoutAmount = Math.round(affiliate.approvedBalance * 0.6)
    if (payoutAmount > 0) {
      await prisma.payout.create({
        data: {
          affiliateId,
          affid,
          amount: payoutAmount,
          status: 'pending',
          periodStart: subDays(new Date(), 30),
          periodEnd: new Date(),
        },
      })

      // Create a processed payout for some
      if (affid === 'MP-SARAH-001') {
        await prisma.payout.create({
          data: {
            affiliateId,
            affid,
            amount: Math.round(payoutAmount * 0.5),
            status: 'processed',
            periodStart: subDays(new Date(), 60),
            periodEnd: subDays(new Date(), 31),
            processedAt: subDays(new Date(), 5),
          },
        })
      }

      if (affid === 'MP-JOHN-002') {
        await prisma.payout.create({
          data: {
            affiliateId,
            affid,
            amount: Math.round(payoutAmount * 0.4),
            status: 'approved',
            periodStart: subDays(new Date(), 45),
            periodEnd: subDays(new Date(), 16),
          },
        })
      }
    }
  }

  console.log('Seed data created successfully!')
  console.log(`  - ${AFFILIATES.length + 1} affiliates`)
  console.log(`  - ${APPLICATIONS.length} applications`)
  console.log(`  - ${LEAD_NAMES.length} referrals`)
  console.log(`  - Commission ledger entries created`)
  console.log(`  - Payouts created`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
