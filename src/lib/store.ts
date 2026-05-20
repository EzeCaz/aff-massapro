import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type View = 'landing' | 'admin' | 'affiliate' | 'register' | 'login' | 'admin-login'
type AdminTab = 'analytics' | 'leads' | 'affiliates' | 'link-generator' | 'payouts' | 'integration' | 'admins'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
}

interface AppState {
  currentView: View
  adminTab: AdminTab
  selectedAffiliateId: string | null
  authenticatedAffiliateId: string | null
  adminUser: AdminUser | null
  setView: (view: View) => void
  setAdminTab: (tab: AdminTab) => void
  setSelectedAffiliateId: (id: string | null) => void
  setAuthenticatedAffiliateId: (id: string | null) => void
  setAdminUser: (admin: AdminUser | null) => void
  logout: () => void
  adminLogout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: 'landing',
      adminTab: 'analytics',
      selectedAffiliateId: null,
      authenticatedAffiliateId: null,
      adminUser: null,
      setView: (view) => set({ currentView: view }),
      setAdminTab: (tab) => set({ adminTab: tab }),
      setSelectedAffiliateId: (id) => set({ selectedAffiliateId: id }),
      setAuthenticatedAffiliateId: (id) => set({ authenticatedAffiliateId: id }),
      setAdminUser: (admin) => set({ adminUser: admin }),
      logout: () => {
        set({ authenticatedAffiliateId: null, currentView: 'landing' })
        // Clear server-side session cookie
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      },
      adminLogout: () => {
        set({ adminUser: null, currentView: 'landing' })
        // Clear server-side session cookie
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      },
    }),
    {
      name: 'massapro-auth',
      // Only persist auth-related state, not transient UI state like adminTab
      partialize: (state) => ({
        currentView: state.currentView,
        adminUser: state.adminUser,
        authenticatedAffiliateId: state.authenticatedAffiliateId,
      }),
    }
  )
)
