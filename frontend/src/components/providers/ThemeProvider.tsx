'use client'

import { useEffect, useState } from 'react'
import { useUIStore } from '@/store/uiStore'

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme, setTheme } = useUIStore()
  const [hasMounted, setHasMounted] = useState(false)

  // This effect runs once on the client to rehydrate the store
  useEffect(() => {
    // The persist middleware handles rehydration, this is just to get the initial value
    const savedTheme = localStorage.getItem('elevator-ui-store');
    if (savedTheme) {
      try {
        const parsedState = JSON.parse(savedTheme);
        setTheme(parsedState.state.theme);
      } catch (error) {
        console.error('Failed to parse theme from localStorage', error);
      }
    } else if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }

    setHasMounted(true);
  }, [setTheme]);

  // This effect updates the HTML class whenever the theme state changes
  useEffect(() => {
    if (hasMounted) {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
  }, [theme, hasMounted]);

  // Only render children after the component has mounted to prevent hydration errors
  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}