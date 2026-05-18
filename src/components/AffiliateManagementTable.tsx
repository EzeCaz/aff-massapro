'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { MoreHorizontal, Search, Plus, Pencil, DollarSign, UserX, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Affiliate {
  id: string
  affid: string
  name: string
  email: string
  phone: string | null
  isActive: boolean
  totalTraffic: number
  totalConversions: number
  totalEarnings: number
  approvedBalance: number
  paidBalance: number
  createdAt: string
  _count?: { clicks: number; referrals: number; payouts: number }
}

export default function AffiliateManagementTable() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editAffiliate, setEditAffiliate] = useState<Affiliate | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)

  // Balance dialog state
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [balanceAffiliate, setBalanceAffiliate] = useState<Affiliate | null>(null)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceReason, setBalanceReason] = useState('')
  const [balanceType, setBalanceType] = useState<'approved' | 'paid'>('approved')

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createAffid, setCreateAffid] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchAffiliates = useCallback(async () => {
    try {
      const res = await fetch('/api/affiliates')
      const data = await res.json()
      setAffiliates(data)
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch affiliates', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAffiliates()
  }, [fetchAffiliates])

  const filtered = affiliates.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.affid.toLowerCase().includes(search.toLowerCase())
  )

  const handleEdit = (affiliate: Affiliate) => {
    setEditAffiliate(affiliate)
    setEditName(affiliate.name)
    setEditEmail(affiliate.email)
    setEditPhone(affiliate.phone || '')
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editAffiliate) return
    setSaving(true)
    try {
      const res = await fetch(`/api/affiliates/${editAffiliate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone }),
      })
      if (res.ok) {
        toast({ title: 'Success', description: 'Affiliate profile updated' })
        setEditOpen(false)
        fetchAffiliates()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update affiliate', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleBalanceAdjust = async () => {
    if (!balanceAffiliate || !balanceAmount) return
    setSaving(true)
    try {
      const amount = parseFloat(balanceAmount)
      const field = balanceType === 'approved' ? 'approvedBalance' : 'paidBalance'
      const currentBalance = balanceType === 'approved' ? balanceAffiliate.approvedBalance : balanceAffiliate.paidBalance
      const newBalance = currentBalance + amount

      const res = await fetch(`/api/affiliates/${balanceAffiliate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newBalance }),
      })
      if (res.ok) {
        toast({
          title: 'Balance Adjusted',
          description: `${balanceType === 'approved' ? 'Approved' : 'Paid'} balance ${amount >= 0 ? 'increased' : 'decreased'} by $${Math.abs(amount).toFixed(2)}${balanceReason ? ` — ${balanceReason}` : ''}`,
        })
        setBalanceOpen(false)
        setBalanceAmount('')
        setBalanceReason('')
        fetchAffiliates()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to adjust balance', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (affiliate: Affiliate) => {
    try {
      const res = await fetch(`/api/affiliates/${affiliate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !affiliate.isActive }),
      })
      if (res.ok) {
        toast({
          title: affiliate.isActive ? 'Deactivated' : 'Activated',
          description: `${affiliate.name} has been ${affiliate.isActive ? 'deactivated' : 'activated'}`,
        })
        fetchAffiliates()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    }
  }

  const handleCreate = async () => {
    if (!createName || !createEmail || !createAffid) return
    setCreating(true)
    try {
      const res = await fetch('/api/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName, email: createEmail, phone: createPhone, affid: createAffid }),
      })
      if (res.ok) {
        toast({ title: 'Success', description: 'Affiliate created successfully' })
        setCreateOpen(false)
        setCreateName('')
        setCreateEmail('')
        setCreatePhone('')
        setCreateAffid('')
        fetchAffiliates()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create affiliate', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const formatCurrency = (amount: number) => `$${Math.round(amount).toLocaleString('en-US')}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Affiliate Management</h1>
          <p className="text-sm text-gray-500">Manage all affiliates and their accounts</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Affiliate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Affiliate</DialogTitle>
              <DialogDescription>Add a new affiliate to the program</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Affiliate ID</Label>
                <Input placeholder="e.g. MP-JOHN-006" value={createAffid} onChange={e => setCreateAffid(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="John Smith" value={createName} onChange={e => setCreateName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input placeholder="john@example.com" type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone (optional)</Label>
                <Input placeholder="+1 (555) 000-0000" value={createPhone} onChange={e => setCreatePhone(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={creating} className="bg-purple-600 hover:bg-purple-700">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Affiliate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="text-xs text-gray-500">Total Affiliates</div>
            <div className="text-xl font-bold text-gray-900">{affiliates.length}</div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="text-xs text-gray-500">Active</div>
            <div className="text-xl font-bold text-purple-600">{affiliates.filter(a => a.isActive).length}</div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="text-xs text-gray-500">Total Earnings</div>
            <div className="text-xl font-bold text-gray-900 truncate">{formatCurrency(affiliates.reduce((sum, a) => sum + a.totalEarnings, 0))}</div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="text-xs text-gray-500">Total Traffic</div>
            <div className="text-xl font-bold text-gray-900">{affiliates.reduce((sum, a) => sum + a.totalTraffic, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>AffID</TableHead>
                  <TableHead className="text-right">Traffic</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(affiliate => (
                  <TableRow key={affiliate.id}>
                    <TableCell className="font-medium">{affiliate.name}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{affiliate.email}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">{affiliate.affid}</code>
                    </TableCell>
                    <TableCell className="text-right">{affiliate.totalTraffic.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{affiliate.totalConversions}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(affiliate.totalEarnings)}</TableCell>
                    <TableCell className="text-right text-amber-600">{formatCurrency(affiliate.approvedBalance)}</TableCell>
                    <TableCell className="text-right text-gray-500">{formatCurrency(affiliate.paidBalance)}</TableCell>
                    <TableCell>
                      <Badge variant={affiliate.isActive ? 'default' : 'secondary'} className={affiliate.isActive ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : 'bg-gray-100 text-gray-500'}>
                        {affiliate.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(affiliate)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setBalanceAffiliate(affiliate); setBalanceOpen(true) }}>
                            <DollarSign className="w-4 h-4 mr-2" />
                            Adjust Balance
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-600">
                                <UserX className="w-4 h-4 mr-2" />
                                {affiliate.isActive ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{affiliate.isActive ? 'Deactivate' : 'Activate'} Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to {affiliate.isActive ? 'deactivate' : 'activate'} {affiliate.name}? {affiliate.isActive ? 'They will no longer be able to access the affiliate portal.' : 'They will regain access to the affiliate portal.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeactivate(affiliate)} className="bg-purple-600 hover:bg-purple-700">
                                  Confirm
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Affiliate Profile</DialogTitle>
            <DialogDescription>Update affiliate information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Dialog */}
      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Balance — {balanceAffiliate?.name}</DialogTitle>
            <DialogDescription>
              Current Approved: {balanceAffiliate ? formatCurrency(balanceAffiliate.approvedBalance) : '$0.00'} | 
              Current Paid: {balanceAffiliate ? formatCurrency(balanceAffiliate.paidBalance) : '$0.00'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Balance Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={balanceType === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBalanceType('approved')}
                  className={balanceType === 'approved' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  Approved Balance
                </Button>
                <Button
                  type="button"
                  variant={balanceType === 'paid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBalanceType('paid')}
                  className={balanceType === 'paid' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  Paid Balance
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount (+/-)</Label>
              <Input
                type="number"
                placeholder="e.g. 100 or -50"
                value={balanceAmount}
                onChange={e => setBalanceAmount(e.target.value)}
              />
              <p className="text-xs text-gray-500">Use positive values to add, negative to subtract</p>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g. Bonus for Q1 performance"
                value={balanceReason}
                onChange={e => setBalanceReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleBalanceAdjust} disabled={saving || !balanceAmount} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
