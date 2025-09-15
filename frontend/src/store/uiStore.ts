'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UIStore {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  selectedElevator: number | null
  selectedFloor: number | null
  viewMode: 'simulation' | 'metrics' | 'logs'
  
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  setViewMode: (mode: 'simulation' | 'metrics' | 'logs') => void
  setSelectedElevator: (id: number | null) => void
  setSelectedFloor: (floor: number | null) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarOpen: true,
      selectedElevator: null,
      selectedFloor: null,
      viewMode: 'simulation',

      toggleTheme: () => {
        const currentTheme = get().theme
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'
        console.log('Toggling theme from', currentTheme, 'to', newTheme)
        
        set({ theme: newTheme })
        
        // Apply theme immediately to document
        if (typeof window !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(newTheme)
        }
      },

      setTheme: (theme) => {
        console.log('Setting theme to:', theme)
        set({ theme })
        
        // Apply theme immediately to document
        if (typeof window !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(theme)
        }
      },

      setViewMode: (viewMode) => set({ viewMode }),
      setSelectedElevator: (selectedElevator) => set({ selectedElevator }),
      setSelectedFloor: (selectedFloor) => set({ selectedFloor }),
    }),
    {
      name: 'elevator-ui-store',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
      onRehydrateStorage: () => (state) => {
        // Apply theme from localStorage immediately after hydration
        if (state && typeof window !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(state.theme)
        }
      },
    }
  )
)