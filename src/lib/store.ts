import { create } from 'zustand'

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

export const useAppStore = create<AppState>((set) => ({
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
  logout: () => set({ authenticatedAffiliateId: null, currentView: 'landing' }),
  adminLogout: () => set({ adminUser: null, currentView: 'landing' }),
}))
