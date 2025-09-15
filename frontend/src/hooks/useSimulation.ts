'use client'

import { useCallback } from 'react'
import { useElevatorStore } from '@/store/elevatorStore'
import { useWebSocket } from './useWebSocket'

export const useSimulation = () => {
  const {
    elevators,
    config,
    floorRequests,
    activeRequests,
    isRunning,
    isConnected,
    updateConfig: updateStoreConfig,
  } = useElevatorStore()

  const {
    startSimulation: wsStart,
    stopSimulation: wsStop,
    resetSimulation: wsReset,
    addRequest,
    updateConfig: wsUpdateConfig,
  } = useWebSocket()

  const startSimulation = useCallback(() => {
    console.log('Starting simulation with config:', config)
    wsStart(config)
  }, [wsStart, config])

  const stopSimulation = useCallback(() => {
    console.log('Stopping simulation')
    wsStop()
  }, [wsStop])

  const resetSimulation = useCallback(() => {
    console.log('Resetting simulation')
    wsReset()
  }, [wsReset])

  const addFloorCall = useCallback((floor: number, direction: 'up' | 'down') => {
    console.log(`Adding floor call: Floor ${floor}, Direction: ${direction}`)
    const request = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'floor_call',
      originFloor: floor,
      destinationFloor: null,
      direction,
      timestamp: Date.now(),
      priority: 2,
      waitTime: 0,
      assignedElevator: null,
      isActive: true,
      isServed: false,
      passengerCount: 1,
    }
    addRequest(request)
  }, [addRequest])

  const generateRandomRequest = useCallback(() => {
    const originFloor = Math.floor(Math.random() * config.numFloors) + 1
    let destinationFloor = Math.floor(Math.random() * config.numFloors) + 1
    
    while (destinationFloor === originFloor) {
      destinationFloor = Math.floor(Math.random() * config.numFloors) + 1
    }

    const request = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'floor_call',
      originFloor,
      destinationFloor,
      direction: destinationFloor > originFloor ? 'up' : 'down',
      timestamp: Date.now(),
      priority: 2,
      waitTime: 0,
      assignedElevator: null,
      isActive: true,
      isServed: false,
      passengerCount: Math.floor(Math.random() * 4) + 1,
    }

    console.log('Generating random request:', request)
    addRequest(request)
  }, [config.numFloors, addRequest])

  const generatePeakTraffic = useCallback(() => {
    console.log('Generating peak traffic...')
    for (let i = 0; i < 8; i++) {
      setTimeout(() => generateRandomRequest(), i * 300)
    }
  }, [generateRandomRequest])

  const updateConfigAndSync = useCallback((updates: any) => {
    console.log('Updating config:', updates)
    updateStoreConfig(updates)
    wsUpdateConfig(updates)
  }, [updateStoreConfig, wsUpdateConfig])

  return {
    elevators,
    config,
    floorRequests,
    activeRequests,
    isRunning,
    isConnected,
    actions: {
      start: startSimulation,
      stop: stopSimulation,
      reset: resetSimulation,
      addFloorCall,
      generateRandomRequest,
      generatePeakTraffic,
      updateConfig: updateConfigAndSync,
    }
  }
}