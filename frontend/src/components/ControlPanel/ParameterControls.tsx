import React from 'react'
import { Settings, Building, Users, Timer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useSimulation } from '@/hooks/useSimulation'
import { cn } from '@/lib/utils'

const ParameterControls: React.FC = () => {
  const { config, isRunning, actions } = useSimulation()

  const handleElevatorCountChange = (value: number[]) => {
    actions.updateConfig({ numElevators: value[0] })
  }

  const handleFloorCountChange = (value: number[]) => {
    actions.updateConfig({ numFloors: value[0] })
  }

  const handleCapacityChange = (value: number[]) => {
    actions.updateConfig({ capacity: value[0] })
  }

  const handleRequestFrequencyChange = (value: number[]) => {
    actions.updateConfig({ requestFrequency: value[0] })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Number of Elevators */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-500" />
            <Label className="text-sm font-medium">
              Number of Elevators: {config.numElevators}
            </Label>
          </div>
          <Slider
            value={[config.numElevators]}
            onValueChange={handleElevatorCountChange}
            max={8}
            min={1}
            step={1}
            disabled={isRunning}
            className={cn(isRunning && "opacity-50")}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>8</span>
          </div>
        </div>

        {/* Number of Floors */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-purple-500" />
            <Label className="text-sm font-medium">
              Number of Floors: {config.numFloors}
            </Label>
          </div>
          <Slider
            value={[config.numFloors]}
            onValueChange={handleFloorCountChange}
            max={50}
            min={5}
            step={1}
            disabled={isRunning}
            className={cn(isRunning && "opacity-50")}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5</span>
            <span>50</span>
          </div>
        </div>

        {/* Elevator Capacity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-green-500" />
            <Label className="text-sm font-medium">
              Elevator Capacity: {config.capacity} people
            </Label>
          </div>
          <Slider
            value={[config.capacity]}
            onValueChange={handleCapacityChange}
            max={20}
            min={4}
            step={1}
            disabled={isRunning}
            className={cn(isRunning && "opacity-50")}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>4</span>
            <span>20</span>
          </div>
        </div>

        {/* Request Frequency */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-orange-500" />
            <Label className="text-sm font-medium">
              Request Frequency: {config.requestFrequency} req/min
            </Label>
          </div>
          <Slider
            value={[config.requestFrequency]}
            onValueChange={handleRequestFrequencyChange}
            max={10}
            min={1}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1/min</span>
            <span>10/min</span>
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Configuration Summary</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Elevators:</span>
                <span className="font-medium">{config.numElevators}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Floors:</span>
                <span className="font-medium">{config.numFloors}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-medium">{config.capacity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency:</span>
                <span className="font-medium">{config.requestFrequency}/min</span>
              </div>
            </div>
          </div>
          
          <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
            <strong>Total System Capacity:</strong> {config.numElevators * config.capacity} people
            <br />
            <strong>Theoretical Max Throughput:</strong> ~{Math.round(config.numElevators * config.capacity * 2)} people/hour
          </div>
        </div>

        {isRunning && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Some parameters are locked while simulation is running. Stop the simulation to modify system configuration.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ParameterControls