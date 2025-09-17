// src/store/uiStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  selectedElevator: number | null
  selectedFloor: number | null
  showMetrics: boolean
  showRequests: boolean
  showSettings: boolean
  animationsEnabled: boolean
  autoRefresh: boolean
  refreshInterval: number
  viewMode: 'simulation' | 'metrics' | 'algorithms' | 'testing'
  
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSelectedElevator: (id: number | null) => void
  setSelectedFloor: (floor: number | null) => void
  toggleMetrics: () => void
  toggleRequests: () => void
  toggleSettings: () => void
  setAnimationsEnabled: (enabled: boolean) => void
  setAutoRefresh: (enabled: boolean) => void
  setRefreshInterval: (interval: number) => void
  setViewMode: (mode: 'simulation' | 'metrics' | 'algorithms' | 'testing') => void
  resetUI: () => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarOpen: true,
      selectedElevator: null,
      selectedFloor: null,
      showMetrics: true,
      showRequests: true,
      showSettings: false,
      animationsEnabled: true,
      autoRefresh: true,
      refreshInterval: 1000,
      viewMode: 'simulation',

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),

      setTheme: (theme) => set({ theme }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      setSelectedElevator: (selectedElevator) => set({ selectedElevator }),

      setSelectedFloor: (selectedFloor) => set({ selectedFloor }),

      toggleMetrics: () =>
        set((state) => ({ showMetrics: !state.showMetrics })),

      toggleRequests: () =>
        set((state) => ({ showRequests: !state.showRequests })),

      toggleSettings: () =>
        set((state) => ({ showSettings: !state.showSettings })),

      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),

      setAutoRefresh: (autoRefresh) => set({ autoRefresh }),

      setRefreshInterval: (refreshInterval) => set({ refreshInterval }),

      setViewMode: (viewMode) => set({ viewMode }),

      resetUI: () =>
        set({
          selectedElevator: null,
          selectedFloor: null,
          showMetrics: true,
          showRequests: true,
          showSettings: false,
          viewMode: 'simulation',
        }),
    }),
    {
      name: 'elevator-ui-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        animationsEnabled: state.animationsEnabled,
        autoRefresh: state.autoRefresh,
        refreshInterval: state.refreshInterval,
      }),
    }
  )
)