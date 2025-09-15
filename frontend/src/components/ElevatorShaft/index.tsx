'use client'

import React, { useState } from 'react'
import { Play, Pause, RotateCcw, Users, Zap, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { useSimulation } from '@/hooks/useSimulation'

const ControlPanel: React.FC = () => {
  const { isRunning, isConnected, actions } = useSimulation()
  
  // Control states
  const [numElevators, setNumElevators] = useState(3)
  const [numFloors, setNumFloors] = useState(15)
  const [elevatorCapacity, setElevatorCapacity] = useState(8)
  const [requestFrequency, setRequestFrequency] = useState(2)
  const [simulationSpeed, setSimulationSpeed] = useState(1)

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-semibold text-white mb-4">Simulation Controls</h2>
      
      {/* Connection Status */}
      <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-slate-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            {isRunning ? 'Running' : 'Stopped'}
          </div>
        </div>
      </div>
      
      {/* Main Controls */}
      <div className="space-y-3 mb-6">
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
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

      {/* System Parameters */}
      <div className="bg-slate-700/50 rounded-lg p-4 mb-6 border border-slate-600">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">System Parameters</h3>
        </div>
        
        <div className="space-y-6">
          {/* Number of Elevators */}
          <div>
            <Label className="text-sm text-slate-400 mb-2 block">
              Number of Elevators: {numElevators}
            </Label>
            <Slider
              value={[numElevators]}
              onValueChange={(value) => setNumElevators(value[0])}
              max={8}
              min={1}
              step={1}
              disabled={isRunning}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1</span>
              <span>8</span>
            </div>
          </div>
          
          {/* Number of Floors */}
          <div>
            <Label className="text-sm text-slate-400 mb-2 block">
              Number of Floors: {numFloors}
            </Label>
            <Slider
              value={[numFloors]}
              onValueChange={(value) => setNumFloors(value[0])}
              max={50}
              min={5}
              step={1}
              disabled={isRunning}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5</span>
              <span>50</span>
            </div>
          </div>
          
          {/* Elevator Capacity */}
          <div>
            <Label className="text-sm text-slate-400 mb-2 block">
              Elevator Capacity: {elevatorCapacity} people
            </Label>
            <Slider
              value={[elevatorCapacity]}
              onValueChange={(value) => setElevatorCapacity(value[0])}
              max={20}
              min={4}
              step={1}
              disabled={isRunning}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>4 people</span>
              <span>20 people</span>
            </div>
          </div>
          
          {/* Request Frequency */}
          <div>
            <Label className="text-sm text-slate-400 mb-2 block">
              Request Frequency: {requestFrequency} req/min
            </Label>
            <Slider
              value={[requestFrequency]}
              onValueChange={(value) => setRequestFrequency(value[0])}
              max={10}
              min={0.5}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0.5/min</span>
              <span>10/min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Speed */}
      <div className="mb-6">
        <Label className="text-sm font-medium text-slate-300 mb-2 block">
          Simulation Speed: {simulationSpeed}x
        </Label>
        <select 
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          value={simulationSpeed}
          onChange={(e) => setSimulationSpeed(Number(e.target.value))}
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
          <option value="10">10x</option>
        </select>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <Label className="text-sm font-medium text-slate-300 mb-3 block">Quick Actions</Label>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 justify-start"
            onClick={actions.generateRandomRequest}
            disabled={!isConnected}
          >
            <Users className="mr-2 h-3 w-3" />
            Add Random Request
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 justify-start"
            onClick={actions.generatePeakTraffic}
            disabled={!isConnected}
          >
            <Zap className="mr-2 h-3 w-3" />
            Generate Peak Traffic
          </Button>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Configuration Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-slate-400">Total Capacity:</div>
          <div className="text-white font-medium">{numElevators * elevatorCapacity} people</div>
          <div className="text-slate-400">Max Throughput:</div>
          <div className="text-white font-medium">~{Math.round(numElevators * elevatorCapacity * 2)}/hr</div>
        </div>
      </div>

      {/* Status Warnings */}
      {!isConnected && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            Backend connection lost
          </div>
        </div>
      )}

      {isRunning && (
        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
          <div className="text-yellow-400 text-sm">
            Some parameters are locked while simulation is running
          </div>
        </div>
      )}
    </div>
  )
}

export default ControlPanel