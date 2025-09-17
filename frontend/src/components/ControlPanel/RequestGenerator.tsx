import React, { useState } from 'react'
import { Plus, Zap, Coffee, Briefcase, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSimulation } from '@/hooks/useSimulation'

const RequestGenerator: React.FC = () => {
  const { config, isRunning, isConnected, actions } = useSimulation()
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

  // FIXED: Use addCompleteRequest for manual requests with origin AND destination
  const handleManualRequest = () => {
    if (fromFloor !== toFloor && isConnected && isRunning) {
      console.log(`Manual request: Floor ${fromFloor} → Floor ${toFloor}`)
      actions.addCompleteRequest(parseInt(fromFloor), parseInt(toFloor))
    }
  }

  const handleScenario = (scenarioId: string) => {
    if (!isConnected || !isRunning) return

    console.log(`Executing scenario: ${scenarioId}`)
    
    switch (scenarioId) {
      case 'morning_rush':
        // Generate 8-12 complete requests from lobby to upper floors
        for (let i = 0; i < Math.floor(Math.random() * 5) + 8; i++) {
          setTimeout(() => {
            const destinationFloor = Math.floor(Math.random() * (config.numFloors - 5)) + 6
            actions.addCompleteRequest(1, destinationFloor)
          }, i * 300)
        }
        break
      
      case 'lunch_time':
        // Generate mixed complete requests between floors 3-8
        for (let i = 0; i < Math.floor(Math.random() * 6) + 5; i++) {
          setTimeout(() => {
            const originFloor = Math.floor(Math.random() * 6) + 3
            let destinationFloor = Math.floor(Math.random() * config.numFloors) + 1
            while (destinationFloor === originFloor) {
              destinationFloor = Math.floor(Math.random() * config.numFloors) + 1
            }
            actions.addCompleteRequest(originFloor, destinationFloor)
          }, i * 400)
        }
        break
      
      case 'evening_rush':
        // Generate complete requests from upper floors to lobby
        for (let i = 0; i < Math.floor(Math.random() * 7) + 6; i++) {
          setTimeout(() => {
            const originFloor = Math.floor(Math.random() * (config.numFloors - 5)) + 6
            actions.addCompleteRequest(originFloor, 1)
          }, i * 250)
        }
        break
      
      case 'random_peak':
        // Generate completely random complete requests
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
        {/* Connection Status */}
        {!isConnected && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">
              Not connected to server. Check your connection.
            </p>
          </div>
        )}

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
            disabled={!isConnected || !isRunning || fromFloor === toFloor}
            className="w-full"
            size="sm"
          >
            Add Request ({fromFloor} → {toFloor})
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Quick Actions</h4>
          <div className="space-y-2">
            <Button
              onClick={actions.generateRandomRequest}
              disabled={!isConnected || !isRunning}
              variant="outline"
              className="w-full"
              size="sm"
            >
              Single Random Request
            </Button>
            <Button
              onClick={() => {
                console.log('Generating 5 random requests...')
                for (let i = 0; i < 5; i++) {
                  setTimeout(() => actions.generateRandomRequest(), i * 200)
                }
              }}
              disabled={!isConnected || !isRunning}
              variant="outline"
              className="w-full"
              size="sm"
            >
              5 Random Requests
            </Button>
          </div>
        </div>

        {/* Scenario Testing */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Traffic Scenarios</h4>
          <div className="grid grid-cols-2 gap-2">
            {scenarios.map((scenario) => (
              <Button
                key={scenario.id}
                onClick={() => handleScenario(scenario.id)}
                disabled={!isConnected || !isRunning}
                variant="outline"
                size="sm"
                className="flex flex-col gap-1 h-auto py-2"
              >
                <scenario.icon className={`h-3 w-3 ${scenario.color}`} />
                <span className="text-xs">{scenario.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Status Messages */}
        {!isRunning && isConnected && (
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