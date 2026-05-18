import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(randomBetween(6, 22), randomBetween(0, 59), randomBetween(0, 59))
  return d
}

async function main() {
  // Clean existing data
  await prisma.click.deleteMany()
  await prisma.referral.deleteMany()
  await prisma.payout.deleteMany()
  await prisma.affiliate.deleteMany()

  const affiliates = [
    {
      affid: 'MP-SARAH-001',
      name: 'Sarah Mitchell',
      email: 'sarah.mitchell@digitalgrowth.io',
      phone: '+1 (555) 234-5678',
      isActive: true,
    },
    {
      affid: 'MP-JAMES-002',
      name: 'James Rodriguez',
      email: 'james.r@affiliatepro.com',
      phone: '+1 (555) 345-6789',
      isActive: true,
    },
    {
      affid: 'MP-EMILY-003',
      name: 'Emily Chen',
      email: 'emily.chen@marketwise.co',
      phone: '+1 (555) 456-7890',
      isActive: true,
    },
    {
      affid: 'MP-MARCUS-004',
      name: 'Marcus Thompson',
      email: 'marcus.t@referralking.net',
      phone: '+1 (555) 567-8901',
      isActive: false,
    },
    {
      affid: 'MP-AISHA-005',
      name: 'Aisha Patel',
      email: 'aisha.patel@growthengine.ai',
      phone: '+1 (555) 678-9012',
      isActive: true,
    },
  ]

  const planTypes = ['Enterprise', 'Professional', 'Basic']
  const leadStatuses = ['Lead', 'Call Booked', 'Active Subscriber', 'Churned']
  const campaigns = [
    'spring-launch-2025',
    'summer-promo',
    'webinar-followup',
    'cold-outreach-q1',
    'social-media-push',
    'email-nurture-series',
    'partnership-drive',
    'holiday-special',
  ]
  const contents = [
    'banner-ad-top',
    'sidebar-widget',
    'email-signature',
    'blog-post-embed',
    'social-post-linkedin',
    'social-post-twitter',
    'landing-page-hero',
    'popup-modal',
  ]
  const landingPages = [
    'https://massapro.com/',
    'https://massapro.com/pricing',
    'https://massapro.com/demo',
    'https://massapro.com/enterprise',
    'https://massapro.com/features',
  ]
  const utmSources = ['affiliate', 'partner', 'referral']
  const utmMediums = ['cpc', 'cpa', 'email', 'social']

  const commissionByPlan: Record<string, number> = {
    Enterprise: 100,
    Professional: 50,
    Basic: 10,
  }

  const createdAffiliates = []

  for (const aff of affiliates) {
    const affiliate = await prisma.affiliate.create({
      data: aff,
    })
    createdAffiliates.push(affiliate)
    console.log(`Created affiliate: ${affiliate.name} (${affiliate.affid})`)
  }

  // Generate clicks and referrals for each affiliate
  for (const affiliate of createdAffiliates) {
    const isInactive = !affiliate.isActive

    // Generate 30 days of click data
    const clickData = []
    for (let day = 0; day < 30; day++) {
      const dailyClicks = isInactive ? randomBetween(0, 8) : randomBetween(5, 50)
      for (let c = 0; c < dailyClicks; c++) {
        const clickDate = daysAgo(29 - day)
        clickData.push({
          affiliateId: affiliate.id,
          affid: affiliate.affid,
          utmSource: randomElement(utmSources),
          utmMedium: randomElement(utmMediums),
          utmCampaign: randomElement(campaigns),
          utmContent: randomElement(contents),
          ipAddress: `192.168.${randomBetween(1, 255)}.${randomBetween(1, 255)}`,
          userAgent: randomElement([
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
            'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
          ]),
          landingPage: randomElement(landingPages),
          createdAt: clickDate,
        })
      }
    }

    // Insert clicks in batches of 100
    for (let i = 0; i < clickData.length; i += 100) {
      const batch = clickData.slice(i, i + 100)
      await prisma.click.createMany({ data: batch })
    }

    const totalTraffic = clickData.length

    // Generate referrals (8-15 per affiliate)
    const numReferrals = isInactive ? randomBetween(4, 7) : randomBetween(8, 15)
    const leadNames = [
      'David Wilson', 'Maria Garcia', 'Robert Kim', 'Jennifer Lopez',
      'Michael Brown', 'Lisa Anderson', 'Thomas White', 'Jessica Martinez',
      'Christopher Lee', 'Amanda Taylor', 'Daniel Harris', 'Stephanie Clark',
      'Andrew Robinson', 'Nicole Walker', 'Kevin Hall', 'Rachel Young',
      'Brian Allen', 'Samantha King', 'Jason Wright', 'Megan Scott',
    ]

    let totalEarnings = 0
    let totalConversions = 0
    let approvedBalance = 0
    let paidBalance = 0

    const referrals = []
    for (let r = 0; r < numReferrals; r++) {
      const planType = randomElement(planTypes)
      const leadStatus = randomElement(leadStatuses)
      const monthsActive = leadStatus === 'Active Subscriber' ? randomBetween(1, 12) :
                          leadStatus === 'Churned' ? randomBetween(1, 6) :
                          leadStatus === 'Call Booked' ? 0 : 0

      const monthlyComm = commissionByPlan[planType]
      const signupComm = (leadStatus === 'Active Subscriber' || leadStatus === 'Churned') ? 100 : 0
      const totalComm = signupComm + (monthlyComm * monthsActive)

      totalEarnings += totalComm
      if (leadStatus === 'Active Subscriber' || leadStatus === 'Churned') {
        totalConversions++
      }

      const isPaid = Math.random() > 0.5
      if (isPaid) {
        paidBalance += totalComm
      } else {
        approvedBalance += totalComm
      }

      referrals.push({
        affiliateId: affiliate.id,
        affid: affiliate.affid,
        leadName: leadNames[r % leadNames.length],
        leadEmail: `${leadNames[r % leadNames.length].toLowerCase().replace(' ', '.')}@example.com`,
        planType,
        leadStatus,
        signupCommission: signupComm,
        monthlyCommission: monthlyComm,
        monthsActive,
        totalCommission: totalComm,
        utmCampaign: randomElement(campaigns),
        utmContent: randomElement(contents),
        createdAt: daysAgo(randomBetween(1, 45)),
      })
    }

    await prisma.referral.createMany({ data: referrals })

    // Update affiliate stats
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        totalTraffic,
        totalConversions,
        totalEarnings,
        approvedBalance,
        paidBalance,
      },
    })

    // Generate payouts
    // Pending payouts
    const pendingAmount = approvedBalance * 0.6
    if (pendingAmount > 0) {
      await prisma.payout.create({
        data: {
          affiliateId: affiliate.id,
          affid: affiliate.affid,
          amount: Math.round(pendingAmount * 100) / 100,
          status: 'pending',
          periodStart: daysAgo(60),
          periodEnd: daysAgo(30),
        },
      })
    }

    // Approved payouts
    const approvedAmount = approvedBalance * 0.4
    if (approvedAmount > 0) {
      await prisma.payout.create({
        data: {
          affiliateId: affiliate.id,
          affid: affiliate.affid,
          amount: Math.round(approvedAmount * 100) / 100,
          status: 'approved',
          periodStart: daysAgo(90),
          periodEnd: daysAgo(60),
        },
      })
    }

    // Processed payouts
    if (paidBalance > 0) {
      await prisma.payout.create({
        data: {
          affiliateId: affiliate.id,
          affid: affiliate.affid,
          amount: Math.round(paidBalance * 100) / 100,
          status: 'processed',
          periodStart: daysAgo(120),
          periodEnd: daysAgo(90),
          processedAt: daysAgo(85),
        },
      })
    }

    console.log(`  - ${totalTraffic} clicks, ${numReferrals} referrals, $${totalEarnings.toFixed(2)} earnings`)
  }

  // Final stats
  const totalAffiliates = await prisma.affiliate.count()
  const totalClicks = await prisma.click.count()
  const totalReferrals = await prisma.referral.count()
  const totalPayouts = await prisma.payout.count()

  console.log('\n=== Seed Complete ===')
  console.log(`Affiliates: ${totalAffiliates}`)
  console.log(`Clicks: ${totalClicks}`)
  console.log(`Referrals: ${totalReferrals}`)
  console.log(`Payouts: ${totalPayouts}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
