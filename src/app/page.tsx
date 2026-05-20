'use client'

import { useAppStore } from '@/lib/store'
import LandingPage from '@/components/LandingPage'
import AdminLayout from '@/components/AdminLayout'
import AffiliateLayout from '@/components/AffiliateLayout'
import AffiliateRegistration from '@/components/AffiliateRegistration'
import AffiliateLogin from '@/components/AffiliateLogin'
import AdminLogin from '@/components/AdminLogin'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function Home() {
  const { currentView, adminUser, setView, setAdminUser, setAuthenticatedAffiliateId } = useAppStore()
  const [sessionVerified, setSessionVerified] = useState(false)

  // On mount, validate the server-side session cookie
  // and restore or clear the client-side Zustand state accordingly
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          if (data.type === 'admin') {
            setAdminUser(data.user)
            setView('admin')
          } else if (data.type === 'affiliate') {
            setAuthenticatedAffiliateId(data.user.id)
            setView('affiliate')
          }
        } else {
          // Session cookie is invalid/expired — clear any stale persisted state
          const state = useAppStore.getState()
          if (state.adminUser) {
            useAppStore.setState({ adminUser: null })
          }
          if (state.authenticatedAffiliateId) {
            useAppStore.setState({ authenticatedAffiliateId: null })
          }
          setView('landing')
        }
      })
      .catch(() => {
        // Network error — stay on whatever view was persisted
      })
      .finally(() => setSessionVerified(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading screen while session is being validated
  if (!sessionVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Loading MassaPro...</p>
        </div>
      </div>
    )
  }

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
        {currentView === 'admin-login' && <AdminLogin />}
        {currentView === 'admin' && (
          adminUser ? <AdminLayout /> : <AdminLogin />
        )}
        {currentView === 'affiliate' && <AffiliateLayout />}
        {currentView === 'register' && <AffiliateRegistration />}
        {currentView === 'login' && <AffiliateLogin />}
      </motion.div>
    </AnimatePresence>
  )
}
