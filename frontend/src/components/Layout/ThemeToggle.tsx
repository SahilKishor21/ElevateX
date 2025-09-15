'use client'

import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useUIStore()

  const handleToggle = () => {
    console.log('Theme toggle clicked, current theme:', theme)
    toggleTheme()
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="relative overflow-hidden transition-all duration-300 h-10 w-10"
      aria-label="Toggle theme"
    >
      <Sun
        className={cn(
          'absolute transition-all duration-300 h-5 w-5',
          theme === 'dark' 
            ? 'rotate-90 scale-0 opacity-0' 
            : 'rotate-0 scale-100 opacity-100'
        )}
      />
      <Moon
        className={cn(
          'absolute transition-all duration-300 h-5 w-5',
          theme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0'
        )}
      />
    </Button>
  )
}

export default ThemeToggle