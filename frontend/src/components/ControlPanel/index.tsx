import React from 'react'
import SimulationControls from './SimulationControls'
import ParameterControls from './ParameterControls'
import RequestGenerator from './RequestGenerator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'
import { useSimulation } from '@/hooks/useSimulation'

const ControlPanel: React.FC = () => {
  const { actions, isConnected, isRunning } = useSimulation()

  const runStressTest = () => {
    if (!isConnected || !isRunning) return
    
    // Generate 100+ requests rapidly
    for (let i = 0; i < 120; i++) {
      setTimeout(() => {
        actions.generateRandomRequest()
      }, i * 50) // Generate 20 requests per second
    }
  }

  return (
    <div className="space-y-6">
      <SimulationControls />
      <ParameterControls />
      <RequestGenerator />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Stress Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runStressTest}
            disabled={!isConnected || !isRunning}
            variant="destructive"
            className="w-full"
          >
            Generate 120 Requests (Stress Test)
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Tests system with high request volume to ensure smooth handling of 100+ requests
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default ControlPanel