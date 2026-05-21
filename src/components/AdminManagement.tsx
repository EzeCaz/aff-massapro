'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck, UserPlus, ArrowUpRight, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

interface Admin {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
}

interface Affiliate {
  id: string
  affid: string
  name: string
  email: string
  isActive: boolean
  isApproved: boolean
}

export default function AdminManagement() {
  const { adminUser } = useAppStore()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showPromoteForm, setShowPromoteForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('admin')
  const [promoteId, setPromoteId] = useState('')
  const [promotePassword, setPromotePassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isSuperAdmin = adminUser?.role === 'super_admin'

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admins')
      const data = await res.json()
      if (data.admins) setAdmins(data.admins)
    } catch (err) {
      console.error('Failed to fetch admins:', err)
    }
  }

  const fetchAffiliates = async () => {
    try {
      const res = await fetch('/api/affiliates')
      const data = await res.json()
      if (data.affiliates) setAffiliates(data.affiliates)
    } catch (err) {
      console.error('Failed to fetch affiliates:', err)
    }
  }

  useEffect(() => {
    Promise.all([fetchAdmins(), fetchAffiliates()]).finally(() => setLoading(false))
  }, [])

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setMessage('')
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setMessage(data.message)
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('admin')
      setShowAddForm(false)
      fetchAdmins()
    } catch (err) { setError('Failed to create admin') }
  }

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setMessage('')
    if (!promotePassword) { setError('Password is required for the new admin'); return }
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoteAffiliateId: promoteId, password: promotePassword, role: 'admin' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setMessage(data.message)
      setPromoteId(''); setPromotePassword('')
      setShowPromoteForm(false)
      fetchAdmins()
    } catch (err) { setError('Failed to promote affiliate') }
  }

  const handleToggleActive = async (admin: Admin) => {
    setError(''); setMessage('')
    try {
      const res = await fetch('/api/admins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: admin.id, isActive: !admin.isActive }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setMessage(`Admin ${admin.name} ${admin.isActive ? 'deactivated' : 'activated'}`)
      fetchAdmins()
    } catch (err) { setError('Failed to update admin') }
  }

  const handleDelete = async (admin: Admin) => {
    if (!confirm(`Remove admin ${admin.name} (${admin.email})?`)) return
    setError(''); setMessage('')
    try {
      const res = await fetch(`/api/admins?id=${admin.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setMessage(data.message)
      fetchAdmins()
    } catch (err) { setError('Failed to delete admin') }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading admin management...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-purple-600" />
            Admin Management
          </h1>
          <p className="text-gray-500 mt-1">Manage who has access to the admin dashboard</p>
        </div>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => { setShowAddForm(!showAddForm); setShowPromoteForm(false) }}
              className="bg-purple-600 hover:bg-purple-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
            <Button onClick={() => { setShowPromoteForm(!showPromoteForm); setShowAddForm(false) }}
              variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Promote Affiliate
            </Button>
          </div>
        )}
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{message}</div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Add Admin Form */}
      {showAddForm && isSuperAdmin && (
        <Card className="border-purple-200">
          <CardHeader><CardTitle className="text-lg">Create New Admin</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Create Admin</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Promote Affiliate Form */}
      {showPromoteForm && isSuperAdmin && (
        <Card className="border-purple-200">
          <CardHeader><CardTitle className="text-lg">Promote Affiliate to Admin</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handlePromote} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Affiliate</label>
                <select value={promoteId} onChange={e => setPromoteId(e.target.value)} required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="">-- Choose affiliate --</option>
                  {affiliates
                    .filter(a => !admins.some(ad => ad.email === a.email))
                    .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.email}) — {a.affid}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Set Admin Password</label>
                <input type="password" value={promotePassword} onChange={e => setPromotePassword(e.target.value)} required
                  placeholder="Password for admin login"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Promote to Admin</Button>
                <Button type="button" variant="outline" onClick={() => setShowPromoteForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Admin List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Current Admins ({admins.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => { fetchAdmins(); setMessage(''); setError('') }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No admins found</p>
          ) : (
            <div className="space-y-3">
              {admins.map(admin => (
                <div key={admin.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    admin.isActive ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      admin.role === 'super_admin' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      <ShieldCheck className={`w-5 h-5 ${
                        admin.role === 'super_admin' ? 'text-purple-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {admin.name}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          admin.role === 'super_admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                        {!admin.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{admin.email}</p>
                      <p className="text-xs text-gray-400">Created {new Date(admin.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {isSuperAdmin && admin.id !== adminUser?.id && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm"
                        onClick={() => handleToggleActive(admin)}
                        className={admin.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}>
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="outline" size="sm"
                        onClick={() => handleDelete(admin)}
                        className="border-red-200 text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {admin.id === adminUser?.id && (
                    <span className="text-xs text-purple-500 font-medium">You</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info box */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <h3 className="font-medium text-gray-700 mb-2">Admin Roles</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium mt-0.5">Super Admin</span>
              <span>Full access: can add/remove admins, promote affiliates, and manage all settings</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium mt-0.5">Admin</span>
              <span>Dashboard access: can manage affiliates, leads, payouts, and view analytics</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
