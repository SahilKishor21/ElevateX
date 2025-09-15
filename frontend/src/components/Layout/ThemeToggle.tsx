'use client'

import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, size = 'md' }) => {
  const { theme, toggleTheme } = useUIStore()

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        sizeClasses[size],
        className
      )}
      aria-label="Toggle theme"
    >
      <Sun
        className={cn(
          'absolute transition-all duration-300',
          size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5',
          theme === 'dark' 
            ? 'rotate-90 scale-0 opacity-0' 
            : 'rotate-0 scale-100 opacity-100'
        )}
      />
      <Moon
        className={cn(
          'absolute transition-all duration-300',
          size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5',
          theme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0'
        )}
      />
    </Button>
  )
}

export default ThemeToggle