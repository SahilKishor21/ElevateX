import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface Elevator {
  id: number
  currentFloor: number
  targetFloor: number | null
  state: string
  direction: string
  passengers: any[]
  capacity: number
  doorOpen: boolean
  requestQueue: number[]
  color: string
}

interface FloorRequest {
  floor: number
  direction: string
  timestamp: number
  active: boolean
}

interface ElevatorConfig {
  numElevators: number
  numFloors: number
  capacity: number
  speed: number
  requestFrequency: number
}

interface ElevatorStore {
  elevators: Elevator[]
  floorRequests: FloorRequest[]
  activeRequests: any[]
  config: ElevatorConfig
  isRunning: boolean
  currentTime: number
  isConnected: boolean
  
  setElevators: (elevators: Elevator[]) => void
  setFloorRequests: (requests: FloorRequest[]) => void
  setActiveRequests: (requests: any[]) => void
  updateConfig: (updates: Partial<ElevatorConfig>) => void
  setIsRunning: (running: boolean) => void
  setCurrentTime: (time: number) => void
  setIsConnected: (connected: boolean) => void
  resetSystem: () => void
}

export const useElevatorStore = create<ElevatorStore>()(
  subscribeWithSelector((set, get) => ({
    elevators: [],
    floorRequests: [],
    activeRequests: [],
    config: {
      numElevators: 3,
      numFloors: 15,
      capacity: 8,
      speed: 1,
      requestFrequency: 2,
    },
    isRunning: false,
    currentTime: 0,
    isConnected: false,

    setElevators: (elevators) => set({ elevators }),
    setFloorRequests: (floorRequests) => set({ floorRequests }),
    setActiveRequests: (activeRequests) => set({ activeRequests }),
    
    updateConfig: (updates) =>
      set((state) => ({
        config: { ...state.config, ...updates },
      })),

    setIsRunning: (isRunning) => set({ isRunning }),
    setCurrentTime: (currentTime) => set({ currentTime }),
    setIsConnected: (isConnected) => set({ isConnected }),

    resetSystem: () =>
      set({
        elevators: [],
        floorRequests: [],
        activeRequests: [],
        isRunning: false,
        currentTime: 0,
      }),
  }))
)