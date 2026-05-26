'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Trophy } from 'lucide-react'
import { format } from 'date-fns'

interface Referral {
  id: string
  leadName: string
  leadEmail: string | null
  planType: string
  leadStatus: string
  monthlyCommission: number
  totalCommission: number
  monthsActive: number
  ltUtmCampaign: string | null
  ltUtmContent: string | null
  createdAt: string
}

interface UTMPerformance {
  campaign: string
  total: number
  conversions: number
  conversionRate: number
}

export default function MyReferralsDataTable({ affid }: { affid: string }) {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [utmPerformance, setUtmPerformance] = useState<UTMPerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/referrals?affid=${affid}`).then(r => r.json()),
      fetch(`/api/stats?affid=${affid}`).then(r => r.json()),
    ])
      .then(([refData, statsData]) => {
        setReferrals(refData)
        setUtmPerformance(statsData.utmPerformance || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [affid])

  const obfuscateName = (name: string) => {
    const parts = name.split(' ')
    if (parts.length < 2) return name
    return `${parts[0]} ${parts[parts.length - 1][0]}.`
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Lead':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{status}</Badge>
      case 'Attendee':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{status}</Badge>
      case 'Test':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">{status}</Badge>
      case 'Won':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{status}</Badge>
      case 'Lost':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{status}</Badge>
      // Legacy statuses
      case 'Booked Call':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{status}</Badge>
      case 'Paying Customer':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{status}</Badge>
      case 'Churned':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{status}</Badge>
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

  const formatCurrency = (amount: number) =>
    `$${Math.round(amount).toLocaleString('en-US')}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Referrals Table */}
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="text-base">My Referrals</CardTitle>
          <CardDescription>All leads and conversions from your referral links</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Plan Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Monthly Comm.</TableHead>
                  <TableHead className="text-right">Total Comm.</TableHead>
                  <TableHead>Campaign</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                      No referrals yet
                    </TableCell>
                  </TableRow>
                ) : (
                  referrals.map(ref => (
                    <TableRow key={ref.id}>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(ref.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{obfuscateName(ref.leadName)}</TableCell>
                      <TableCell>{planBadge(ref.planType)}</TableCell>
                      <TableCell>{statusBadge(ref.leadStatus)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(ref.monthlyCommission)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(ref.totalCommission)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        <code className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                          {ref.ltUtmCampaign || '—'}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* UTM Breakdown */}
      {utmPerformance.length > 0 && (
        <Card className="border-purple-100">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-500" />
              Campaign Performance Breakdown
            </CardTitle>
            <CardDescription>Conversion rates by UTM campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {utmPerformance
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .map(campaign => (
                  <div
                    key={campaign.campaign}
                    className={`p-4 rounded-lg border ${
                      campaign.conversionRate >= 50
                        ? 'border-purple-200 bg-purple-50'
                        : campaign.conversionRate >= 25
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm font-medium text-purple-800">{campaign.campaign}</code>
                      {campaign.conversionRate >= 50 && (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">
                          Top
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{campaign.total} leads</span>
                      <span className="font-medium text-purple-700">{campaign.conversions} conversions</span>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-white rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            campaign.conversionRate >= 50
                              ? 'bg-purple-500'
                              : campaign.conversionRate >= 25
                              ? 'bg-amber-500'
                              : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.min(campaign.conversionRate, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-right mt-1 text-gray-500">
                        {campaign.conversionRate}% conversion
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
