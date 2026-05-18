import { create } from 'zustand'

type View = 'landing' | 'admin' | 'affiliate' | 'register' | 'login'
type AdminTab = 'analytics' | 'leads' | 'affiliates' | 'link-generator' | 'payouts' | 'integration'

interface AppState {
  currentView: View
  adminTab: AdminTab
  selectedAffiliateId: string | null
  authenticatedAffiliateId: string | null
  setView: (view: View) => void
  setAdminTab: (tab: AdminTab) => void
  setSelectedAffiliateId: (id: string | null) => void
  setAuthenticatedAffiliateId: (id: string | null) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'landing',
  adminTab: 'analytics',
  selectedAffiliateId: null,
  authenticatedAffiliateId: null,
  setView: (view) => set({ currentView: view }),
  setAdminTab: (tab) => set({ adminTab: tab }),
  setSelectedAffiliateId: (id) => set({ selectedAffiliateId: id }),
  setAuthenticatedAffiliateId: (id) => set({ authenticatedAffiliateId: id }),
  logout: () => set({ authenticatedAffiliateId: null, currentView: 'landing' }),
}))
