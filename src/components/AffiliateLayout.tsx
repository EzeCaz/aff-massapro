'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import AffiliateWelcomeHeader from './AffiliateWelcomeHeader'
import FinancialSnapshotCards from './FinancialSnapshotCards'
import AnalyticsCanvas from './AnalyticsCanvas'
import MyReferralsDataTable from './MyReferralsDataTable'
import { useState, useEffect } from 'react'

interface Affiliate {
  id: string
  affid: string
  name: string
  email: string
  totalTraffic: number
  totalConversions: number
  totalEarnings: number
  approvedBalance: number
  paidBalance: number
}

export default function AffiliateLayout() {
  const { selectedAffiliateId, setView } = useAppStore()
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedAffiliateId) {
      setView('landing')
      return
    }
    fetch(`/api/affiliates/${selectedAffiliateId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then(data => {
        setAffiliate(data)
        setLoading(false)
      })
      .catch(() => {
        setView('landing')
      })
  }, [selectedAffiliateId, setView])

  if (loading || !affiliate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-emerald-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('landing')}
              className="text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">MassaPro</h1>
                <p className="text-xs text-gray-500">Affiliate Portal</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-gray-500">{affiliate.name}</span>
            <code className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">{affiliate.affid}</code>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        <AffiliateWelcomeHeader affiliate={affiliate} />
        <FinancialSnapshotCards affiliate={affiliate} />
        <AnalyticsCanvas affid={affiliate.affid} />
        <MyReferralsDataTable affid={affiliate.affid} />
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-500">
          © 2025 MassaPro Affiliate System. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
