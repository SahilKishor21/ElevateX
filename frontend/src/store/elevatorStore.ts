import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { Elevator, ElevatorState, DirectionType, FloorRequest, ElevatorConfig } from '@/types/elevator'
import { Request } from '@/types/request'
import { DEFAULT_CONFIG } from '@/lib/constants'

interface ElevatorStore {
  elevators: Elevator[]
  floorRequests: FloorRequest[]
  activeRequests: Request[]
  config: ElevatorConfig
  isRunning: boolean
  currentTime: number
  
  setElevators: (elevators: Elevator[]) => void
  updateElevator: (id: number, updates: Partial<Elevator>) => void
  setFloorRequests: (requests: FloorRequest[]) => void
  addFloorRequest: (floor: number, direction: DirectionType) => void // Make sure this exists
  removeFloorRequest: (floor: number, direction: DirectionType) => void
  setActiveRequests: (requests: Request[]) => void
  addRequest: (request: Request) => void
  removeRequest: (id: string) => void
  updateConfig: (updates: Partial<ElevatorConfig>) => void
  setIsRunning: (running: boolean) => void
  setCurrentTime: (time: number) => void
  resetSystem: () => void
}

export const useElevatorStore = create<ElevatorStore>()(
  subscribeWithSelector((set, get) => ({
    elevators: [],
    floorRequests: [],
    activeRequests: [],
    config: {
      numElevators: DEFAULT_CONFIG.NUM_ELEVATORS,
      numFloors: DEFAULT_CONFIG.NUM_FLOORS,
      capacity: DEFAULT_CONFIG.ELEVATOR_CAPACITY,
      speed: DEFAULT_CONFIG.SIMULATION_SPEED,
      requestFrequency: DEFAULT_CONFIG.REQUEST_FREQUENCY,
    },
    isRunning: false,
    currentTime: 0,

    setElevators: (elevators) => set({ elevators }),

    updateElevator: (id, updates) =>
      set((state) => ({
        elevators: state.elevators.map((elevator) =>
          elevator.id === id ? { ...elevator, ...updates } : elevator
        ),
      })),

    setFloorRequests: (floorRequests) => set({ floorRequests }),

    addFloorRequest: (floor, direction) =>
      set((state) => {
        const exists = state.floorRequests.some(
          (req) => req.floor === floor && req.direction === direction
        )
        if (exists) return state

        return {
          floorRequests: [
            ...state.floorRequests,
            {
              floor,
              direction,
              timestamp: Date.now(),
              active: true,
            },
          ],
        }
      }),

    removeFloorRequest: (floor, direction) =>
      set((state) => ({
        floorRequests: state.floorRequests.filter(
          (req) => !(req.floor === floor && req.direction === direction)
        ),
      })),

    setActiveRequests: (activeRequests) => set({ activeRequests }),

    addRequest: (request) =>
      set((state) => ({
        activeRequests: [...state.activeRequests, request],
      })),

    removeRequest: (id) =>
      set((state) => ({
        activeRequests: state.activeRequests.filter((req) => req.id !== id),
      })),

    updateConfig: (updates) =>
      set((state) => ({
        config: { ...state.config, ...updates },
      })),

    setIsRunning: (isRunning) => set({ isRunning }),

    setCurrentTime: (currentTime) => set({ currentTime }),

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