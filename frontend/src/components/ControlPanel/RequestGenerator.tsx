import React, { useState } from 'react'
import { Plus, Zap, Coffee, Briefcase, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSimulation } from '@/hooks/useSimulation'

const RequestGenerator: React.FC = () => {
  const { config, isRunning, actions } = useSimulation()
  const [fromFloor, setFromFloor] = useState('1')
  const [toFloor, setToFloor] = useState('2')

  const scenarios = [
    {
      id: 'morning_rush',
      name: 'Morning Rush',
      icon: Briefcase,
      description: 'Heavy lobby to upper floors traffic',
      color: 'text-blue-500'
    },
    {
      id: 'lunch_time',
      name: 'Lunch Time',
      icon: Coffee,
      description: 'Mixed traffic between middle floors',
      color: 'text-orange-500'
    },
    {
      id: 'evening_rush',
      name: 'Evening Rush',
      icon: Home,
      description: 'Upper floors to lobby traffic',
      color: 'text-purple-500'
    },
    {
      id: 'random_peak',
      name: 'Random Peak',
      icon: Zap,
      description: 'High volume random requests',
      color: 'text-green-500'
    }
  ]

  const handleManualRequest = () => {
    if (fromFloor !== toFloor) {
      const direction = parseInt(toFloor) > parseInt(fromFloor) ? 'up' : 'down'
      actions.addFloorCall(parseInt(fromFloor), direction)
    }
  }

  const handleScenario = (scenarioId: string) => {
    switch (scenarioId) {
      case 'morning_rush':
        // Generate 8-12 requests from lobby to upper floors
        for (let i = 0; i < Math.floor(Math.random() * 5) + 8; i++) {
          setTimeout(() => {
            actions.addFloorCall(1, 'up')
          }, i * 300)
        }
        break
      
      case 'lunch_time':
        // Generate mixed requests between floors 3-8
        for (let i = 0; i < Math.floor(Math.random() * 6) + 5; i++) {
          setTimeout(() => {
            const floor = Math.floor(Math.random() * 6) + 3
            const direction = Math.random() > 0.5 ? 'up' : 'down'
            actions.addFloorCall(floor, direction)
          }, i * 400)
        }
        break
      
      case 'evening_rush':
        // Generate requests from upper floors to lobby
        for (let i = 0; i < Math.floor(Math.random() * 7) + 6; i++) {
          setTimeout(() => {
            const floor = Math.floor(Math.random() * (config.numFloors - 5)) + 6
            actions.addFloorCall(floor, 'down')
          }, i * 250)
        }
        break
      
      case 'random_peak':
        // Generate completely random requests
        actions.generatePeakTraffic()
        break
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Request Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Manual Request */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Manual Request</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From Floor</Label>
              <Select value={fromFloor} onValueChange={setFromFloor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: config.numFloors }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Floor {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">To Floor</Label>
              <Select value={toFloor} onValueChange={setToFloor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: config.numFloors }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Floor {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleManualRequest}
            disabled={!isRunning || fromFloor === toFloor}
            className="w-full"
            size="sm"
          >
            Add Request
          </Button>
        </div>

        {/* Scenario Generator */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Traffic Scenarios</h4>
          <div className="grid grid-cols-2 gap-2">
            {scenarios.map((scenario) => (
              <Button
                key={scenario.id}
                onClick={() => handleScenario(scenario.id)}
                disabled={!isRunning}
                variant="outline"
                className="h-auto flex-col gap-2 p-3"
              >
                <scenario.icon className={`h-5 w-5 ${scenario.color}`} />
                <div className="text-center">
                  <div className="text-xs font-medium">{scenario.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {scenario.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Quick Actions</h4>
          <div className="space-y-2">
            <Button
              onClick={actions.generateRandomRequest}
              disabled={!isRunning}
              variant="outline"
              className="w-full"
              size="sm"
            >
              Single Random Request
            </Button>
            <Button
              onClick={() => {
                for (let i = 0; i < 5; i++) {
                  setTimeout(() => actions.generateRandomRequest(), i * 200)
                }
              }}
              disabled={!isRunning}
              variant="outline"
              className="w-full"
              size="sm"
            >
              5 Random Requests
            </Button>
          </div>
        </div>

        {!isRunning && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Start the simulation to generate requests
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RequestGenerator