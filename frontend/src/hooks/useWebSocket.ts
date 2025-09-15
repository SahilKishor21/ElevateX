'use client'

import { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { useElevatorStore } from '@/store/elevatorStore'

export const useWebSocket = (url = 'http://localhost:3001') => {
  const socketRef = useRef<Socket | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    setElevators,
    setFloorRequests,
    setActiveRequests,
    setIsRunning,
    setCurrentTime,
    setIsConnected,
  } = useElevatorStore()

  const connect = () => {
    if (socketRef.current?.connected) return

    socketRef.current = io(url, {
      transports: ['websocket'],
      timeout: 5000,
    })

    socketRef.current.on('connect', () => {
      console.log('Connected to backend')
      setIsConnected(true)
      setError(null)
    })

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from backend')
      setIsConnected(false)
    })

    socketRef.current.on('connect_error', (err: any) => {
      console.error('Connection error:', err)
      setError(err.message)
      setIsConnected(false)
    })

    socketRef.current.on('simulation_update', (data: any) => {
      console.log('Received simulation update:', data)
      setElevators(data.elevators || [])
      setFloorRequests(data.floorRequests || [])
      setActiveRequests(data.activeRequests || [])
      setIsRunning(data.isRunning || false)
      setCurrentTime(data.currentTime || 0)
    })

    socketRef.current.on('metrics_update', (data: any) => {
      console.log('Received metrics update:', data)
    })
  }

  const disconnect = () => {
    socketRef.current?.disconnect()
    setIsConnected(false)
  }

  const emit = (event: string, data?: any) => {
    if (!socketRef.current?.connected) {
      setError('Not connected to server')
      return
    }
    console.log('Emitting:', event, data)
    socketRef.current.emit(event, data)
  }

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [url])

  return {
    isConnected: useElevatorStore(state => state.isConnected),
    error,
    connect,
    disconnect,
    emit,
    startSimulation: (config?: any) => emit('start_simulation', config),
    stopSimulation: () => emit('stop_simulation'),
    resetSimulation: () => emit('reset_simulation'),
    addRequest: (request: any) => emit('add_request', request),
    updateConfig: (config: any) => emit('config_change', config),
  }
}