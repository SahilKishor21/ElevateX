import { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import { useElevatorStore } from '@/store/elevatorStore'
import { useMetricsStore } from '@/store/metricsStore'
import { WEBSOCKET_EVENTS } from '@/lib/constants'

interface UseWebSocketProps {
  url?: string
  autoConnect?: boolean
}

interface SocketError {
  message: string
}

interface SimulationUpdateData {
  elevators: any[]
  floorRequests: any[]
  activeRequests: any[]
  isRunning: boolean
  currentTime: number
  config?: any
  totalRequests?: number
  // ASSIGNMENT: Add assignment data to interface
  assignmentMetrics?: any
  assignmentCompliance?: any
}

interface MetricsUpdateData {
  performance: any
  realTime: any
  historical?: any
  alerts?: any[]
  timestamp: number
  assignmentMetrics?: any
  assignmentCompliance?: any
}

interface ConfigUpdateResponse {
  success: boolean
  config?: any
  error?: string
  message?: string
}

interface RequestResponse {
  success: boolean
  requestId?: string
  error?: string
}

export const useWebSocket = ({ 
  url = 'https://elevatex-2ght.onrender.com',
  autoConnect = true 
}: UseWebSocketProps = {}) => {
  const socketRef = useRef<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState(0)

  const {
  setElevators,
  setFloorRequests,
  setActiveRequests,
  setIsRunning,
  setCurrentTime,
  updateConfig: updateStoreConfig,
  activeRequests,
  floorRequests,
  setAssignmentMetrics, // ASSIGNMENT: Import assignment setter
} = useElevatorStore()

const {
  updatePerformanceMetrics,
  updateRealTimeMetrics,
  addHistoricalData,
  addAlert,
  updateAssignmentMetrics: updateMetricsAssignmentData, // ASSIGNMENT: Import assignment metrics updater
  updateAssignmentCompliance,
} = useMetricsStore()

  const connect = () => {
    if (socketRef.current?.connected) return

    console.log('Connecting to WebSocket server...')
    socketRef.current = io(url, {
      transports: ['websocket'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    // Expose socket to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).socket = socketRef.current
    }

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      setError(null)
    })

    socketRef.current.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    })

    socketRef.current.on('connect_error', (err: any) => {
      console.error('WebSocket connection error:', err)
      setError(err.message || 'Connection failed')
      setIsConnected(false)
    })

    // ENHANCED: Simulation update handling with assignment metrics
    socketRef.current.on(WEBSOCKET_EVENTS.SIMULATION_UPDATE, (data: SimulationUpdateData) => {
  // Only log when state actually changes
  const currentActive = activeRequests.length
  const currentFloor = floorRequests.length
  const newActive = data.activeRequests?.length || 0
  const newFloor = data.floorRequests?.length || 0
  
  if (currentActive !== newActive || currentFloor !== newFloor) {
    console.log('State Change:', {
      active: `${currentActive} → ${newActive}`,
      floor: `${currentFloor} → ${newFloor}`,
      running: data.isRunning,
      lobbyTraffic: data.assignmentMetrics?.lobbyToUpperRequests || 0 // FIXED: Log assignment data
    })
  }
  
  try {
    if (data.elevators !== undefined) {
      const elevatorsArray = Array.isArray(data.elevators) ? data.elevators : []
      setElevators(elevatorsArray)
    }
    
    if (data.floorRequests !== undefined) {
      const floorRequestsArray = Array.isArray(data.floorRequests) ? data.floorRequests : []
      setFloorRequests(floorRequestsArray)
    }
    
    if (data.activeRequests !== undefined) {
      const activeRequestsArray = Array.isArray(data.activeRequests) ? data.activeRequests : []
      setActiveRequests(activeRequestsArray)
    }
    
    if (data.isRunning !== undefined) {
      setIsRunning(data.isRunning)
    }
    
    if (data.currentTime !== undefined) {
      setCurrentTime(data.currentTime)
    }
    
    if (data.config) {
      updateStoreConfig(data.config)
    }

    // FIXED: Handle assignment metrics from enhanced backend
    if (data.assignmentMetrics) {
      console.log('ASSIGNMENT: Received assignment metrics:', data.assignmentMetrics)
      setAssignmentMetrics(data.assignmentMetrics)
      updateMetricsAssignmentData(data.assignmentMetrics)
    }

    // FIXED: Handle assignment compliance
    if (data.assignmentCompliance) {
      console.log('ASSIGNMENT: Received compliance data:', data.assignmentCompliance)
      updateAssignmentCompliance(data.assignmentCompliance)
    }

    setLastUpdateTime(Date.now())
  } catch (updateError) {
    console.error('State update error:', updateError)
    setError(`State update failed: ${updateError}`)
  }
})

    // ENHANCED: Metrics update handling with assignment data
    socketRef.current.on(WEBSOCKET_EVENTS.METRICS_UPDATE, (data: MetricsUpdateData) => {
  try {
    if (data.performance && typeof data.performance === 'object') {
      console.log('METRICS: Performance update - Starvation:', data.performance.starvationCount, 'Compliance:', data.performance.assignmentCompliance)
      updatePerformanceMetrics(data.performance)
    }
    if (data.realTime && typeof data.realTime === 'object') {
      console.log('METRICS: Real-time update - Alerts:', data.realTime.starvationAlerts, 'Peak:', data.realTime.peakHourStatus)
      updateRealTimeMetrics(data.realTime)
    }
    if (data.historical && typeof data.historical === 'object') {
      addHistoricalData(data.historical)
    }
    if (data.alerts && Array.isArray(data.alerts)) {
      data.alerts.forEach((alert: any) => {
        if (alert && typeof alert === 'object' && alert.id) {
          addAlert(alert)
        }
      })
    }
    
    // FIXED: Handle assignment data in metrics update
    if (data.assignmentMetrics && typeof data.assignmentMetrics === 'object') {
      console.log('METRICS: Assignment metrics update:', data.assignmentMetrics)
      updateMetricsAssignmentData(data.assignmentMetrics)
    }
    
    if (data.assignmentCompliance && typeof data.assignmentCompliance === 'object') {
      console.log('METRICS: Assignment compliance update:', data.assignmentCompliance)
      updateAssignmentCompliance(data.assignmentCompliance)
    }
  } catch (metricsError) {
    console.error('Metrics update error:', metricsError)
  }
})

    // Algorithm update handling
    socketRef.current.on('algorithm_update', (data: any) => {
      // Only log if there's an error or significant change
      if (data.error) {
        console.error('Algorithm update error:', data.error)
      } else if (data.algorithm) {
        console.log(`ASSIGNMENT: Algorithm switched to ${data.algorithm}`)
      }
    })

    socketRef.current.on(WEBSOCKET_EVENTS.CONFIG_UPDATED, (data: ConfigUpdateResponse) => {
      console.log('Config update response:', data.success ? 'Success' : 'Failed')
      if (data.success && data.config) {
        updateStoreConfig(data.config)
        
        // ASSIGNMENT: Log assignment-relevant config changes
        if (data.config.requestFrequency !== undefined) {
          console.log(`ASSIGNMENT: Request frequency updated to ${data.config.requestFrequency}/min`)
        }
      } else if (!data.success && data.error) {
        console.error('Config update failed:', data.error)
        setError(data.error)
      }
    })

    socketRef.current.on('request_added', (data: RequestResponse) => {
      if (data.success) {
        console.log('Request added successfully:', data.requestId)
        setError(null)
      } else if (data.error) {
        console.error('Request add failed:', data.error)
        setError(data.error)
      }
    })

    socketRef.current.on('error', (err: any) => {
      console.error('Socket error:', err)
      setError(err.message || 'Unknown socket error')
    })

    // Connection timeout handling
    const connectionTimeout = setTimeout(() => {
      if (!socketRef.current?.connected) {
        console.warn('Connection timeout - server may be unavailable')
        setError('Connection timeout - server may be unavailable')
      }
    }, 10000) // 10 second timeout

    socketRef.current.on('connect', () => {
      clearTimeout(connectionTimeout)
    })
  }

  const disconnect = () => {
    if (socketRef.current) {
      console.log('Disconnecting WebSocket...')
      socketRef.current.disconnect()
      setIsConnected(false)
    }
  }

  const emit = (event: string, data?: any) => {
    if (!socketRef.current?.connected) {
      const errorMsg = `Not connected to server. Cannot emit ${event}`
      console.error(errorMsg)
      setError(errorMsg)
      return false
    }
    
    try {
      socketRef.current.emit(event, data)
      
      // ASSIGNMENT: Log assignment-relevant emissions
      if (event === WEBSOCKET_EVENTS.ADD_REQUEST && data) {
        console.log('ASSIGNMENT: Emitting request:', `${data.originFloor}→${data.destinationFloor}`)
      }
      
      // Clear error on successful emit
      if (error) {
        setError(null)
      }
      
      return true
    } catch (emitError) {
      console.error(`Error emitting ${event}:`, emitError)
      setError(`Failed to emit ${event}: ${emitError}`)
      return false
    }
  }

  const startSimulation = (config?: any) => {
    console.log('ASSIGNMENT: Starting simulation with config:', config)
    
    // ASSIGNMENT: Log assignment-relevant config
    if (config) {
      console.log('ASSIGNMENT: Config analysis:', {
        elevators: config.numElevators || 'default',
        floors: config.numFloors || 'default',
        frequency: config.requestFrequency || 'default',
        algorithm: 'will be set by backend'
      })
    }
    
    return emit(WEBSOCKET_EVENTS.START_SIMULATION, config)
  }

  const stopSimulation = () => {
    console.log('ASSIGNMENT: Stopping simulation')
    return emit(WEBSOCKET_EVENTS.STOP_SIMULATION)
  }

  const resetSimulation = () => {
    console.log('ASSIGNMENT: Resetting simulation')
    return emit(WEBSOCKET_EVENTS.RESET_SIMULATION)
  }

  const addRequest = (request: any) => {
    // ASSIGNMENT: Enhanced request logging
    const requestType = request.originFloor === 1 && request.destinationFloor > 5 ? 'LOBBY_TO_UPPER' :
                       request.originFloor > 5 && request.destinationFloor === 1 ? 'UPPER_TO_LOBBY' : 'INTER_FLOOR'
    
    console.log('ASSIGNMENT: Adding request:', `${request.originFloor}→${request.destinationFloor} (${requestType})`)
    
    const hour = new Date().getHours()
    const isPeakHour = [8, 9, 12, 13, 17, 18].includes(hour)
    
    if (isPeakHour) {
      console.log(`ASSIGNMENT: Peak hour request (${hour}:00) - ${requestType}`)
    }
    
    return emit(WEBSOCKET_EVENTS.ADD_REQUEST, request)
  }

  const updateConfig = (config: any) => {
    console.log('ASSIGNMENT: Updating config:', config)
    
    // ASSIGNMENT: Log assignment-relevant config changes
    if (config.requestFrequency !== undefined) {
      console.log(`ASSIGNMENT: Request frequency changing to ${config.requestFrequency}/min`)
    }
    if (config.numElevators !== undefined) {
      console.log(`ASSIGNMENT: Elevator count changing to ${config.numElevators}`)
    }
    
    return emit(WEBSOCKET_EVENTS.CONFIG_CHANGE, config)
  }

  const emergencyStop = () => {
    console.log('ASSIGNMENT: Emergency stop initiated')
    return emit(WEBSOCKET_EVENTS.EMERGENCY_STOP)
  }

  const clearError = () => {
    setError(null)
  }

  // ASSIGNMENT: New method to request assignment compliance report
  const requestAssignmentReport = () => {
    console.log('ASSIGNMENT: Requesting compliance report')
    return emit('get_assignment_compliance')
  }

  // ASSIGNMENT: New method to trigger peak traffic simulation
  const triggerPeakTraffic = (type: 'morning' | 'evening' | 'lunch' = 'morning') => {
    console.log(`ASSIGNMENT: Triggering ${type} peak traffic simulation`)
    return emit('trigger_peak_traffic', { type })
  }

  // Connection health monitoring
  useEffect(() => {
    if (!isConnected) return

    const healthCheck = setInterval(() => {
      if (socketRef.current?.connected) {
        // Connection is healthy - could emit a ping here if needed
      } else {
        console.warn('Socket disconnected unexpectedly')
        setIsConnected(false)
      }
    }, 5000)

    return () => clearInterval(healthCheck)
  }, [isConnected])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [url, autoConnect])

  // Reconnection logic on network recovery
  useEffect(() => {
    const handleOnline = () => {
      if (!isConnected && autoConnect) {
        console.log('ASSIGNMENT: Network restored, attempting to reconnect...')
        setTimeout(() => {
          connect()
        }, 1000)
      }
    }

    const handleOffline = () => {
      console.log('ASSIGNMENT: Network lost')
      setError('Network connection lost')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isConnected, autoConnect])

  return {
    isConnected,
    error,
    lastUpdateTime,
    connect,
    disconnect,
    emit,
    startSimulation,
    stopSimulation,
    resetSimulation,
    addRequest,
    updateConfig,
    emergencyStop,
    clearError,
    
    // ASSIGNMENT: New assignment-specific methods
    requestAssignmentReport,
    triggerPeakTraffic,
    
    // Debug utilities
    getSocketInfo: () => ({
      connected: socketRef.current?.connected,
      id: socketRef.current?.id,
      transport: socketRef.current?.io?.engine?.transport?.name
    }),
    
    // ASSIGNMENT: Enhanced store state for debugging
    getCurrentStoreState: () => ({
      activeRequests: activeRequests.length,
      floorRequests: floorRequests.length,
      lastUpdate: lastUpdateTime,
      // ASSIGNMENT: Add assignment state
      assignmentMetrics: 'available in store'
    }),
    
    // ASSIGNMENT: Get current assignment status
    getAssignmentStatus: () => {
      const hour = new Date().getHours()
      const isPeakHour = [8, 9, 12, 13, 17, 18].includes(hour)
      const peakType = hour >= 8 && hour <= 10 ? 'MORNING_RUSH' :
                      hour >= 12 && hour <= 14 ? 'LUNCH_RUSH' :
                      hour >= 17 && hour <= 19 ? 'EVENING_RUSH' : 'NORMAL'
      
      return {
        currentHour: hour,
        isPeakHour,
        peakType,
        isAssignmentRelevantTime: hour === 9, // 9 AM is key assignment time
        expectedLobbyTraffic: hour === 9 ? '70%' : 'varies'
      }
    }
  }
}