'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Zap, Activity, CheckCircle, AlertCircle } from 'lucide-react'
import { useSimulation } from '@/hooks/useSimulation'

const AlgorithmComparison: React.FC = () => {
  const [activeAlgorithm, setActiveAlgorithm] = useState<'hybrid' | 'scan'>('hybrid')
  const [isLoading, setIsLoading] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const [comparisonData, setComparisonData] = useState([
    {
      metric: 'Avg Wait Time',
      hybrid: 0,
      scan: 0,
      unit: 'seconds'
    },
    {
      metric: 'Max Wait Time',
      hybrid: 0,
      scan: 0,
      unit: 'seconds'
    },
    {
      metric: 'Utilization',
      hybrid: 0,
      scan: 0,
      unit: '%'
    },
    {
      metric: 'Throughput',
      hybrid: 0,
      scan: 0,
      unit: 'req/hour'
    },
    {
      metric: 'Satisfaction',
      hybrid: 0,
      scan: 0,
      unit: '%'
    }
  ])

  const { isConnected, isRunning } = useSimulation()

  // Debug: Log connection status
  useEffect(() => {
    console.log('AlgorithmComparison - Connection status:', { isConnected, isRunning })
  }, [isConnected, isRunning])

  // CRITICAL FIX: Fetch current algorithm from backend on mount
  useEffect(() => {
    const fetchCurrentAlgorithm = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/status')
        if (response.ok) {
          const data = await response.json()
          if (data.currentAlgorithm) {
            console.log('Current algorithm from backend:', data.currentAlgorithm)
            setActiveAlgorithm(data.currentAlgorithm)
          }
        }
      } catch (error) {
        console.error('Failed to fetch current algorithm:', error)
      }
    }

    if (isConnected) {
      fetchCurrentAlgorithm()
    }
  }, [isConnected])

  // Fetch comparison data via HTTP API
  useEffect(() => {
    const fetchComparisonData = async () => {
      console.log('Fetching algorithm comparison data...')
      try {
        const response = await fetch('http://localhost:3001/api/algorithm-comparison')
        console.log('API Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('API Response data:', data)
        
        if (data.hybrid && data.scan) {
          console.log('Updating comparison data with:', {
            hybrid: data.hybrid,
            scan: data.scan,
            currentAlgorithm: data.currentAlgorithm
          })

          // Update active algorithm based on backend response
          if (data.currentAlgorithm && data.currentAlgorithm !== activeAlgorithm) {
            console.log('Updating active algorithm to:', data.currentAlgorithm)
            setActiveAlgorithm(data.currentAlgorithm)
          }
          
          const newData = [
            {
              metric: 'Avg Wait Time',
              hybrid: Math.round((parseFloat(data.hybrid.averageWaitTime) || 0) * 100) / 100,
              scan: Math.round((parseFloat(data.scan.averageWaitTime) || 0) * 100) / 100,
              unit: 'seconds'
            },
            {
              metric: 'Max Wait Time',
              hybrid: Math.round((parseFloat(data.hybrid.maxWaitTime) || 0) * 100) / 100,
              scan: Math.round((parseFloat(data.scan.maxWaitTime) || 0) * 100) / 100,
              unit: 'seconds'
            },
            {
              metric: 'Utilization',
              hybrid: Math.round((parseFloat(data.hybrid.utilization) || 0) * 100) / 100,
              scan: Math.round((parseFloat(data.scan.utilization) || 0) * 100) / 100,
              unit: '%'
            },
            {
              metric: 'Throughput',
              hybrid: Math.round((parseFloat(data.hybrid.throughput) || 0) * 100) / 100,
              scan: Math.round((parseFloat(data.scan.throughput) || 0) * 100) / 100,
              unit: 'req/hour'
            },
            {
              metric: 'Satisfaction',
              hybrid: Math.round((parseFloat(data.hybrid.satisfaction) || 0) * 100) / 100,
              scan: Math.round((parseFloat(data.scan.satisfaction) || 0) * 100) / 100,
              unit: '%'
            }
          ]
          
          console.log('Setting new comparison data:', newData)
          setComparisonData(newData)
        } else {
          console.warn('Invalid data structure received:', data)
        }
      } catch (error) {
        console.error('Failed to fetch algorithm comparison:', error)
      }
    }

    // Only fetch when connected
    if (isConnected) {
      fetchComparisonData()
      // Update every 3 seconds for real-time data
      const interval = setInterval(fetchComparisonData, 3000)
      return () => clearInterval(interval)
    }
  }, [isConnected, activeAlgorithm])

  const algorithmDetails = {
    hybrid: {
      name: 'Hybrid Dynamic Scheduler',
      description: 'Advanced algorithm with priority-based scheduling, starvation prevention, and traffic pattern optimization',
      advantages: [
        'Prevents request starvation',
        'Optimizes for rush hour patterns',
        'Dynamic load balancing',
        'Predictive positioning'
      ],
      disadvantages: [
        'Higher computational complexity',
        'More memory usage',
        'Complex parameter tuning'
      ]
    },
    scan: {
      name: 'SCAN Algorithm',
      description: 'Traditional elevator algorithm that continues in current direction until no more requests',
      advantages: [
        'Simple implementation',
        'Low computational overhead',
        'Predictable behavior',
        'Fair floor coverage'
      ],
      disadvantages: [
        'Potential request starvation',
        'Poor rush hour performance',
        'No load balancing',
        'Reactive positioning only'
      ]
    }
  }

  // CRITICAL FIX: Actually switch the algorithm in the backend
  const switchAlgorithm = async (algorithm: 'hybrid' | 'scan') => {
    console.log('Switching algorithm to:', algorithm)
    setIsLoading(true)
    setSwitchError(null)
    
    try {
      const response = await fetch('http://localhost:3001/api/switch-algorithm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm })
      })
      
      console.log('Switch algorithm response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Switch successful:', result)
        
        if (result.success) {
          setActiveAlgorithm(algorithm)
          console.log(`✅ Algorithm switched to ${algorithm}`)
          
          // Show success message briefly
          setTimeout(() => setSwitchError(null), 3000)
        } else {
          throw new Error(result.message || 'Switch failed')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Error switching algorithm:', error)
      setSwitchError(
        `Failed to switch algorithm: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      
      // Revert the switch on error
      setActiveAlgorithm(activeAlgorithm)
    } finally {
      setIsLoading(false)
    }
  }

  // CRITICAL FIX: Handle switch with proper validation
  const handleAlgorithmSwitch = (checked: boolean) => {
    const newAlgorithm = checked ? 'hybrid' : 'scan'
    
    if (newAlgorithm !== activeAlgorithm && !isLoading) {
      switchAlgorithm(newAlgorithm)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gradient">Algorithm Comparison</h1>
            <p className="text-sm text-muted-foreground">
              Real-time performance comparison between SCAN and Hybrid algorithms
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded text-xs ${isConnected && isRunning ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              {isConnected && isRunning ? 'LIVE DATA' : 'NO DATA'}
            </div>
            <div className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-500">
              ACTIVE: {activeAlgorithm.toUpperCase()}
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Live Algorithm Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label>Current Algorithm:</Label>
                <div className="flex items-center space-x-2">
                  <span className={activeAlgorithm === 'scan' ? 'font-medium' : 'text-muted-foreground'}>SCAN</span>
                  <Switch
                    checked={activeAlgorithm === 'hybrid'}
                    onCheckedChange={handleAlgorithmSwitch}
                    disabled={isLoading || !isConnected}
                  />
                  <span className={activeAlgorithm === 'hybrid' ? 'font-medium' : 'text-muted-foreground'}>Hybrid</span>
                  {isLoading && (
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  )}
                </div>
              </div>

              {/* Status Messages */}
              {switchError && (
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800 dark:text-red-200">{switchError}</span>
                </div>
              )}

              {!isConnected && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 dark:text-yellow-200">
                    Not connected to server. Algorithm switching disabled.
                  </span>
                </div>
              )}

              {isConnected && !isRunning && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    Simulation not running. Start simulation to see live algorithm performance.
                  </span>
                </div>
              )}
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="metric" 
                  fontSize={12}
                  tick={{ fontSize: 10 }}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value} ${props.payload.unit}`,
                    name === 'hybrid' ? 'Hybrid Scheduler' : 'SCAN Algorithm'
                  ]}
                />
                <Legend />
                <Bar 
                  dataKey="hybrid" 
                  fill="#3b82f6" 
                  name="Hybrid Scheduler"
                  opacity={activeAlgorithm === 'hybrid' ? 1 : 0.7}
                />
                <Bar 
                  dataKey="scan" 
                  fill="#8b5cf6" 
                  name="SCAN Algorithm"
                  opacity={activeAlgorithm === 'scan' ? 1 : 0.7}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(algorithmDetails).map(([key, details]) => (
            <Card 
              key={key} 
              className={`${activeAlgorithm === key ? 'ring-2 ring-primary bg-primary/5' : ''} transition-all duration-200`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4" />
                  {details.name}
                  {activeAlgorithm === key && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">ACTIVE</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{details.description}</p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Advantages</h4>
                    <ul className="text-xs space-y-1">
                      {details.advantages.map((advantage, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="text-green-500">•</span>
                          {advantage}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Trade-offs</h4>
                    <ul className="text-xs space-y-1">
                      {details.disadvantages.map((disadvantage, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="text-red-500">•</span>
                          {disadvantage}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {activeAlgorithm === key && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800 dark:text-green-200">
                        Currently processing all elevator requests
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Hybrid Scheduler</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wait Time:</span>
                    <span className="font-medium">{comparisonData[0]?.hybrid || 0}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilization:</span>
                    <span className="font-medium">{comparisonData[2]?.hybrid || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Satisfaction:</span>
                    <span className="font-medium">{comparisonData[4]?.hybrid || 0}%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">SCAN Algorithm</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wait Time:</span>
                    <span className="font-medium">{comparisonData[0]?.scan || 0}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilization:</span>
                    <span className="font-medium">{comparisonData[2]?.scan || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Satisfaction:</span>
                    <span className="font-medium">{comparisonData[4]?.scan || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1 font-mono">
                <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
                <div>Running: {isRunning ? 'Yes' : 'No'}</div>
                <div>Active Algorithm: {activeAlgorithm}</div>
                <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
                <div>Error: {switchError || 'None'}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default AlgorithmComparison