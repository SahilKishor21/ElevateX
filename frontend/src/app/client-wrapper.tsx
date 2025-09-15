'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme } = useUIStore()

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  return <>{children}</>
}