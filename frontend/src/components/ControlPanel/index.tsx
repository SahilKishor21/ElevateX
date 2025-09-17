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
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-1">
        <div className="min-h-0">
          <SimulationControls />
        </div>
        
        <div className="min-h-0">
          <ParameterControls />
        </div>
        
        <div className="min-h-0">
          <RequestGenerator />
        </div>
        
        <Card className="min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" />
              Stress Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={runStressTest}
              disabled={!isConnected || !isRunning}
              variant="destructive"
              className="w-full"
              size="sm"
            >
              Generate 120 Requests
            </Button>
            <p className="text-xs text-muted-foreground leading-tight">
              Tests system with high request volume to ensure smooth handling of 100+ requests
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ControlPanel