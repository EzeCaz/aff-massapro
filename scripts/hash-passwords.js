/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const affiliates = await prisma.affiliate.findMany()
  for (const aff of affiliates) {
    if (!aff.password.startsWith('$2a$')) {
      const hashed = await bcrypt.hash(aff.password, 10)
      await prisma.affiliate.update({ where: { id: aff.id }, data: { password: hashed } })
      console.log(`Hashed password for ${aff.name} (${aff.affid})`)
    } else {
      console.log(`Already hashed: ${aff.name} (${aff.affid})`)
    }
  }

  // Also hash application passwords
  const applications = await prisma.affiliateApplication.findMany()
  for (const app of applications) {
    if (!app.password.startsWith('$2a$')) {
      const hashed = await bcrypt.hash(app.password, 10)
      await prisma.affiliateApplication.update({ where: { id: app.id }, data: { password: hashed } })
      console.log(`Hashed password for application: ${app.name} (${app.email})`)
    } else {
      console.log(`Already hashed application: ${app.name} (${app.email})`)
    }
  }
}
main().then(() => prisma.$disconnect())
