'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

interface LedgerEntry {
  id: string
  affiliateId: string
  affid: string
  referralId: string
  type: string
  amount: number
  description: string | null
  monthNumber: number | null
  createdAt: string
  affiliate: { name: string; affid: string; email: string }
  referral: { leadName: string; leadEmail: string | null; planType: string; leadStatus: string }
}

export default function CommissionLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [affidFilter, setAffidFilter] = useState('all')
  const { toast } = useToast()

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (affidFilter !== 'all') params.set('affid', affidFilter)
      const res = await fetch(`/api/commissions?${params.toString()}`)
      const data = await res.json()
      setEntries(data)
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch commission ledger', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [typeFilter, affidFilter, toast])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const formatCurrency = (amount: number) => `$${Math.round(amount).toLocaleString('en-US')}`

  const totalEarned = entries.reduce((sum, e) => sum + e.amount, 0)
  const signupTotal = entries.filter(e => e.type === 'signup').reduce((sum, e) => sum + e.amount, 0)
  const recurringTotal = entries.filter(e => e.type === 'recurring').reduce((sum, e) => sum + e.amount, 0)
  const adjustmentTotal = entries.filter(e => e.type === 'adjustment').reduce((sum, e) => sum + e.amount, 0)

  const uniqueAffids = [...new Set(entries.map(e => e.affid))]

  const typeBadge = (type: string) => {
    switch (type) {
      case 'signup':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Signup</Badge>
      case 'recurring':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Recurring</Badge>
      case 'adjustment':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Adjustment</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
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
        <h1 className="text-2xl font-bold text-gray-900">Commission Ledger</h1>
        <p className="text-sm text-gray-500">Detailed record of all commission events</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <div className="text-xs text-gray-500">Total Earned</div>
            </div>
            <div className="text-xl font-bold text-purple-700">{formatCurrency(totalEarned)}</div>
          </CardContent>
        </Card>
        <Card className="border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <div className="text-xs text-gray-500">Signup Commissions</div>
            </div>
            <div className="text-xl font-bold text-green-700">{formatCurrency(signupTotal)}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <div className="text-xs text-gray-500">Recurring Commissions</div>
            </div>
            <div className="text-xl font-bold text-amber-700">{formatCurrency(recurringTotal)}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-slate-600" />
              <div className="text-xs text-gray-500">Adjustments</div>
            </div>
            <div className="text-xl font-bold text-slate-700">{formatCurrency(adjustmentTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="signup">Signup</SelectItem>
            <SelectItem value="recurring">Recurring</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
          </SelectContent>
        </Select>
        <Select value={affidFilter} onValueChange={setAffidFilter}>
          <SelectTrigger className="w-48">
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

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Referral</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="hidden sm:table-cell">Month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                      No commission entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{typeBadge(entry.type)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{entry.affid}</code>
                      </TableCell>
                      <TableCell className="text-sm">{entry.referral.leadName}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500 max-w-xs truncate">
                        {entry.description || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                        {entry.monthNumber ? `Month ${entry.monthNumber}` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-purple-700">
                        {formatCurrency(entry.amount)}
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
