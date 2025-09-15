'use client'

import React, { useEffect, useState } from 'react'
import Header from '@/components/Layout/Header'
import Sidebar from '@/components/Layout/Sidebar'
import ElevatorShaft from '@/components/ElevatorShaft'
import Dashboard from '@/components/Dashboard'
import ControlPanel from '@/components/ControlPanel'
import { useUIStore } from '@/store/uiStore'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { viewMode } = useUIStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-screen bg-slate-900 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading Elevator Control System...</p>
        </div>
      </div>
    )
  }

  const renderMainContent = () => {
    switch (viewMode) {
      case 'metrics':
        return <Dashboard />
      case 'logs':
        return (
          <div className="p-6 h-full bg-slate-900 text-white">
            <h1 className="text-2xl font-bold mb-4">Activity Logs</h1>
            <p className="text-slate-300">Activity logs will be implemented here</p>
          </div>
        )
      default:
        return <ElevatorShaft />
    }
  }

  return (
    <div className="h-screen bg-slate-900 text-white overflow-hidden">
      <Header />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar */}
        <div className="w-80 flex-shrink-0 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {renderMainContent()}
        </div>
        
        {/* Right Control Panel */}
        <div className="w-80 flex-shrink-0 bg-slate-800 border-l border-slate-700 overflow-y-auto">
          <ControlPanel />
        </div>
      </div>
    </div>
  )
}