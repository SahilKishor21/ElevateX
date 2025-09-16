'use client'
import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react'
import { useSimulation } from '@/hooks/useSimulation'
import { useMetrics } from '@/hooks/useMetrics'

const StressTestRunner: React.FC = () => {
  const [requestCount, setRequestCount] = useState(100)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [requestsGenerated, setRequestsGenerated] = useState(0)

  const { actions, isConnected, activeRequests } = useSimulation()
  const { raw, health } = useMetrics()

  const runStressTest = useCallback(async () => {
    if (!isConnected) return

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

    // Generate requests rapidly
    const generateRequests = () => {
      const interval = setInterval(() => {
        if (requestsGenerated >= requestCount) {
          clearInterval(interval)
          return
        }

        // Generate 5-10 requests per second for stress testing
        const batchSize = Math.min(10, requestCount - requestsGenerated)
        
        for (let i = 0; i < batchSize; i++) {
          actions.generateRandomRequest()
          setRequestsGenerated(prev => prev + 1)
          setProgress(prev => Math.min(100, ((prev * requestCount + 1) / requestCount) * 100))
        }
      }, 100) // Every 100ms

      return interval
    }

    const interval = generateRequests()

    // Monitor performance for 30 seconds after generation
    setTimeout(() => {
      clearInterval(interval)
      
      const endTime = Date.now()
      const finalMetrics = {
        waitTime: raw.averageWaitTime,
        utilization: raw.elevatorUtilization,
        starvationCount: raw.starvationCount
      }

      setResults({
        duration: (endTime - startTime) / 1000,
        requestsGenerated: requestCount,
        pendingRequests: activeRequests.length,
        avgWaitTime: finalMetrics.waitTime,
        maxUtilization: Math.max(...finalMetrics.utilization) * 100,
        starvationEvents: finalMetrics.starvationCount - initialMetrics.starvationCount,
        systemStable: finalMetrics.starvationCount === initialMetrics.starvationCount,
        performanceDegradation: finalMetrics.waitTime > initialMetrics.waitTime * 1.5
      })

      setIsRunning(false)
      setProgress(100)
    }, 35000) // 35 seconds total test time

  }, [requestCount, isConnected, actions, raw, activeRequests])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Stress Test Runner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Request Count: {requestCount}</Label>
          <Slider
            value={[requestCount]}
            onValueChange={([value]) => setRequestCount(value)}
            min={50}
            max={500}
            step={25}
            className="mt-2"
            disabled={isRunning}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>50</span>
            <span>500 requests</span>
          </div>
        </div>

        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {requestsGenerated}/{requestCount}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">
              Generating requests at high rate to test system limits...
            </p>
          </div>
        )}

        <Button
          onClick={runStressTest}
          disabled={!isConnected || isRunning}
          className="w-full"
          variant={isRunning ? "secondary" : "destructive"}
        >
          <Zap className="mr-2 h-4 w-4" />
          {isRunning ? 'Running Stress Test...' : 'Start Stress Test'}
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
                  <span>Test Duration:</span>
                  <span className="font-medium">{results.duration.toFixed(1)}s</span>
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StressTestRunner