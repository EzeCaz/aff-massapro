'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Loader2, CheckCircle2, XCircle, Clock, Plus, KeyRound } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Affiliate {
  id: string
  affid: string
  name: string
  email: string
  phone: string | null
  company: string | null
  isActive: boolean
  isApproved: boolean
  commissionType: string
  customSignupComm: number | null
  customEnterprise: number | null
  customProfess: number | null
  customBasic: number | null
  notes: string | null
  totalTraffic: number
  totalConversions: number
  totalEarnings: number
  approvedBalance: number
  paidBalance: number
  _count: { clicks: number; referrals: number; payouts: number }
}

interface Application {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  website: string | null
  message: string | null
  status: string
  reviewedAt: string | null
  reviewNotes: string | null
  generatedAffid: string | null
  createdAt: string
}

export default function AffiliateManagementTable() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null)
  const [commissionType, setCommissionType] = useState('standard')
  const [customSignup, setCustomSignup] = useState('')
  const [customEnterprise, setCustomEnterprise] = useState('')
  const [customProfess, setCustomProfess] = useState('')
  const [customBasic, setCustomBasic] = useState('')
  const [resetPwdDialogOpen, setResetPwdDialogOpen] = useState(false)
  const [resetPwdAffiliate, setResetPwdAffiliate] = useState<Affiliate | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPwd, setResettingPwd] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      const [affRes, appRes] = await Promise.all([
        fetch('/api/affiliates'),
        fetch('/api/applications'),
      ])
      const affData = await affRes.json()
      const appData = await appRes.json()
      setAffiliates(affData)
      setApplications(appData)
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleApproveApplication = async (appId: string) => {
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({
          title: 'Application Approved',
          description: `Created affiliate ${data.generatedAffid}`,
        })
        fetchData()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to approve application', variant: 'destructive' })
    }
  }

  const handleRejectApplication = async (appId: string) => {
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', reviewNotes: 'Rejected by admin' }),
      })
      if (res.ok) {
        toast({ title: 'Application Rejected' })
        fetchData()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to reject application', variant: 'destructive' })
    }
  }

  const handleSaveCommission = async () => {
    if (!editingAffiliate) return
    try {
      const body: Record<string, unknown> = { commissionType }
      if (commissionType === 'custom') {
        body.customSignupComm = customSignup ? parseFloat(customSignup) : null
        body.customEnterprise = customEnterprise ? parseFloat(customEnterprise) : null
        body.customProfess = customProfess ? parseFloat(customProfess) : null
        body.customBasic = customBasic ? parseFloat(customBasic) : null
      }
      const res = await fetch(`/api/affiliates/${editingAffiliate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: 'Commission structure updated' })
        setEditDialogOpen(false)
        fetchData()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update commission', variant: 'destructive' })
    }
  }

  const handleApproveAffiliate = async (affId: string) => {
    try {
      const res = await fetch(`/api/affiliates/${affId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: true, isActive: true }),
      })
      if (res.ok) {
        toast({ title: 'Affiliate approved and activated' })
        fetchData()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to approve affiliate', variant: 'destructive' })
    }
  }

  const handleToggleActive = async (affId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/affiliates/${affId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })
      if (res.ok) {
        toast({ title: `Affiliate ${!currentActive ? 'activated' : 'deactivated'}` })
        fetchData()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update affiliate', variant: 'destructive' })
    }
  }

  const handleResetPassword = async () => {
    if (!resetPwdAffiliate || !newPassword || newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' })
      return
    }
    setResettingPwd(true)
    try {
      const res = await fetch(`/api/affiliates/${resetPwdAffiliate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      if (res.ok) {
        toast({ title: 'Password Reset', description: `Password updated for ${resetPwdAffiliate.name}` })
        setResetPwdDialogOpen(false)
        setNewPassword('')
        setResetPwdAffiliate(null)
      } else {
        toast({ title: 'Error', description: 'Failed to reset password', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to reset password', variant: 'destructive' })
    } finally {
      setResettingPwd(false)
    }
  }

  const formatCurrency = (amount: number) => `$${Math.round(amount).toLocaleString('en-US')}`

  const commissionBadge = (type: string) => {
    switch (type) {
      case 'premium':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Premium</Badge>
      case 'custom':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Custom</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">Standard</Badge>
    }
  }

  const pendingApps = applications.filter(a => a.status === 'pending')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Management</h1>
        <p className="text-sm text-gray-500">Manage affiliates, applications, and commission structures</p>
      </div>

      {/* Pending Applications */}
      {pendingApps.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Applications ({pendingApps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Company</TableHead>
                  <TableHead className="hidden md:table-cell">Message</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApps.map(app => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell className="text-sm">{app.email}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-gray-500">{app.company || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500 max-w-xs truncate">{app.message || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-300 text-green-600 hover:bg-green-50 h-8 text-xs"
                          onClick={() => handleApproveApplication(app.id)}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50 h-8 text-xs"
                          onClick={() => handleRejectApplication(app.id)}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Affiliates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Affiliates ({affiliates.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map(aff => (
                  <TableRow key={aff.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{aff.name}</div>
                        <div className="text-xs text-gray-500">{aff.affid} · {aff.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{commissionBadge(aff.commissionType)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {aff.isApproved ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Approved</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs">Pending</Badge>
                        )}
                        {aff.isActive ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-xs">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(aff.totalEarnings)}</TableCell>
                    <TableCell className="text-right font-medium text-purple-700">{formatCurrency(aff.approvedBalance)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingAffiliate(aff)
                              setCommissionType(aff.commissionType)
                              setCustomSignup(aff.customSignupComm?.toString() || '')
                              setCustomEnterprise(aff.customEnterprise?.toString() || '')
                              setCustomProfess(aff.customProfess?.toString() || '')
                              setCustomBasic(aff.customBasic?.toString() || '')
                              setEditDialogOpen(true)
                            }}
                          >
                            Edit Commission
                          </DropdownMenuItem>
                          {!aff.isApproved && (
                            <DropdownMenuItem onClick={() => handleApproveAffiliate(aff.id)}>
                              Approve Affiliate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleToggleActive(aff.id, aff.isActive)}>
                            {aff.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setResetPwdAffiliate(aff)
                              setNewPassword('')
                              setResetPwdDialogOpen(true)
                            }}
                          >
                            <KeyRound className="w-4 h-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
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

      {/* Edit Commission Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Commission Structure</DialogTitle>
            <DialogDescription>
              {editingAffiliate?.name} ({editingAffiliate?.affid})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Commission Type</Label>
              <Select value={commissionType} onValueChange={setCommissionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard ($100 signup, $10-100/mo)</SelectItem>
                  <SelectItem value="premium">Premium ($150 signup, $10-100/mo)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {commissionType === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Signup Commission ($)</Label>
                  <Input
                    type="number"
                    value={customSignup}
                    onChange={e => setCustomSignup(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Enterprise Monthly ($)</Label>
                  <Input
                    type="number"
                    value={customEnterprise}
                    onChange={e => setCustomEnterprise(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Professional Monthly ($)</Label>
                  <Input
                    type="number"
                    value={customProfess}
                    onChange={e => setCustomProfess(e.target.value)}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Basic Monthly ($)</Label>
                  <Input
                    type="number"
                    value={customBasic}
                    onChange={e => setCustomBasic(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSaveCommission}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwdDialogOpen} onOpenChange={setResetPwdDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Affiliate Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPwdAffiliate?.name} ({resetPwdAffiliate?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                minLength={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetPwdDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={handleResetPassword}
                disabled={resettingPwd || newPassword.length < 6}
              >
                {resettingPwd ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Reset Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
