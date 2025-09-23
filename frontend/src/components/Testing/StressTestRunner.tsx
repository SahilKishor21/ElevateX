'use client'
import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { useSimulation } from '@/hooks/useSimulation'
import { useMetrics } from '@/hooks/useMetrics'

const StressTestRunner: React.FC = () => {
  const [requestCount, setRequestCount] = useState(120) // Default to same as ControlPanel
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [requestsGenerated, setRequestsGenerated] = useState(0)

  const { actions, isConnected, activeRequests, isRunning: simulationRunning } = useSimulation()
  const { raw, health } = useMetrics()

  const runStressTest = useCallback(() => {
    if (!isConnected || !simulationRunning) return

    setIsRunning(true)
    setResults(null)
    setProgress(0)
    setRequestsGenerated(0)

    const startTime = Date.now()
    const initialMetrics = {
      waitTime: raw.averageWaitTime,
      utilization: raw.elevatorUtilization,
      starvationCount: raw.starvationCount
    }

    console.log(`Starting stress test: ${requestCount} requests at 20 req/sec`)

    // Use the exact same logic as ControlPanel but with custom request count
    for (let i = 0; i < requestCount; i++) {
      setTimeout(() => {
        actions.generateRandomRequest()
        
        // Update progress
        const currentProgress = ((i + 1) / requestCount) * 100
        setProgress(currentProgress)
        setRequestsGenerated(i + 1)
        
        console.log(`Generated request ${i + 1}/${requestCount}`)
        
        // If this is the last request, start monitoring phase
        if (i + 1 === requestCount) {
          console.log('All requests generated, monitoring for results...')
          
          // Monitor system for 10 seconds after all requests are generated
          setTimeout(() => {
            const endTime = Date.now()
            const finalMetrics = {
              waitTime: raw.averageWaitTime,
              utilization: raw.elevatorUtilization,
              starvationCount: raw.starvationCount
            }

            const maxUtilization = finalMetrics.utilization.length > 0 ? 
              Math.max(...finalMetrics.utilization) : 0

            setResults({
              duration: (endTime - startTime) / 1000,
              requestsGenerated: requestCount,
              pendingRequests: activeRequests.length,
              avgWaitTime: finalMetrics.waitTime,
              maxUtilization: maxUtilization * 100,
              starvationEvents: Math.max(0, finalMetrics.starvationCount - initialMetrics.starvationCount),
              systemStable: finalMetrics.starvationCount <= initialMetrics.starvationCount,
              performanceDegradation: finalMetrics.waitTime > (initialMetrics.waitTime * 1.5 + 5),
              requestsPerSecond: 20 // Same as ControlPanel logic
            })

            setIsRunning(false)
            console.log('Stress test completed')
          }, 10000) // 10 second monitoring period
        }
      }, i * 50) // Generate 20 requests per second (same as ControlPanel: 50ms interval)
    }

  }, [requestCount, isConnected, simulationRunning, actions, raw, activeRequests])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Stress Test Runner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!simulationRunning && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Simulation not running. Start simulation to perform stress testing.
            </span>
          </div>
        )}

        <div>
          <Label>Request Count: {requestCount}</Label>
          <Slider
            value={[requestCount]}
            onValueChange={([value]) => setRequestCount(value)}
            min={50}
            max={500}
            step={10}
            className="mt-2"
            disabled={isRunning}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>50</span>
            <span>500 requests</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Generates requests at 20 req/sec (same rate as ControlPanel)
          </p>
        </div>

        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {requestsGenerated}/{requestCount}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">
              {requestsGenerated < requestCount ? 
                'Generating requests at high rate to test system limits...' : 
                'Monitoring system performance...'
              }
            </p>
          </div>
        )}

        <Button
          onClick={runStressTest}
          disabled={!isConnected || isRunning || !simulationRunning}
          className="w-full"
          variant={isRunning ? "secondary" : "destructive"}
        >
          <Zap className="mr-2 h-4 w-4" />
          {isRunning ? 'Running Stress Test...' : `Generate ${requestCount} Requests`}
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {results.systemStable ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600">System Passed Stress Test</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium text-yellow-600">Performance Issues Detected</span>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Requests Generated:</span>
                  <span className="font-medium">{results.requestsGenerated}</span>
                </div>
                <div className="flex justify-between">
                  <span>Generation Rate:</span>
                  <span className="font-medium">{results.requestsPerSecond} req/sec</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Wait Time:</span>
                  <span className="font-medium">{results.avgWaitTime.toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Utilization:</span>
                  <span className="font-medium">{results.maxUtilization.toFixed(1)}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Test Duration:</span>
                  <span className="font-medium">{results.duration.toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Requests:</span>
                  <span className="font-medium">{results.pendingRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Starvation Events:</span>
                  <span className={`font-medium ${results.starvationEvents === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {results.starvationEvents}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>System Stable:</span>
                  <span className={`font-medium ${results.systemStable ? 'text-green-600' : 'text-yellow-600'}`}>
                    {results.systemStable ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {results.performanceDegradation && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Performance degradation detected. Consider optimizing algorithm parameters or increasing elevator count.
                </p>
              </div>
            )}

            {results.starvationEvents > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {results.starvationEvents} starvation event(s) occurred during stress test. Review starvation prevention settings.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StressTestRunner