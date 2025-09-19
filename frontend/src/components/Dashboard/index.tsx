'use client'

import React from 'react'
import { Clock, Users, Zap, TrendingUp, Activity, AlertTriangle, Target, Award } from 'lucide-react'
import { useSimulation } from '@/hooks/useSimulation'
import { useMetrics } from '@/hooks/useMetrics' 
import MetricsCard from '@/components/Dashboard/MetricsCard' 
import LiveIndicator from '@/components/Dashboard/LiveIndicator' 

const Dashboard: React.FC = () => {
  const { elevators, isRunning, config, isConnected, activeRequests } = useSimulation()
  
  const {
    raw: performanceMetrics,
    realTime: realTimeMetrics,
    formatted: formattedMetrics,
    grade: performanceGrade,
    health: systemHealth,
    assignment: assignmentMetrics 
  } = useMetrics()

  // FIXED: Calculate metrics from actual real-time data
  const systemMetrics = {
    activeElevators: elevators.filter(e => e.state !== 'idle').length,
    totalElevators: elevators?.length || 0,
    pendingRequests: realTimeMetrics.activeRequests || activeRequests?.length || 0,
    avgWaitTime: formattedMetrics.averageWaitTime || '0s',
    systemHealth: systemHealth.score || 100,
    
    // FIXED: Correct utilization calculation - use real elevator states
    utilization: elevators?.length > 0 
      ? Math.round((elevators.filter(e => e.state !== 'idle').length / elevators.length) * 100)
      : 0,
    
    // FIXED: Use real-time alerts count for starvation events
    starvationEvents: realTimeMetrics.alertsCount || realTimeMetrics.starvationAlerts || 0,
    
    // ASSIGNMENT: Assignment-specific metrics with fallbacks
    assignmentCompliance: formattedMetrics.assignmentCompliance || '100%',
    peakHourStatus: assignmentMetrics?.isPeakHour ? 'PEAK HOUR' : 'NORMAL',
    
    // FIXED: Calculate lobby traffic from actual active requests
    lobbyTrafficPercentage: (() => {
      if (!activeRequests || activeRequests.length === 0) return 0
      const lobbyRequests = activeRequests.filter(r => r.originFloor === 1 && r.destinationFloor != null && r.destinationFloor > 5).length
      const totalRequests = activeRequests.length
      return totalRequests > 0 ? Math.round((lobbyRequests / totalRequests) * 100) : 0
    })()
  }

  // FIXED: Calculate detailed utilization for each elevator
  const detailedUtilization = elevators?.map(elevator => {
    const loadFactor = elevator.capacity > 0 ? (elevator.passengers?.length || 0) / elevator.capacity : 0
    const activityFactor = elevator.state !== 'idle' ? 1 : 0
    const queueFactor = Math.min((elevator.requestQueue?.length || 0) / 5, 1)
    
    // Weighted utilization: 40% capacity, 40% activity, 20% pending work
    return (loadFactor * 0.4) + (activityFactor * 0.4) + (queueFactor * 0.2)
  }) || []

  // FIXED: Average utilization from detailed calculation
  const avgDetailedUtilization = detailedUtilization.length > 0
    ? Math.round((detailedUtilization.reduce((a, b) => a + b, 0) / detailedUtilization.length) * 100)
    : 0

  // FIXED: Get health status color based on actual health score
  const getHealthColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-600 dark:text-green-400', status: 'Excellent' }
    if (score >= 60) return { bg: 'bg-yellow-100 dark:bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', status: 'Good' }
    if (score >= 40) return { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', status: 'Warning' }
    return { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400', status: 'Critical' }
  }

  const healthColor = getHealthColor(systemMetrics.systemHealth)

  // FIXED: Calculate current hour peak status
  const currentHour = new Date().getHours()
  const isPeakHourByTime = [8, 9, 12, 13, 17, 18].includes(currentHour)
  const actualPeakStatus = isPeakHourByTime ? 'PEAK HOUR' : 'NORMAL'

  return (
    <div className="p-6 h-full bg-slate-100 text-gray-900 overflow-auto dark:bg-gray-900 dark:text-white">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Performance Dashboard</h1>
          <p className="text-gray-500 dark:text-slate-400">Real-time elevator system analytics and insights</p>
        </div>
        <div className="flex items-center gap-4">
          <LiveIndicator isLive={isConnected && isRunning} />
          {/* FIXED: Use time-based peak hour detection */}
          {isPeakHourByTime && (
            <div className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-medium border border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30">
              {actualPeakStatus}
            </div>
          )}
        </div>
      </div>

      {/* FIXED: Metrics Cards with corrected calculations */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricsCard
          title="Average Wait Time"
          value={systemMetrics.avgWaitTime}
          icon={Clock}
          color="blue"
          trend={performanceMetrics.averageWaitTime <= 15 ? 'down' : 'up'}
          description={performanceMetrics.averageWaitTime <= 15 ? 'Optimal' : 'Needs attention'}
          isLive={isConnected && isRunning}
        />


        <MetricsCard
          title="Active Requests"
          value={systemMetrics.pendingRequests}
          icon={Users}
          color="green"
          trend={systemMetrics.pendingRequests > 10 ? 'up' : 'stable'}
          description={`System load: ${Math.round(realTimeMetrics.systemLoad * 100)}%`}
          isLive={isConnected && isRunning}
        />

         <MetricsCard
          title="Lobby Traffic"
          value={systemMetrics.lobbyTrafficPercentage}
          unit="%"
          icon={TrendingUp}
          color="blue"
          trend="stable"
          description={isPeakHourByTime ? `Peak hour (target: 70%)` : "Normal operations"}
          isLive={isConnected && isRunning}
        />

        <MetricsCard
          title="Starvation Events"
          value={systemMetrics.starvationEvents}
          icon={AlertTriangle}
          color={systemMetrics.starvationEvents === 0 ? 'green' : 'red'}
          trend={systemMetrics.starvationEvents === 0 ? 'down' : 'up'}
          description={systemMetrics.starvationEvents === 0 ? "No starving requests" : `${systemMetrics.starvationEvents} requests waiting >30s`}
          isLive={isConnected && isRunning}
        />
      </div>

      {/* FIXED: Assignment Compliance Row with corrected calculations */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      </div>

      {/* System Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white p-6 rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">System Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Simulation Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isRunning 
                  ? 'bg-green-100 text-green-600 border border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30' 
                  : 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30'
              }`}>
                {isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Connection Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isConnected 
                  ? 'bg-green-100 text-green-600 border border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30' 
                  : 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/20 red:text-red-400 dark:border-red-500/30'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Total Floors</span>
              <span className="text-gray-900 font-medium dark:text-white">{config.numFloors}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Elevator Capacity</span>
              <span className="text-gray-900 font-medium dark:text-white">{config.capacity} each</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Simulation Speed</span>
              <span className="text-gray-900 font-medium dark:text-white">{config.speed}x</span>
            </div>
            {/* FIXED: Real-time current time */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Current Time</span>
              <span className="text-gray-900 font-medium dark:text-white">{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Peak Hour Status</span>
              <span className={`text-gray-900 font-medium dark:text-white ${isPeakHourByTime ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                {actualPeakStatus}
              </span>
            </div>
            {/* FIXED: Show detailed utilization breakdown */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Detailed Utilization</span>
              <span className="text-gray-900 font-medium dark:text-white">
                Simple: {systemMetrics.utilization}% | Complex: {avgDetailedUtilization}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Elevator Status</h3>
            {/* FIXED: Show total passenger count */}
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {elevators.reduce((sum, e) => sum + (e.passengers?.length || 0), 0)} total passengers
            </span>
          </div>
          <div className="space-y-3">
            {elevators.map((elevator, index) => {
              // FIXED: Calculate individual elevator utilization
              const loadFactor = elevator.capacity > 0 ? (elevator.passengers?.length || 0) / elevator.capacity : 0
              const activityFactor = elevator.state !== 'idle' ? 1 : 0
              const queueFactor = Math.min((elevator.requestQueue?.length || 0) / 5, 1)
              const elevatorUtil = Math.round(((loadFactor * 0.4) + (activityFactor * 0.4) + (queueFactor * 0.2)) * 100)
              
              return (
                <div key={elevator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: elevator.color }}
                    />
                    <span className="text-gray-900 font-medium dark:text-white">Elevator {elevator.id + 1}</span>
                    {/* FIXED: Show passenger count and utilization */}
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      ({elevator.passengers?.length || 0}/{elevator.capacity}) - {elevatorUtil}% util
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-900 font-medium dark:text-white">Floor {elevator.currentFloor}</div>
                    <div className="text-gray-500 text-sm capitalize dark:text-slate-400 flex items-center gap-2">
                      {elevator.state.replace('_', ' ')}
                      {/* ASSIGNMENT: Show door status */}
                      {elevator.doorOpen && (
                        <span className="text-xs text-blue-500 dark:text-blue-400">🚪 Open</span>
                      )}
                      {/* ASSIGNMENT: Show queue length */}
                      {elevator.requestQueue?.length > 0 && (
                        <span className="text-xs text-orange-500 dark:text-orange-400">
                          Queue: {elevator.requestQueue.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* FIXED: System Health Issues with better detection */}
          {(systemHealth.issues.length > 0 || systemMetrics.starvationEvents > 0) && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-2">System Alerts:</h4>
              <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                {systemHealth.issues.map((issue, idx) => (
                  <li key={idx}>• {issue}</li>
                ))}
                {systemMetrics.starvationEvents > 0 && (
                  <li>• {systemMetrics.starvationEvents} requests waiting too long (CRITICAL)</li>
                )}
                {avgDetailedUtilization > 90 && (
                  <li>• System overloaded - {avgDetailedUtilization}% utilization</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* DEBUG: Show calculation details (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg dark:bg-gray-800 text-xs">
          <strong>Debug Info:</strong><br/>
          Active Requests: {activeRequests?.length || 0}<br/>
          Lobby Requests: {activeRequests?.filter(r => r.originFloor === 1 && r.destinationFloor != null && r.destinationFloor > 5).length || 0}<br/>
          RealTime Alerts: {realTimeMetrics.alertsCount}<br/>
          RealTime Starvation: {realTimeMetrics.starvationAlerts}<br/>
          Assignment Starvation: {assignmentMetrics?.starvationEvents}<br/>
          Simple Utilization: {systemMetrics.utilization}%<br/>
          Detailed Utilization: {avgDetailedUtilization}%<br/>
        </div>
      )}
    </div>
  )
}

export default Dashboard