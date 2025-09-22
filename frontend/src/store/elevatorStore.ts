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
  floorRequests: FloorRequest[]
  activeRequests: Request[]
  assignmentMetrics?: any
  
  setElevators: (elevators: Elevator[]) => void
  setConfig: (config: ElevatorConfig) => void
  updateConfig: (updates: Partial<ElevatorConfig>) => void
  setIsRunning: (running: boolean) => void
  setCurrentTime: (time: number) => void
  setFloorRequests: (requests: FloorRequest[]) => void
  addFloorRequest: (floor: number, direction: 'up' | 'down') => void
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
  floorRequests: [],
  activeRequests: [],
  assignmentMetrics: undefined,

  setElevators: (elevators) => set({ elevators }),
  
  setConfig: (config) => set({ config }),
  
  updateConfig: (updates) => set((state) => ({
    config: { ...state.config, ...updates }
  })),
  
  setIsRunning: (isRunning) => set({ isRunning }),
  
  setCurrentTime: (currentTime) => set({ currentTime }),
  
  setFloorRequests: (floorRequests) => {
    set({ floorRequests })
  },
  
  addFloorRequest: (floor, direction) => {
    set((state) => {
      const exists = state.floorRequests.some(
        req => req.floor === floor && req.direction === direction && req.active
      )
      
      if (exists) {
        return state
      }
      
      const newRequest: FloorRequest = {
        floor,
        direction,
        timestamp: Date.now(),
        active: true
      }
      
      const newFloorRequests = [...state.floorRequests, newRequest]
      
      return { floorRequests: newFloorRequests }
    })
  },
  
  setActiveRequests: (activeRequests) => set({ activeRequests }),
  
  setAssignmentMetrics: (assignmentMetrics) => set({ assignmentMetrics }),
  
  reset: () => set({
    elevators: [],
    isRunning: false,
    currentTime: 0,
    floorRequests: [], 
    activeRequests: [],
    assignmentMetrics: undefined,
    config: defaultConfig
  }),
}))
