import { create } from 'zustand'

type View = 'landing' | 'admin' | 'affiliate'
type AdminTab = 'affiliates' | 'link-generator' | 'payouts' | 'integration'

interface AppState {
  currentView: View
  adminTab: AdminTab
  selectedAffiliateId: string | null
  setView: (view: View) => void
  setAdminTab: (tab: AdminTab) => void
  setSelectedAffiliateId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'landing',
  adminTab: 'affiliates',
  selectedAffiliateId: null,
  setView: (view) => set({ currentView: view }),
  setAdminTab: (tab) => set({ adminTab: tab }),
  setSelectedAffiliateId: (id) => set({ selectedAffiliateId: id }),
}))
