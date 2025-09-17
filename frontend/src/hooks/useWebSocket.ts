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
}

interface MetricsUpdateData {
  performance: any
  realTime: any
  historical?: any
  alerts?: any[]
  timestamp: number
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
  url = 'http://localhost:3001',
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
  } = useElevatorStore()

  const {
    updatePerformanceMetrics,
    updateRealTimeMetrics,
    addHistoricalData,
    addAlert,
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

    // REDUCED DEBUG: Only log when state actually changes
    socketRef.current.on(WEBSOCKET_EVENTS.SIMULATION_UPDATE, (data: SimulationUpdateData) => {
      // Only log significant state changes
      const currentActive = activeRequests.length
      const currentFloor = floorRequests.length
      const newActive = data.activeRequests?.length || 0
      const newFloor = data.floorRequests?.length || 0
      
      if (currentActive !== newActive || currentFloor !== newFloor) {
        console.log('State Change:', {
          active: `${currentActive} → ${newActive}`,
          floor: `${currentFloor} → ${newFloor}`,
          running: data.isRunning
        })
      }
      
      // Update state with comprehensive error handling
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

        setLastUpdateTime(Date.now())
      } catch (updateError) {
        console.error('State update error:', updateError)
        setError(`State update failed: ${updateError}`)
      }
    })

    // Metrics update handling
    socketRef.current.on(WEBSOCKET_EVENTS.METRICS_UPDATE, (data: MetricsUpdateData) => {
      try {
        if (data.performance && typeof data.performance === 'object') {
          updatePerformanceMetrics(data.performance)
        }
        if (data.realTime && typeof data.realTime === 'object') {
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
      } catch (metricsError) {
        console.error('Metrics update error:', metricsError)
      }
    })

    // Algorithm update handling
    socketRef.current.on('algorithm_update', (data: any) => {
      // Only log if there's an error or significant change
      if (data.error) {
        console.error('Algorithm update error:', data.error)
      }
    })

    socketRef.current.on(WEBSOCKET_EVENTS.CONFIG_UPDATED, (data: ConfigUpdateResponse) => {
      console.log('Config update response:', data.success ? 'Success' : 'Failed')
      if (data.success && data.config) {
        updateStoreConfig(data.config)
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
    console.log('Starting simulation with config:', config)
    return emit(WEBSOCKET_EVENTS.START_SIMULATION, config)
  }

  const stopSimulation = () => {
    console.log('Stopping simulation')
    return emit(WEBSOCKET_EVENTS.STOP_SIMULATION)
  }

  const resetSimulation = () => {
    console.log('Resetting simulation')
    return emit(WEBSOCKET_EVENTS.RESET_SIMULATION)
  }

  const addRequest = (request: any) => {
    console.log('Adding request:', `${request.originFloor} → ${request.destinationFloor}`)
    return emit(WEBSOCKET_EVENTS.ADD_REQUEST, request)
  }

  const updateConfig = (config: any) => {
    console.log('Updating config:', config)
    return emit(WEBSOCKET_EVENTS.CONFIG_CHANGE, config)
  }

  const emergencyStop = () => {
    console.log('Emergency stop')
    return emit(WEBSOCKET_EVENTS.EMERGENCY_STOP)
  }

  const clearError = () => {
    setError(null)
  }

  // Connection health monitoring
  useEffect(() => {
    if (!isConnected) return

    const healthCheck = setInterval(() => {
      if (socketRef.current?.connected) {
        // Connection is healthy
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
        console.log('Network restored, attempting to reconnect...')
        setTimeout(() => {
          connect()
        }, 1000)
      }
    }

    const handleOffline = () => {
      console.log('Network lost')
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
    // Debug utilities
    getSocketInfo: () => ({
      connected: socketRef.current?.connected,
      id: socketRef.current?.id,
      transport: socketRef.current?.io?.engine?.transport?.name
    }),
    // Store state for debugging
    getCurrentStoreState: () => ({
      activeRequests: activeRequests.length,
      floorRequests: floorRequests.length,
      lastUpdate: lastUpdateTime
    })
  }
}