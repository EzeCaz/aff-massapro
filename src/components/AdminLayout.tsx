'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Users, Link2, CreditCard, ArrowLeft, Sparkles } from 'lucide-react'
import AffiliateManagementTable from './AffiliateManagementTable'
import LinkGeneratorTool from './LinkGeneratorTool'
import PayoutProcessingEngine from './PayoutProcessingEngine'
import { motion } from 'framer-motion'

const navItems = [
  { id: 'affiliates' as const, label: 'Affiliates', icon: Users },
  { id: 'link-generator' as const, label: 'Link Generator', icon: Link2 },
  { id: 'payouts' as const, label: 'Payouts', icon: CreditCard },
]

export default function AdminLayout() {
  const { adminTab, setAdminTab, setView } = useAppStore()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm">MassaPro</h2>
              <p className="text-xs text-gray-400">Manager Dashboard</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = adminTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setAdminTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <Button
            variant="ghost"
            className="w-full text-gray-400 hover:text-white hover:bg-gray-800 justify-start"
            onClick={() => setView('landing')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left:0 right-0 z-50 bg-gray-900 text-white border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">Manager</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
            onClick={() => setView('landing')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex border-t border-gray-800">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = adminTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setAdminTab(item.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-all ${
                  isActive ? 'text-purple-400 bg-gray-800' : 'text-gray-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:mt-0 mt-24">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <motion.div
            key={adminTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {adminTab === 'affiliates' && <AffiliateManagementTable />}
            {adminTab === 'link-generator' && <LinkGeneratorTool />}
            {adminTab === 'payouts' && <PayoutProcessingEngine />}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
