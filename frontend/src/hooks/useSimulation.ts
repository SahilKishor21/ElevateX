import { useCallback, useEffect, useState } from 'react'
import { useElevatorStore } from '@/store/elevatorStore'
import { useWebSocket } from './useWebSocket'
import { generateId } from '@/lib/utils'
import { RequestType, RequestPriority } from '@/types/request'
import type { DirectionType } from '@/types/elevator'

export const useSimulation = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(0)
  const [hasBeenStarted, setHasBeenStarted] = useState(false) // Track if simulation was ever started

  const {
    elevators,
    config,
    isRunning,
    floorRequests,
    activeRequests,
    updateConfig,
    addFloorRequest,
  } = useElevatorStore()

  const {
    isConnected,
    startSimulation,
    stopSimulation,
    resetSimulation,
    addRequest,
    updateConfig: updateServerConfig,
  } = useWebSocket()

  // FIXED: Distinguish between initial start and restart
  const handleStart = useCallback(async () => {
    if (!isConnected) return
    setIsLoading(true)
    try {
      // Only pass config on initial start, not on restart
      if (!hasBeenStarted) {
        startSimulation(config) // Initial start with config
        setHasBeenStarted(true)
      } else {
        startSimulation() // Restart without config to preserve state
      }
    } finally {
      setTimeout(() => setIsLoading(false), 1000)
    }
  }, [isConnected, startSimulation, config, hasBeenStarted])

  const handleStop = useCallback(() => {
    if (!isConnected) return
    stopSimulation()
    // Note: Don't reset hasBeenStarted here - we want to preserve it for restart
  }, [isConnected, stopSimulation])

  const handleReset = useCallback(() => {
    if (!isConnected) return
    resetSimulation()
    setHasBeenStarted(false) // Reset the flag on explicit reset
  }, [isConnected, resetSimulation])

  const handleConfigChange = useCallback((updates: any) => {
    updateConfig(updates)
    if (isConnected) {
      updateServerConfig(updates)
    }
  }, [updateConfig, updateServerConfig, isConnected])

  const generateRandomRequest = useCallback(() => {
    if (!isConnected || config.numFloors < 2) return

    const originFloor = Math.floor(Math.random() * config.numFloors) + 1
    let destinationFloor = Math.floor(Math.random() * config.numFloors) + 1
    
    while (destinationFloor === originFloor) {
      destinationFloor = Math.floor(Math.random() * config.numFloors) + 1
    }

    const request = {
      id: generateId(),
      type: 'floor_call',
      originFloor,
      destinationFloor,
      direction: (destinationFloor > originFloor ? 'up' : 'down'),
      timestamp: Date.now(),
      priority: RequestPriority.NORMAL,
      waitTime: 0,
      assignedElevator: null,
      isActive: true,
      isServed: false,
      passengerCount: Math.floor(Math.random() * 4) + 1,
    }

    console.log('Generating random request:', request)
    addRequest(request)
  }, [isConnected, config.numFloors, addRequest])

  const addCompleteRequest = useCallback((originFloor: number, destinationFloor: number) => {
    if (!isConnected) return

    const direction = destinationFloor > originFloor ? 'up' : 'down'
    
    const request = {
      id: generateId(),
      type: 'floor_call',
      originFloor,
      destinationFloor,
      direction,
      timestamp: Date.now(),
      priority: RequestPriority.NORMAL,
      waitTime: 0,
      assignedElevator: null,
      isActive: true,
      isServed: false,
      passengerCount: 1,
    }

    console.log('Adding complete request:', request)
    addRequest(request)
  }, [isConnected, addRequest])

  const addFloorCall = useCallback((floor: number, direction: 'up' | 'down') => {
    console.log(`Adding floor call: Floor ${floor}, Direction: ${direction}`)
    
    addFloorRequest(floor, direction)
    
    const request = {
      id: generateId(),
      type: 'floor_call',
      originFloor: floor,
      destinationFloor: null,
      direction,
      timestamp: Date.now(),
      priority: RequestPriority.NORMAL,
      waitTime: 0,
      assignedElevator: null,
      isActive: true,
      isServed: false,
      passengerCount: 1,
    }

    console.log('Adding floor call request:', request)
    addRequest(request)
  }, [addFloorRequest, addRequest])

  const generatePeakTraffic = useCallback(() => {
    if (!isConnected) return

    console.log('Generating peak traffic...')
    const requestCount = Math.floor(Math.random() * 10) + 5
    for (let i = 0; i < requestCount; i++) {
      setTimeout(() => generateRandomRequest(), i * 200)
    }
  }, [isConnected, generateRandomRequest])

  const getSystemStatus = useCallback(() => {
    const totalElevators = elevators.length
    const activeElevators = elevators.filter(e => e.state !== 'idle').length
    const utilizationRate = totalElevators > 0 ? activeElevators / totalElevators : 0
    
    console.log('System Status - Floor Requests:', floorRequests.length)
    
    return {
      totalElevators,
      activeElevators,
      utilizationRate,
      pendingRequests: activeRequests.length,
      floorRequestsCount: floorRequests.length,
      isHealthy: utilizationRate < 0.9 && activeRequests.length < 50,
    }
  }, [elevators, activeRequests, floorRequests])

  useEffect(() => {
    if (isRunning) {
      setLastUpdate(Date.now())
    }
  }, [elevators, isRunning])

  // Reset hasBeenStarted flag when simulation is reset externally
  useEffect(() => {
    if (!isRunning && activeRequests.length === 0 && elevators.length === 0) {
      setHasBeenStarted(false)
    }
  }, [isRunning, activeRequests.length, elevators.length])

  useEffect(() => {
    console.log('useSimulation - Floor Requests updated:', floorRequests)
  }, [floorRequests])

  return {
    isRunning,
    isLoading,
    isConnected,
    lastUpdate,
    elevators,
    config,
    activeRequests,
    floorRequests,
    systemStatus: getSystemStatus(),
    actions: {
      start: handleStart,
      stop: handleStop,
      reset: handleReset,
      updateConfig: handleConfigChange,
      addFloorCall,
      addCompleteRequest,
      generateRandomRequest,
      generatePeakTraffic,
    },
  }
}