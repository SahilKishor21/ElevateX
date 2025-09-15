import React from 'react'
import { Play, Pause, RotateCcw, Zap, Users, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import LoadingSpinner from '../Common/LoadingSpinner'
import { useSimulation } from '@/hooks/useSimulation'
import { SIMULATION_SPEEDS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const SimulationControls: React.FC = () => {
  const { 
    isRunning, 
    isLoading, 
    isConnected, 
    config,
    systemStatus, 
    actions 
  } = useSimulation()

  const handleSpeedChange = (value: string) => {
    actions.updateConfig({ speed: parseFloat(value) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Simulation Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Controls */}
        <div className="flex gap-2">
          <Button
            onClick={isRunning ? actions.stop : actions.start}
            disabled={!isConnected || isLoading}
            variant={isRunning ? 'destructive' : 'default'}
            className="flex-1"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" color="white" />
            ) : isRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start
              </>
            )}
          </Button>
          
          <Button
            onClick={actions.reset}
            disabled={!isConnected || isLoading}
            variant="outline"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Simulation Speed</label>
          <Select
            value={config.speed.toString()}
            onValueChange={handleSpeedChange}
            disabled={!isConnected}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIMULATION_SPEEDS.map((speed) => (
                <SelectItem key={speed.value} value={speed.value.toString()}>
                  {speed.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Actions</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={actions.generateRandomRequest}
              disabled={!isConnected || !isRunning}
              variant="outline"
              size="sm"
            >
              <Users className="mr-2 h-3 w-3" />
              Add Request
            </Button>
            
            <Button
              onClick={actions.generatePeakTraffic}
              disabled={!isConnected || !isRunning}
              variant="outline"
              size="sm"
            >
              <Zap className="mr-2 h-3 w-3" />
              Peak Traffic
            </Button>
          </div>
        </div>

        {/* System Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">System Status</label>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connection:</span>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isConnected ? "bg-green-500" : "bg-red-500"
                )} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={cn(
                  "text-xs font-medium",
                  isRunning ? "text-green-600" : "text-gray-600"
                )}>
                  {isRunning ? "Running" : "Stopped"}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active:</span>
                <span className="font-medium">{systemStatus.activeElevators}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Load:</span>
                <span className={cn(
                  "font-medium text-xs",
                  systemStatus.utilizationRate > 0.8 ? "text-red-600" :
                  systemStatus.utilizationRate > 0.6 ? "text-yellow-600" :
                  "text-green-600"
                )}>
                  {Math.round(systemStatus.utilizationRate * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Health Indicator */}
        {!systemStatus.isHealthy && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              System under high load
            </span>
          </div>
        )}

        {!isConnected && (
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800 dark:text-red-200">
              Not connected to server
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SimulationControls