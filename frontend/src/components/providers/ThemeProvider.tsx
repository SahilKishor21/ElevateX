'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme } = useUIStore()

  useEffect(() => {
    // Apply theme on mount and when theme changes
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    
    console.log('Theme applied:', theme)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      console.log('System theme changed:', e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return <>{children}</>
}