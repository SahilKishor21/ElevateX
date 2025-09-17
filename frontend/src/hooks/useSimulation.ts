import { useCallback, useEffect, useState } from 'react'
import { useElevatorStore } from '@/store/elevatorStore'
import { useWebSocket } from './useWebSocket'
import { generateId } from '@/lib/utils'
import { RequestType, RequestPriority } from '@/types/request'
import type { DirectionType } from '@/types/elevator'

export const useSimulation = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(0)

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

  const handleStart = useCallback(async () => {
    if (!isConnected) return
    setIsLoading(true)
    try {
      startSimulation(config)
    } finally {
      setTimeout(() => setIsLoading(false), 1000)
    }
  }, [isConnected, startSimulation, config])

  const handleStop = useCallback(() => {
    if (!isConnected) return
    stopSimulation()
  }, [isConnected, stopSimulation])

  const handleReset = useCallback(() => {
    if (!isConnected) return
    resetSimulation()
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
      type: 'floor_call', // FIXED: Use string instead of enum
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

  // NEW: Complete request with origin AND destination
  const addCompleteRequest = useCallback((originFloor: number, destinationFloor: number) => {
    if (!isConnected) return

    const direction = destinationFloor > originFloor ? 'up' : 'down'
    
    const request = {
      id: generateId(),
      type: 'floor_call', // FIXED: Use string instead of enum
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

  // Keep original addFloorCall for floor button presses
  const addFloorCall = useCallback((floor: number, direction: 'up' | 'down') => {
    addFloorRequest(floor, direction as DirectionType)
    
    const request = {
      id: generateId(),
      type: 'floor_call', // FIXED: Use string instead of enum
      originFloor: floor,
      destinationFloor: null, // Floor button press - no destination yet
      direction,
      timestamp: Date.now(),
      priority: RequestPriority.NORMAL,
      waitTime: 0,
      assignedElevator: null,
      isActive: true,
      isServed: false,
      passengerCount: 1,
    }

    console.log('Adding floor call:', request)
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
      addCompleteRequest, // ADDED: The missing function
      generateRandomRequest,
      generatePeakTraffic,
    },
  }
}