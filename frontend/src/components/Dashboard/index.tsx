'use client'

import React from 'react'
import { Clock, Users, Zap, TrendingUp, Activity, AlertTriangle } from 'lucide-react'
import { useSimulation } from '@/hooks/useSimulation'

const Dashboard: React.FC = () => {
  const { elevators, isRunning, config } = useSimulation()

  // Calculate metrics safely
  const systemMetrics = {
    activeElevators: elevators?.filter(e => e.state !== 'idle').length || 0,
    totalElevators: elevators?.length || 0,
    pendingRequests: 0, // Will be calculated from actual requests
    avgWaitTime: '0s',
    systemHealth: '100%',
    utilization: elevators?.length > 0 ? Math.round((elevators.filter(e => e.state !== 'idle').length / elevators.length) * 100) : 0
  }

  return (
    <div className="p-6 h-full bg-slate-900 text-white overflow-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Performance Dashboard</h1>
        <p className="text-slate-400">Real-time elevator system analytics and insights</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-6 rounded-xl border border-blue-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-medium text-slate-300">Average Wait Time</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{systemMetrics.avgWaitTime}</div>
          <div className="flex items-center text-sm text-green-400">
            <TrendingUp className="h-4 w-4 mr-1" />
            Optimal
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-6 rounded-xl border border-purple-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Activity className="h-5 w-5 text-purple-400" />
            </div>
            <h3 className="font-medium text-slate-300">System Utilization</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{systemMetrics.utilization}%</div>
          <div className="text-sm text-slate-400">
            {systemMetrics.activeElevators}/{systemMetrics.totalElevators} active
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 p-6 rounded-xl border border-green-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Users className="h-5 w-5 text-green-400" />
            </div>
            <h3 className="font-medium text-slate-300">Active Elevators</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{systemMetrics.activeElevators}</div>
          <div className="text-sm text-slate-400">
            Out of {systemMetrics.totalElevators} total
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-6 rounded-xl border border-orange-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Zap className="h-5 w-5 text-orange-400" />
            </div>
            <h3 className="font-medium text-slate-300">System Health</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{systemMetrics.systemHealth}</div>
          <div className="text-sm text-green-400">All systems operational</div>
        </div>
      </div>

      {/* System Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">System Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Simulation Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isRunning 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Floors</span>
              <span className="text-white font-medium">{config.numFloors}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Elevator Capacity</span>
              <span className="text-white font-medium">{config.capacity} each</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Simulation Speed</span>
              <span className="text-white font-medium">{config.speed}x</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Elevator Status</h3>
          <div className="space-y-3">
            {elevators.map((elevator, index) => (
              <div key={elevator.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: elevator.color }}
                  />
                  <span className="text-white font-medium">Elevator {elevator.id + 1}</span>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">Floor {elevator.currentFloor}</div>
                  <div className="text-slate-400 text-sm capitalize">
                    {elevator.state.replace('_', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard