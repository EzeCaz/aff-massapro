'use client'

import { useAppStore } from '@/lib/store'
import LandingPage from '@/components/LandingPage'
import AdminLayout from '@/components/AdminLayout'
import AffiliateLayout from '@/components/AffiliateLayout'
import { AnimatePresence, motion } from 'framer-motion'

export default function Home() {
  const { currentView } = useAppStore()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {currentView === 'landing' && <LandingPage />}
        {currentView === 'admin' && <AdminLayout />}
        {currentView === 'affiliate' && <AffiliateLayout />}
      </motion.div>
    </AnimatePresence>
  )
}
