import { create } from 'zustand'
import { Elevator, ElevatorConfig } from '@/types/elevator'
import { Request } from '@/types/request'

interface FloorRequest {
  floor: number
  direction: 'up' | 'down'
  timestamp: number
  active: boolean
}

interface ElevatorStore {
  elevators: Elevator[]
  config: ElevatorConfig
  isRunning: boolean
  currentTime: number
  floorRequests: FloorRequest[] // CRITICAL: Floor requests state
  activeRequests: Request[]
  assignmentMetrics?: any
  
  setElevators: (elevators: Elevator[]) => void
  setConfig: (config: ElevatorConfig) => void
  updateConfig: (updates: Partial<ElevatorConfig>) => void
  setIsRunning: (running: boolean) => void
  setCurrentTime: (time: number) => void
  setFloorRequests: (requests: FloorRequest[]) => void // CRITICAL: Setter for floor requests
  addFloorRequest: (floor: number, direction: 'up' | 'down') => void // CRITICAL: Add individual floor request
  setActiveRequests: (requests: Request[]) => void
  setAssignmentMetrics: (metrics: any) => void
  reset: () => void
}

const defaultConfig: ElevatorConfig = {
  numElevators: 4,
  numFloors: 20,
  capacity: 8,
  speed: 1,
  requestFrequency: 5
}

export const useElevatorStore = create<ElevatorStore>((set, get) => ({
  elevators: [],
  config: defaultConfig,
  isRunning: false,
  currentTime: 0,
  floorRequests: [], // CRITICAL: Initialize floor requests
  activeRequests: [],
  assignmentMetrics: undefined,

  setElevators: (elevators) => set({ elevators }),
  
  setConfig: (config) => set({ config }),
  
  updateConfig: (updates) => set((state) => ({
    config: { ...state.config, ...updates }
  })),
  
  setIsRunning: (isRunning) => set({ isRunning }),
  
  setCurrentTime: (currentTime) => set({ currentTime }),
  
  // CRITICAL: Set floor requests from server
  setFloorRequests: (floorRequests) => {
    console.log('Store - Setting floor requests:', floorRequests)
    set({ floorRequests })
  },
  
  // CRITICAL: Add individual floor request
  addFloorRequest: (floor, direction) => {
    console.log(`Store - Adding floor request: Floor ${floor}, Direction ${direction}`)
    set((state) => {
      // Check if request already exists
      const exists = state.floorRequests.some(
        req => req.floor === floor && req.direction === direction && req.active
      )
      
      if (exists) {
        console.log('Floor request already exists, skipping')
        return state
      }
      
      const newRequest: FloorRequest = {
        floor,
        direction,
        timestamp: Date.now(),
        active: true
      }
      
      const newFloorRequests = [...state.floorRequests, newRequest]
      console.log('Store - New floor requests array:', newFloorRequests)
      
      return { floorRequests: newFloorRequests }
    })
  },
  
  setActiveRequests: (activeRequests) => set({ activeRequests }),
  
  setAssignmentMetrics: (assignmentMetrics) => set({ assignmentMetrics }),
  
  reset: () => set({
    elevators: [],
    isRunning: false,
    currentTime: 0,
    floorRequests: [], // CRITICAL: Reset floor requests
    activeRequests: [],
    assignmentMetrics: undefined,
    config: defaultConfig
  }),
}))