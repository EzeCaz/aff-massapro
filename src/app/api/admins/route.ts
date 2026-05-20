import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// GET /api/admins — List all admins
export async function GET() {
  try {
    const admins = await db.admin.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ admins })
  } catch (error) {
    console.error('Error fetching admins:', error)
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 })
  }
}

// POST /api/admins — Create a new admin or promote an affiliate to admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role, promoteAffiliateId } = body

    // Promote an existing affiliate to admin
    if (promoteAffiliateId) {
      const affiliate = await db.affiliate.findUnique({ where: { id: promoteAffiliateId } })
      if (!affiliate) {
        return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
      }

      // Check if admin already exists with this email
      const existingAdmin = await db.admin.findUnique({ where: { email: affiliate.email } })
      if (existingAdmin) {
        return NextResponse.json({ error: 'Admin with this email already exists' }, { status: 409 })
      }

      const hashedPassword = await bcrypt.hash(password || 'changeme', 12)
      const admin = await db.admin.create({
        data: {
          email: affiliate.email,
          password: hashedPassword,
          name: affiliate.name,
          role: role || 'admin',
        },
      })

      return NextResponse.json({
        admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        message: `Affiliate ${affiliate.name} promoted to admin`,
      })
    }

    // Create a brand new admin
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    const existing = await db.admin.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Admin with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const admin = await db.admin.create({
      data: { email, password: hashedPassword, name, role: role || 'admin' },
    })

    return NextResponse.json({
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      message: 'Admin created successfully',
    })
  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 })
  }
}

// PUT /api/admins — Update an admin (change role, toggle active, reset password)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, role, isActive, password } = body

    if (!id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({ where: { id } })
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Prevent deactivating the last super_admin
    if (admin.role === 'super_admin' && isActive === false) {
      const superAdminCount = await db.admin.count({ where: { role: 'super_admin', isActive: true } })
      if (superAdminCount <= 1) {
        return NextResponse.json({ error: 'Cannot deactivate the last super admin' }, { status: 400 })
      }
    }

    const updateData: { role?: string; isActive?: boolean; password?: string } = {}
    if (role) updateData.role = role
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const updated = await db.admin.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })

    return NextResponse.json({ admin: updated })
  } catch (error) {
    console.error('Error updating admin:', error)
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 })
  }
}

// DELETE /api/admins — Remove an admin
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({ where: { id } })
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Prevent deleting the last super_admin
    if (admin.role === 'super_admin') {
      const superAdminCount = await db.admin.count({ where: { role: 'super_admin', isActive: true } })
      if (superAdminCount <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last super admin' }, { status: 400 })
      }
    }

    await db.admin.delete({ where: { id } })
    return NextResponse.json({ message: 'Admin deleted successfully' })
  } catch (error) {
    console.error('Error deleting admin:', error)
    return NextResponse.json({ error: 'Failed to delete admin' }, { status: 500 })
  }
}
