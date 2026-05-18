'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreditCard, Loader2, CheckCircle2, Clock, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface Payout {
  id: string
  affid: string
  amount: number
  status: string
  periodStart: string
  periodEnd: string
  processedAt: string | null
  createdAt: string
  affiliate: {
    name: string
    affid: string
    email: string
  }
}

export default function PayoutProcessingEngine() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  const fetchPayouts = useCallback(async () => {
    try {
      const url = statusFilter !== 'all' ? `/api/payouts?status=${statusFilter}` : '/api/payouts'
      const res = await fetch(url)
      const data = await res.json()
      setPayouts(data)
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch payouts', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => {
    fetchPayouts()
  }, [fetchPayouts])

  const pendingPayouts = payouts.filter(p => p.status === 'pending')
  const approvedPayouts = payouts.filter(p => p.status === 'approved')
  const processedPayouts = payouts.filter(p => p.status === 'processed')

  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amount, 0)
  const totalApproved = approvedPayouts.reduce((sum, p) => sum + p.amount, 0)
  const totalProcessed = processedPayouts.reduce((sum, p) => sum + p.amount, 0)

  const filteredPayouts = statusFilter === 'all' ? payouts : payouts.filter(p => p.status === statusFilter)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPayouts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredPayouts.map(p => p.id)))
    }
  }

  const handleApprove = async () => {
    if (selectedIds.size === 0) return
    setProcessing(true)
    try {
      const ids = Array.from(selectedIds).filter(id => {
        const payout = payouts.find(p => p.id === id)
        return payout?.status === 'pending'
      })
      if (ids.length === 0) {
        toast({ title: 'No eligible payouts', description: 'Only pending payouts can be approved', variant: 'destructive' })
        setProcessing(false)
        return
      }
      const res = await fetch('/api/payouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutIds: ids, status: 'approved' }),
      })
      if (res.ok) {
        toast({ title: 'Payouts Approved', description: `${ids.length} payout(s) approved` })
        setSelectedIds(new Set())
        fetchPayouts()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to approve payouts', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleProcess = async () => {
    if (selectedIds.size === 0) return
    setProcessing(true)
    try {
      const ids = Array.from(selectedIds).filter(id => {
        const payout = payouts.find(p => p.id === id)
        return payout?.status === 'approved'
      })
      if (ids.length === 0) {
        toast({ title: 'No eligible payouts', description: 'Only approved payouts can be processed', variant: 'destructive' })
        setProcessing(false)
        return
      }
      const res = await fetch('/api/payouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutIds: ids, status: 'processed' }),
      })
      if (res.ok) {
        toast({ title: 'Payments Processed', description: `${ids.length} payout(s) processed` })
        setSelectedIds(new Set())
        fetchPayouts()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to process payouts', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => `$${Math.round(amount).toLocaleString('en-US')}`

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>
      case 'processed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><DollarSign className="w-3 h-3 mr-1" />Processed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Payout Processing</h1>
        <p className="text-sm text-gray-500">Manage and process affiliate payouts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Pending</div>
              <div className="text-xl font-bold text-amber-600">{formatCurrency(totalPending)}</div>
              <div className="text-xs text-gray-400">{pendingPayouts.length} payout(s)</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Approved</div>
              <div className="text-xl font-bold text-purple-600">{formatCurrency(totalApproved)}</div>
              <div className="text-xs text-gray-400">{approvedPayouts.length} payout(s)</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Processed</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(totalProcessed)}</div>
              <div className="text-xs text-gray-400">{processedPayouts.length} payout(s)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
            </SelectContent>
          </Select>
          {selectedIds.size > 0 && (
            <span className="text-sm text-purple-600">{selectedIds.size} selected</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleApprove}
            disabled={processing || selectedIds.size === 0}
            variant="outline"
            className="border-purple-300 text-purple-600 hover:bg-purple-50"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve Selected
          </Button>
          <Button
            onClick={handleProcess}
            disabled={processing || selectedIds.size === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
            Process Payment
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredPayouts.length > 0 && selectedIds.size === filteredPayouts.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>AffID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                      No payouts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayouts.map(payout => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(payout.id)}
                          onCheckedChange={() => toggleSelect(payout.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{payout.affiliate.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">{payout.affid}</code>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(payout.amount)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(payout.periodStart), 'MMM d')} - {format(new Date(payout.periodEnd), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{statusBadge(payout.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(payout.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
