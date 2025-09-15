'use client'

import React from 'react'
import { Building } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useUIStore } from '@/store/uiStore'

const Header: React.FC = () => {
  const { theme } = useUIStore()

  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Building className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">
              Elevator Control System
            </h1>
            <p className="text-xs text-slate-400">
              Advanced Simulation Dashboard • Theme: {theme}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-slate-300">Online</span>
          </div>
          <div className="text-slate-400">
            System Load: <span className="text-yellow-400 font-medium">67%</span>
          </div>
        </div>
        
       
        
        <ThemeToggle />
      </div>
    </header>
  )
}

export default Header