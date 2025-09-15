'use client'

import React, { useState } from 'react'
import { Play, Pause, RotateCcw, Users, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSimulation } from '@/hooks/useSimulation'

const ControlPanel: React.FC = () => {
  const { isRunning, isConnected, config, actions } = useSimulation()
  const [simulationSpeed, setSimulationSpeed] = useState('1')

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const speed = parseFloat(e.target.value)
    setSimulationSpeed(e.target.value)
    actions.updateConfig({ speed })
  }

  const handleElevatorsChange = (value: number) => {
    actions.updateConfig({ numElevators: value })
  }

  const handleFloorsChange = (value: number) => {
    actions.updateConfig({ numFloors: value })
  }

  return (
    <div className="p-4 h-full">
      <h2 className="text-lg font-semibold text-white mb-4">Simulation Controls</h2>
      
      {/* Connection Status */}
      <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-slate-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${
            isRunning ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'
          }`}>
            {isRunning ? 'RUNNING' : 'STOPPED'}
          </span>
        </div>
      </div>
      
      {/* Main Controls */}
      <div className="space-y-3 mb-6">
        <Button 
          className={`w-full transition-colors ${
            isRunning 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
          onClick={isRunning ? actions.stop : actions.start}
          disabled={!isConnected}
        >
          {isRunning ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Stop Simulation
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start Simulation
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
          onClick={actions.reset}
          disabled={!isConnected}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset System
        </Button>
      </div>

      {/* Speed Control */}
      <div className="mb-6">
        <label className="text-sm font-medium text-slate-300 mb-2 block">
          Simulation Speed: {simulationSpeed}x
        </label>
        <select 
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          value={simulationSpeed}
          onChange={handleSpeedChange}
          disabled={!isConnected}
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
          <option value="10">10x</option>
        </select>
      </div>

      {/* System Parameters */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-300 mb-3">System Parameters</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm text-slate-400">Elevators</label>
              <span className="text-sm text-white">{config.numElevators}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={config.numElevators}
              onChange={(e) => handleElevatorsChange(parseInt(e.target.value))}
              className="w-full"
              disabled={isRunning}
              title="Set number of elevators"
            />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm text-slate-400">Floors</label>
              <span className="text-sm text-white">{config.numFloors}</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={config.numFloors}
              onChange={(e) => handleFloorsChange(parseInt(e.target.value))}
              className="w-full"
              disabled={isRunning}
              title="Set number of floors"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300 mb-3 block">Quick Actions</label>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 justify-start"
          onClick={actions.generateRandomRequest}
          disabled={!isConnected || !isRunning}
        >
          <Users className="mr-2 h-3 w-3" />
          Add Random Request
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 justify-start"
          onClick={actions.generatePeakTraffic}
          disabled={!isConnected || !isRunning}
        >
          <Zap className="mr-2 h-3 w-3" />
          Generate Peak Traffic
        </Button>
      </div>

      {/* Debug Info */}
      <div className="mt-4 text-xs text-slate-500">
        <div>Elevators: {config.numElevators}</div>
        <div>Floors: {config.numFloors}</div>
        <div>Speed: {config.speed}x</div>
        <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
        <div>Running: {isRunning ? 'Yes' : 'No'}</div>
      </div>
    </div>
  )
}

export default ControlPanel