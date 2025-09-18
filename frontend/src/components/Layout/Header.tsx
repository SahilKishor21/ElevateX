'use client'

import React, { useState, useEffect } from 'react'
import { Building, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ThemeToggle from './ThemeToggle'
import { useUIStore } from '@/store/uiStore'
import { useSimulation } from '@/hooks/useSimulation'
import { cn } from '@/lib/utils'

const Header: React.FC = () => {
  const { theme, sidebarOpen, setSidebarOpen } = useUIStore()
  const [mounted, setMounted] = useState(false)
  const { systemStatus } = useSimulation()

  useEffect(() => {
    setMounted(true)
  }, [])

  const utilizationRate = Math.round(systemStatus.utilizationRate * 100);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center gap-4">
        {/* Hamburger Menu Button (visible on small screens) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Building className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">
              Elevator Control System
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Advanced Simulation Dashboard
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden md:flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600 dark:text-gray-300">Online</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            System Load: <span className={cn(
                "font-medium",
                utilizationRate > 80 ? "text-red-600 dark:text-red-400" :
                utilizationRate > 60 ? "text-yellow-600 dark:text-yellow-400" :
                "text-green-600 dark:text-green-400"
            )}>
                {utilizationRate}%
            </span>
          </div>
        </div>
        
        <ThemeToggle />
      </div>
    </header>
  )
}

export default Header