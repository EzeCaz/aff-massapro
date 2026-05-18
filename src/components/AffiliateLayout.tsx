'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sparkles, LogOut, User } from 'lucide-react'
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
  phone: string | null
  company: string | null
  commissionType: string
  totalTraffic: number
  totalConversions: number
  totalEarnings: number
  approvedBalance: number
  paidBalance: number
}

export default function AffiliateLayout() {
  const { authenticatedAffiliateId, setView, logout } = useAppStore()
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authenticatedAffiliateId) {
      setView('login')
      return
    }
    fetch(`/api/affiliates/${authenticatedAffiliateId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then(data => {
        setAffiliate(data)
        setLoading(false)
      })
      .catch(() => {
        setView('login')
      })
  }, [authenticatedAffiliateId, setView])

  if (loading || !affiliate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-purple-600">Loading...</div>
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    setView('landing')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50/30 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-purple-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">MassaPro</h1>
              <p className="text-xs text-purple-500">AI Secretary — Affiliate Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <code className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">{affiliate.affid}</code>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">{affiliate.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-sm text-gray-500">
                  {affiliate.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      <footer className="border-t border-purple-100 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-purple-400">
          © 2025 MassaPro — AI Agentic Receptionist & Secretary Services. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
