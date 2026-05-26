'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, Download, Filter, Check, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

const LEAD_STATUSES = ['Lead', 'Attendee', 'Test', 'Lost', 'Won'] as const
type LeadStatus = typeof LEAD_STATUSES[number]

interface Referral {
  id: string
  affiliateId: string
  affid: string
  leadName: string
  leadEmail: string | null
  leadPhone: string | null
  leadCompany: string | null
  planType: string
  leadStatus: string
  signupCommission: number
  monthlyCommission: number
  monthsActive: number
  totalCommission: number
  ftUtmSource: string | null
  ftUtmMedium: string | null
  ftUtmCampaign: string | null
  ftUtmContent: string | null
  ftUtmTerm: string | null
  ltUtmSource: string | null
  ltUtmMedium: string | null
  ltUtmCampaign: string | null
  ltUtmContent: string | null
  ltUtmTerm: string | null
  createdAt: string
  updatedAt: string
  affiliate: { name: string; affid: string; email: string }
}

export default function LeadManagement() {
  const { toast } = useToast()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [affidFilter, setAffidFilter] = useState('all')
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [sheetStatus, setSheetStatus] = useState<string>('')

  const fetchReferrals = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (planFilter !== 'all') params.set('planType', planFilter)
      const res = await fetch(`/api/referrals?${params.toString()}`)
      const data = await res.json()
      setReferrals(data)
    } catch {
      console.error('Failed to fetch referrals')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, planFilter])

  useEffect(() => {
    fetchReferrals()
  }, [fetchReferrals])

  // Get unique affids for filter
  const uniqueAffids = [...new Set(referrals.map(r => r.affid))]

  const filtered = referrals.filter(r => {
    const matchesSearch =
      r.leadName.toLowerCase().includes(search.toLowerCase()) ||
      (r.leadEmail && r.leadEmail.toLowerCase().includes(search.toLowerCase())) ||
      r.affid.toLowerCase().includes(search.toLowerCase()) ||
      (r.leadCompany && r.leadCompany.toLowerCase().includes(search.toLowerCase()))
    const matchesAffid = affidFilter === 'all' || r.affid === affidFilter
    return matchesSearch && matchesAffid
  })

  const handleStatusChange = async (referralId: string, newStatus: string) => {
    setUpdatingStatus(referralId)
    try {
      const res = await fetch(`/api/referrals/${referralId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadStatus: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update status')
      }
      const data = await res.json()

      // Update local state
      setReferrals(prev => prev.map(r =>
        r.id === referralId
          ? { ...r, leadStatus: newStatus, updatedAt: data.referral?.updatedAt || new Date().toISOString() }
          : r
      ))

      // Update sheet if this referral is selected
      if (selectedReferral?.id === referralId) {
        setSelectedReferral(prev => prev ? { ...prev, leadStatus: newStatus, updatedAt: data.referral?.updatedAt || new Date().toISOString() } : prev)
        setSheetStatus(newStatus)
      }

      toast({
        title: 'Status updated',
        description: `Lead status changed to ${newStatus}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Lead':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">{status}</Badge>
      case 'Attendee':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">{status}</Badge>
      case 'Test':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">{status}</Badge>
      case 'Won':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">{status}</Badge>
      case 'Lost':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">{status}</Badge>
      // Legacy statuses (for backwards compatibility with existing data)
      case 'Booked Call':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">{status}</Badge>
      case 'Paying Customer':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">{status}</Badge>
      case 'Churned':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">{status}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const planBadge = (plan: string) => {
    switch (plan) {
      case 'Enterprise':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">{plan}</Badge>
      case 'Professional':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{plan}</Badge>
      case 'Basic':
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">{plan}</Badge>
      default:
        return <Badge variant="secondary">{plan}</Badge>
    }
  }

  const formatCurrency = (amount: number) => `$${Math.round(amount).toLocaleString('en-US')}`

  const handleExportCSV = () => {
    const headers = ['Date', 'Name', 'Email', 'Phone', 'Company', 'Status', 'Plan', 'Affiliate', 'Total Commission', 'FT Source', 'FT Campaign', 'LT Source', 'LT Campaign']
    const rows = filtered.map(r => [
      format(new Date(r.createdAt), 'yyyy-MM-dd'),
      r.leadName,
      r.leadEmail || '',
      r.leadPhone || '',
      r.leadCompany || '',
      r.leadStatus,
      r.planType,
      r.affid,
      r.totalCommission,
      r.ftUtmSource || '',
      r.ftUtmCampaign || '',
      r.ltUtmSource || '',
      r.ltUtmCampaign || '',
    ])
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const UTMRow = ({ label, source, medium, campaign, content, term }: {
    label: string
    source: string | null
    medium: string | null
    campaign: string | null
    content: string | null
    term: string | null
  }) => (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-purple-700">{label}</h4>
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Source', value: source },
          { label: 'Medium', value: medium },
          { label: 'Campaign', value: campaign },
          { label: 'Content', value: content },
          { label: 'Term', value: term },
        ].map(utm => (
          <div key={utm.label}>
            <div className="text-xs text-gray-400">{utm.label}</div>
            <code className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded block truncate">
              {utm.value || '—'}
            </code>
          </div>
        ))}
      </div>
    </div>
  )

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
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-sm text-gray-500">Manage leads, update status, and view attribution data</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} className="border-purple-300 text-purple-600 hover:bg-purple-50">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Lead">Lead</SelectItem>
            <SelectItem value="Attendee">Attendee</SelectItem>
            <SelectItem value="Test">Test</SelectItem>
            <SelectItem value="Won">Won</SelectItem>
            <SelectItem value="Lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="Enterprise">Enterprise</SelectItem>
            <SelectItem value="Professional">Professional</SelectItem>
            <SelectItem value="Basic">Basic</SelectItem>
          </SelectContent>
        </Select>
        <Select value={affidFilter} onValueChange={setAffidFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Affiliate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Affiliates</SelectItem>
            {uniqueAffids.map(affid => (
              <SelectItem key={affid} value={affid}>{affid}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Lead Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="hidden sm:table-cell">Affiliate</TableHead>
                  <TableHead className="text-right">Comm.</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                      No leads found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(ref => (
                    <TableRow
                      key={ref.id}
                      className="cursor-pointer hover:bg-purple-50/50"
                      onClick={() => { setSelectedReferral(ref); setSheetStatus(ref.leadStatus); setSheetOpen(true) }}
                    >
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {format(new Date(ref.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{ref.leadName}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500">{ref.leadEmail || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-500">{ref.leadCompany || '—'}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Select
                          value={ref.leadStatus}
                          onValueChange={(newStatus) => handleStatusChange(ref.id, newStatus)}
                          disabled={updatingStatus === ref.id}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs border-0 p-0 gap-0 hover:bg-transparent focus:ring-0 shadow-none">
                            {updatingStatus === ref.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                            ) : (
                              statusBadge(ref.leadStatus)
                            )}
                            <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
                          </SelectTrigger>
                          <SelectContent>
                            {LEAD_STATUSES.map(s => (
                              <SelectItem key={s} value={s}>
                                <span className="flex items-center gap-2">
                                  {statusBadge(s)}
                                  {s === ref.leadStatus && <Check className="w-3 h-3 text-green-600" />}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{planBadge(ref.planType)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <code className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{ref.affid}</code>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(ref.totalCommission)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Filter className="w-3 h-3 text-gray-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Lead Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedReferral && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedReferral.leadName}</SheetTitle>
                <SheetDescription>
                  Lead details and attribution data
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Contact Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-400">Email</div>
                      <div className="text-sm">{selectedReferral.leadEmail || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Phone</div>
                      <div className="text-sm">{selectedReferral.leadPhone || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Company</div>
                      <div className="text-sm">{selectedReferral.leadCompany || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Affiliate</div>
                      <code className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        {selectedReferral.affid}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Status & Plan — with editable status */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Status & Plan</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 mb-1">Lead Status</div>
                      <Select
                        value={sheetStatus}
                        onValueChange={(newStatus) => handleStatusChange(selectedReferral.id, newStatus)}
                        disabled={updatingStatus === selectedReferral.id}
                      >
                        <SelectTrigger className="h-9 w-full">
                          {updatingStatus === selectedReferral.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map(s => (
                            <SelectItem key={s} value={s}>
                              {s === sheetStatus ? `✓ ${s}` : s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Plan</div>
                      {planBadge(selectedReferral.planType)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div>
                      <div className="text-xs text-gray-400">Signup Comm.</div>
                      <div className="text-sm font-medium">{formatCurrency(selectedReferral.signupCommission)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Monthly Comm.</div>
                      <div className="text-sm font-medium">{formatCurrency(selectedReferral.monthlyCommission)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Total Comm.</div>
                      <div className="text-sm font-bold text-purple-700">{formatCurrency(selectedReferral.totalCommission)}</div>
                    </div>
                  </div>
                </div>

                {/* First-Touch UTMs */}
                <UTMRow
                  label="First-Touch Attribution"
                  source={selectedReferral.ftUtmSource}
                  medium={selectedReferral.ftUtmMedium}
                  campaign={selectedReferral.ftUtmCampaign}
                  content={selectedReferral.ftUtmContent}
                  term={selectedReferral.ftUtmTerm}
                />

                {/* Last-Touch UTMs */}
                <UTMRow
                  label="Last-Touch Attribution"
                  source={selectedReferral.ltUtmSource}
                  medium={selectedReferral.ltUtmMedium}
                  campaign={selectedReferral.ltUtmCampaign}
                  content={selectedReferral.ltUtmContent}
                  term={selectedReferral.ltUtmTerm}
                />

                {/* Dates */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">Timeline</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-400">Created</div>
                      <div className="text-sm">{format(new Date(selectedReferral.createdAt), 'MMM d, yyyy h:mm a')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Updated</div>
                      <div className="text-sm">{format(new Date(selectedReferral.updatedAt), 'MMM d, yyyy h:mm a')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
