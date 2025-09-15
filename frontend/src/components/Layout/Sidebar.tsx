'use client'

import React from 'react'
import { BarChart3, Building, Settings, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'

const Sidebar: React.FC = () => {
  const { viewMode, setViewMode } = useUIStore()

  const navigationItems = [
    {
      id: 'simulation',
      label: 'Simulation',
      icon: Building,
      description: 'Real-time elevator view'
    },
    {
      id: 'metrics',
      label: 'Metrics',
      icon: BarChart3,
      description: 'Performance analytics'
    },
    {
      id: 'logs',
      label: 'Activity Logs',
      icon: Activity,
      description: 'System events'
    }
  ]

  return (
    <div className="p-4 h-full">
      <h2 className="text-lg font-semibold text-white mb-4">Control Panel</h2>
      
      {/* System Overview */}
      <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-slate-300 mb-3">System Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-400 text-xs">Active Elevators</p>
            <p className="text-2xl font-bold text-blue-400">2</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Pending Requests</p>
            <p className="text-2xl font-bold text-purple-400">3</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Avg Wait Time</p>
            <p className="text-lg font-semibold text-green-400">0s</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">System Health</p>
            <p className="text-lg font-semibold text-green-400">100%</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="space-y-2 mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Navigation</h3>
        {navigationItems.map((item) => (
          <Button
            key={item.id}
            variant={viewMode === item.id ? 'default' : 'ghost'}
            className={`w-full justify-start h-auto py-3 px-3 ${
              viewMode === item.id 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            onClick={() => setViewMode(item.id as any)}
          >
            <item.icon className="mr-3 h-4 w-4" />
            <div className="text-left">
              <p className="font-medium">{item.label}</p>
              <p className="text-xs opacity-70">{item.description}</p>
            </div>
          </Button>
        ))}
      </div>

      {/* Elevator Status */}
      <div className="bg-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Elevator Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded bg-slate-600/30">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-slate-300">Elevator 1</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">Floor 11</p>
              <p className="text-xs text-slate-400">Moving Up</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-slate-600/30">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-slate-300">Elevator 2</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">Floor 3</p>
              <p className="text-xs text-slate-400">Moving Up</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-slate-600/30">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-sm text-slate-300">Elevator 3</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">Floor 1</p>
              <p className="text-xs text-slate-400">Idle</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar