'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Zap, Activity, CheckCircle, AlertCircle, Info, TrendingUp, Clock, Users, Gauge } from 'lucide-react'
import { useSimulation } from '@/hooks/useSimulation'

interface AlgorithmMetrics {
  algorithm: string
  averageWaitTime: number
  maxWaitTime: number
  utilization: number
  throughput: number
  satisfaction: number
  efficiency: number
  totalRequests: number
  activeRequests: number
  servedRequests: number
  isCurrentlyActive: boolean
  source: string
}

interface ComparisonData {
  hybrid: AlgorithmMetrics
  scan: AlgorithmMetrics
  currentAlgorithm: 'hybrid' | 'scan'
  recommendation: 'hybrid' | 'scan'
  timestamp: string
  debug?: {
    currentSource: string
    alternativeSource: string
    trafficAnalysis?: {
      totalRequests: number
      lobbyTraffic: number
      interFloorTraffic: number
      complexityScore: number
      isHighLoad: boolean
      isComplexPattern: boolean
    }
    inputData: {
      elevators: number
      requests: number
      served: number
      active: number
    }
  }
}

interface ChartDataPoint {
  metric: string
  hybrid: number
  scan: number
  unit: string
  icon: React.ComponentType<{ className?: string }>
}

const AlgorithmComparison: React.FC = () => {
  const [activeAlgorithm, setActiveAlgorithm] = useState<'hybrid' | 'scan'>('hybrid')
  const [isLoading, setIsLoading] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  
  const chartData: ChartDataPoint[] = comparisonData ? [
    {
      metric: 'Avg Wait Time',
      hybrid: Number(comparisonData.hybrid.averageWaitTime?.toFixed(1)) || 0,
      scan: Number(comparisonData.scan.averageWaitTime?.toFixed(1)) || 0,
      unit: 'seconds',
      icon: Clock
    },
    {
      metric: 'Max Wait Time', 
      hybrid: Number(comparisonData.hybrid.maxWaitTime?.toFixed(1)) || 0,
      scan: Number(comparisonData.scan.maxWaitTime?.toFixed(1)) || 0,
      unit: 'seconds',
      icon: Clock
    },
    {
      metric: 'Utilization',
      hybrid: Number(comparisonData.hybrid.utilization?.toFixed(1)) || 0,
      scan: Number(comparisonData.scan.utilization?.toFixed(1)) || 0,
      unit: '%',
      icon: Gauge
    },
    {
      metric: 'Throughput',
      hybrid: Number(comparisonData.hybrid.throughput?.toFixed(1)) || 0,
      scan: Number(comparisonData.scan.throughput?.toFixed(1)) || 0,
      unit: 'req/hr',
      icon: TrendingUp
    },
    {
      metric: 'Satisfaction',
      hybrid: Number(comparisonData.hybrid.satisfaction?.toFixed(0)) || 0,
      scan: Number(comparisonData.scan.satisfaction?.toFixed(0)) || 0,
      unit: '%',
      icon: Users
    },
    {
      metric: 'Efficiency',
      hybrid: Number(comparisonData.hybrid.efficiency?.toFixed(1)) || 0,
      scan: Number(comparisonData.scan.efficiency?.toFixed(1)) || 0,
      unit: 'req/dist',
      icon: Zap
    }
  ] : []

  const { isConnected, isRunning } = useSimulation()

  useEffect(() => {
    console.log('AlgorithmComparison - Connection status:', { isConnected, isRunning })
  }, [isConnected, isRunning])

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

  useEffect(() => {
    const fetchComparisonData = async () => {
      console.log('Fetching algorithm comparison data...')
      try {
        const response = await fetch('http://localhost:3001/api/algorithm-comparison')
        console.log('API Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data: ComparisonData = await response.json()
        console.log('API Response data:', data)
        
        if (data.hybrid && data.scan) {
          console.log('Updating comparison data with:', {
            hybrid: data.hybrid,
            scan: data.scan,
            currentAlgorithm: data.currentAlgorithm,
            recommendation: data.recommendation,
            debug: data.debug
          })
          if (data.currentAlgorithm && data.currentAlgorithm !== activeAlgorithm) {
            console.log('Updating active algorithm to:', data.currentAlgorithm)
            setActiveAlgorithm(data.currentAlgorithm)
          }
          
          setComparisonData(data)
        } else {
          console.warn('Invalid data structure received:', data)
        }
      } catch (error) {
        console.error('Failed to fetch algorithm comparison:', error)
      }
    }

    if (isConnected) {
      fetchComparisonData()
      const interval = setInterval(fetchComparisonData, 3000)
      return () => clearInterval(interval)
    }
  }, [isConnected, activeAlgorithm])

  const algorithmDetails = {
    hybrid: {
      name: 'Hybrid Dynamic Scheduler',
      shortName: 'Hybrid',
      description: 'Advanced algorithm with priority-based scheduling, starvation prevention, and traffic pattern optimization',
      advantages: [
        'Prevents request starvation',
        'Better individual response times',
        'Dynamic load balancing', 
        'Handles complex traffic patterns',
        'Priority-aware scheduling'
      ],
      disadvantages: [
        'Higher computational complexity',
        'Lower pure throughput',
        'More distance traveled',
        'Complex parameter tuning'
      ],
      bestFor: ['Mixed traffic patterns', 'Priority requests', 'User satisfaction focus']
    },
    scan: {
      name: 'SCAN Elevator Algorithm',
      shortName: 'SCAN',
      description: 'Traditional elevator algorithm based on disk scheduling - sweeps up and down continuously serving requests in floor order',
      advantages: [
        'High throughput performance',
        'Excellent utilization',
        'Low computational overhead',
        'Predictable sweep patterns',
        'Simple implementation'
      ],
      disadvantages: [
        'Potential request starvation',
        'Higher average wait times',
        'Poor priority handling',
        'Sweep pattern delays',
        'Less user satisfaction'
      ],
      bestFor: ['High-load scenarios', 'Simple traffic patterns', 'Throughput priority']
    }
  }

  // Switch algorithm in the backend
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
          console.log(`Algorithm switched to ${algorithm}`)
          
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
     
      setActiveAlgorithm(activeAlgorithm)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAlgorithmSwitch = (checked: boolean) => {
    const newAlgorithm = checked ? 'hybrid' : 'scan'
    
    if (newAlgorithm !== activeAlgorithm && !isLoading) {
      switchAlgorithm(newAlgorithm)
    }
  }

  const getPerformanceIndicator = (metric: string, hybridValue: number, scanValue: number) => {
    const isWaitTime = metric.includes('Wait Time')
    const threshold = 0.05 
    
    if (isWaitTime) {
      if (hybridValue < scanValue * (1 - threshold)) return 'hybrid-better'
      if (scanValue < hybridValue * (1 - threshold)) return 'scan-better'
    } else {
      if (hybridValue > scanValue * (1 + threshold)) return 'hybrid-better'
      if (scanValue > hybridValue * (1 + threshold)) return 'scan-better'
    }
    
    return 'equal'
  }

  const getAlgorithmData = (algorithmKey: 'hybrid' | 'scan'): AlgorithmMetrics | null => {
    return comparisonData?.[algorithmKey] || null
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gradient">Algorithm Comparison</h1>
            <p className="text-sm text-muted-foreground">
              Real-time performance comparison between SCAN and Hybrid algorithms using actual simulation data
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

              {/* Enhanced Status Messages */}
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

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="metric" 
                  fontSize={12}
                  tick={{ fontSize: 10 }}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => {
                    const indicator = getPerformanceIndicator(props.payload.metric, props.payload.hybrid, props.payload.scan)
                    const isBetter = (name === 'Hybrid Dynamic' && indicator === 'hybrid-better') || 
                                   (name === 'SCAN Algorithm' && indicator === 'scan-better')
                    return [
                      <span key={name} style={{ color: isBetter ? '#22c55e' : 'inherit', fontWeight: isBetter ? 'bold' : 'normal' }}>
                        {`${value} ${props.payload.unit}`} {isBetter && '★'}
                      </span>,
                      name === 'Hybrid Dynamic' ? 'Hybrid Dynamic' : 'SCAN Algorithm'
                    ]
                  }}
                  labelFormatter={(label) => `Performance Metric: ${label}`}
                />
                <Legend />
                <Bar 
                  dataKey="hybrid" 
                  fill="#3b82f6" 
                  name="Hybrid Dynamic"
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
          {Object.entries(algorithmDetails).map(([key, details]) => {
            const algorithmKey = key as 'hybrid' | 'scan'
            const data = getAlgorithmData(algorithmKey)
            
            return (
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
                    {comparisonData?.recommendation === key && key !== activeAlgorithm && (
                      <Badge variant="outline" className="text-xs">RECOMMENDED</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{details.description}</p>
                  
                  {/* Current Performance Stats */}
                  {data && (
                    <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Current Performance</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Wait Time: <span className="font-medium">{data.averageWaitTime?.toFixed(1)}s</span></div>
                        <div>Throughput: <span className="font-medium">{data.throughput?.toFixed(1)}</span></div>
                        <div>Utilization: <span className="font-medium">{data.utilization?.toFixed(1)}%</span></div>
                        <div>Satisfaction: <span className="font-medium">{data.satisfaction?.toFixed(0)}%</span></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Strengths</h4>
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

                    <div>
                      <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Best For</h4>
                      <div className="flex flex-wrap gap-1">
                        {details.bestFor.map((scenario, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{scenario}</Badge>
                        ))}
                      </div>
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
            )
          })}
        </div>

        {/* Enhanced Performance Summary */}
        {comparisonData && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5" />
                  Performance Analysis
                </CardTitle>
                <button 
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {showDebugInfo ? 'Hide' : 'Show'} Details
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {Object.entries(algorithmDetails).map(([key, details]) => {
                  const algorithmKey = key as 'hybrid' | 'scan'
                  const data = getAlgorithmData(algorithmKey)
                  
                  return (
                    <div key={key} className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        {details.shortName}
                        {activeAlgorithm === key && <Badge variant="default" className="text-xs">ACTIVE</Badge>}
                        {comparisonData.recommendation === key && <Badge variant="outline" className="text-xs">REC</Badge>}
                      </h4>
                      {data && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Wait Time:</span>
                            <span className="font-medium">{data.averageWaitTime?.toFixed(1)}s</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Wait:</span>
                            <span className="font-medium">{data.maxWaitTime?.toFixed(1)}s</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Utilization:</span>
                            <span className="font-medium">{data.utilization?.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Throughput:</span>
                            <span className="font-medium">{data.throughput?.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Satisfaction:</span>
                            <span className="font-medium">{data.satisfaction?.toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Efficiency:</span>
                            <span className="font-medium">{data.efficiency?.toFixed(1)}</span>
                          </div>
                        </div>
                      )}
                      
                      {showDebugInfo && data && (
                        <div className="text-xs text-muted-foreground border-t pt-2">
                          <div>Source: {data.source}</div>
                          <div>Requests: {data.totalRequests} total, {data.servedRequests} served, {data.activeRequests} active</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Traffic Analysis */}
              {showDebugInfo && comparisonData.debug?.trafficAnalysis && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-t">
                  <h4 className="font-medium mb-2">Traffic Analysis</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Total Requests:</span>
                      <span className="ml-2 font-medium">{comparisonData.debug.trafficAnalysis.totalRequests}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lobby Traffic:</span>
                      <span className="ml-2 font-medium">{comparisonData.debug.trafficAnalysis.lobbyTraffic}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Inter-floor:</span>
                      <span className="ml-2 font-medium">{comparisonData.debug.trafficAnalysis.interFloorTraffic}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Complexity:</span>
                      <span className="ml-2 font-medium">{(comparisonData.debug.trafficAnalysis.complexityScore * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    {comparisonData.debug.trafficAnalysis.isHighLoad && (
                      <Badge variant="destructive" className="text-xs">High Load</Badge>
                    )}
                    {comparisonData.debug.trafficAnalysis.isComplexPattern && (
                      <Badge variant="secondary" className="text-xs">Complex Pattern</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Debug Info (development only) */}
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
                <div>Last Update: {comparisonData?.timestamp || 'Never'}</div>
                {comparisonData?.debug && (
                  <div>Data Sources: {comparisonData.debug.currentSource} vs {comparisonData.debug.alternativeSource}</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default AlgorithmComparison