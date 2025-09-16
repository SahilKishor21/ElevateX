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
  url = 'https://elevatex-2ght.onrender.com' ,
  autoConnect = true 
}: UseWebSocketProps = {}) => {
  const socketRef = useRef<any>(null) // Using any instead of Socket type
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    setElevators,
    setFloorRequests,
    setActiveRequests,
    setIsRunning,
    setCurrentTime,
    updateConfig: updateStoreConfig,
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

    socketRef.current.on(WEBSOCKET_EVENTS.SIMULATION_UPDATE, (data: SimulationUpdateData) => {
      console.log('Simulation update received')
      setElevators(data.elevators || [])
      setFloorRequests(data.floorRequests || [])
      setActiveRequests(data.activeRequests || [])
      setIsRunning(data.isRunning || false)
      setCurrentTime(data.currentTime || 0)
      
      if (data.config) {
        updateStoreConfig(data.config)
      }
    })

    socketRef.current.on(WEBSOCKET_EVENTS.METRICS_UPDATE, (data: MetricsUpdateData) => {
      if (data.performance) {
        updatePerformanceMetrics(data.performance)
      }
      if (data.realTime) {
        updateRealTimeMetrics(data.realTime)
      }
      if (data.historical) {
        addHistoricalData(data.historical)
      }
      if (data.alerts) {
        data.alerts.forEach((alert: any) => addAlert(alert))
      }
    })

    socketRef.current.on(WEBSOCKET_EVENTS.CONFIG_UPDATED, (data: ConfigUpdateResponse) => {
      console.log('Config update response:', data)
      if (data.success && data.config) {
        updateStoreConfig(data.config)
      } else if (!data.success && data.error) {
        setError(data.error)
      }
    })

    socketRef.current.on('request_added', (data: RequestResponse) => {
      console.log('Request added response:', data)
      if (!data.success && data.error) {
        setError(data.error)
      }
    })

    socketRef.current.on('error', (err: any) => {
      console.error('Socket error:', err)
      setError(err.message || 'Unknown socket error')
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
      const errorMsg = 'Not connected to server'
      console.error(errorMsg)
      setError(errorMsg)
      return false
    }
    
    console.log(`Emitting ${event}:`, data)
    socketRef.current.emit(event, data)
    return true
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
    console.log('Adding request:', request)
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

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [url, autoConnect])

  return {
    isConnected,
    error,
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
  }
}