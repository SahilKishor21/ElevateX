// src/components/Layout/Sidebar.tsx
import React, { useEffect, useState } from 'react'
import { BarChart3, Building, Settings, Activity, X, Zap, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUIStore } from '@/store/uiStore'
import { useSimulation } from '@/hooks/useSimulation'
import { useMetrics } from '@/hooks/useMetrics'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [mounted, setMounted] = useState(false)
  const { sidebarOpen, setSidebarOpen, viewMode, setViewMode } = useUIStore()
  const { systemStatus, elevators } = useSimulation()
  const { formatted, health } = useMetrics()

  useEffect(() => {
    setMounted(true)
  }, [])

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
      id: 'algorithms',
      label: 'Algorithm Comparison',
      icon: Zap,
      description: 'Compare SCAN vs Hybrid'
    },
    {
      id: 'testing',
      label: 'Stress Testing',
      icon: Target,
      description: 'Load testing tools'
    }
  ]

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="fixed left-0 top-0 z-50 h-full w-72 bg-background border-r -translate-x-full lg:relative lg:translate-x-0">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Control Panel</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="animate-pulse">
              <div className="h-32 bg-muted rounded-lg mb-4"></div>
              <div className="space-y-2">
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={cn(
        'fixed left-0 top-0 z-50 h-full w-72 bg-background border-r transition-transform duration-300 lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        className
      )}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Control Panel</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Card className="metric-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">System Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Active Elevators</p>
                    <p className="text-2xl font-bold text-blue-500">{systemStatus.activeElevators}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pending Requests</p>
                    <p className="text-2xl font-bold text-purple-500">{systemStatus.pendingRequests}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Wait Time</p>
                    <p className="text-lg font-semibold text-green-500">{formatted.averageWaitTime}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">System Health</p>
                    <p className={cn(
                      "text-lg font-semibold",
                      health.status === 'healthy' ? 'text-green-500' :
                      health.status === 'warning' ? 'text-yellow-500' :
                      'text-red-500'
                    )}>
                      {health.score}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Navigation</h3>
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant={viewMode === item.id ? 'default' : 'ghost'}
                  className="w-full justify-start h-auto py-3 px-3"
                  onClick={() => setViewMode(item.id as any)}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </Button>
              ))}
            </div>

            <Card className="metric-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Elevator Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {elevators.map((elevator) => (
                    <div
                      key={elevator.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: elevator.color }}
                        />
                        <span className="text-sm font-medium">Elevator {elevator.id + 1}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Floor {elevator.currentFloor}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {elevator.state.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {health.issues.length > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    System Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {health.issues.map((issue, index) => (
                      <p key={index} className="text-sm text-yellow-700 dark:text-yellow-400">
                        • {issue}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar