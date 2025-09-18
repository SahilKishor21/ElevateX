// src/app/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import Header from '@/components/Layout/Header'
import Sidebar from '@/components/Layout/Sidebar'
import ElevatorShaft from '@/components/ElevatorShaft'
import Dashboard from '@/components/Dashboard'
import ControlPanel from '@/components/ControlPanel'
import StressTestRunner from '@/components/Testing/StressTestRunner'
import AlgorithmComparison from '@/components/Algorithm/AlgorithmComparison'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { sidebarOpen, viewMode } = useUIStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const renderMainContent = () => {
    switch (viewMode) {
      case 'metrics':
        return <Dashboard />
      case 'algorithms':
        return <AlgorithmComparison />
      case 'testing':
        return (
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gradient mb-2">Stress Testing</h1>
                <p className="text-muted-foreground">
                  Test system performance with high-volume request scenarios
                </p>
              </div>
              <StressTestRunner />
            </div>
          </div>
        )
      default:
        return <ElevatorShaft />
    }
  }

  const renderSidePanel = () => {
    switch (viewMode) {
      case 'testing':
        return (
          <div className="space-y-4">
            <div className="text-center p-4">
              <h3 className="font-semibold mb-2">Test Information</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Tests up to 500 requests</p>
                <p>• Monitors performance degradation</p>
                <p>• Tracks capacity violations</p>
                <p>• Measures starvation prevention</p>
              </div>
            </div>
          </div>
        )
      case 'algorithms':
        return (
          <div className="space-y-4">
            <div className="text-center p-4">
              <h3 className="font-semibold mb-2">Algorithm Info</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Live algorithm switching</p>
                <p>• Performance comparison</p>
                <p>• Real-time metrics</p>
                <p>• Trade-off analysis</p>
              </div>
            </div>
          </div>
        )
      default:
        return <ControlPanel />
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex h-[calc(100vh-4rem)]">
          <Sidebar />
          <main className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 h-full p-6">
              <div className="overflow-auto">
                <ElevatorShaft />
              </div>
              <div className="overflow-auto border-l bg-muted/5 p-4 hidden lg:block w-[300px]">
                <ControlPanel />
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar />
        
        <main className={cn(
          'flex-1 transition-all duration-300 overflow-hidden'
        )}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 h-full p-6">
            <div className="overflow-auto">
              {renderMainContent()}
            </div>
            
            <div className="overflow-auto border-l bg-muted/5 p-4 hidden lg:block w-[300px]">
              {renderSidePanel()}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}