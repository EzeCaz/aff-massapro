import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  const email = 'eze@massapro.com'
  const password = 'MassaEze2289'
  const name = 'Eze'
  const hashedPassword = await bcrypt.hash(password, 12)

  const existing = await db.admin.findUnique({ where: { email } })

  if (existing) {
    console.log('Admin already exists, updating password...')
    await db.admin.update({
      where: { email },
      data: { password: hashedPassword, name, role: 'super_admin', isActive: true },
    })
  } else {
    const admin = await db.admin.create({
      data: { email, password: hashedPassword, name, role: 'super_admin' },
    })
    console.log('Admin created:', admin.email, admin.role)
  }

  const admins = await db.admin.findMany()
  console.log('All admins:', admins.map(a => `${a.email} (${a.role})`))
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
