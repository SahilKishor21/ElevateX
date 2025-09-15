'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme } = useUIStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <>{children}</>
}