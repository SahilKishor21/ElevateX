export enum ElevatorState {
  IDLE = 'idle',
  MOVING_UP = 'moving_up',
  MOVING_DOWN = 'moving_down',
  LOADING = 'loading',
  MAINTENANCE = 'maintenance'
}

export type DirectionType = 'up' | 'down' | 'idle'

export interface Elevator {
  id: number
  currentFloor: number
  targetFloor: number | null
  state: ElevatorState
  direction: DirectionType
  passengers: Passenger[]
  capacity: number
  doorOpen: boolean
  floorHeight: number
  requestQueue: number[]
  lastMoveTime: number
  totalDistance: number
  totalTrips: number
  maintenanceMode: boolean
  color: string
}

export interface Passenger {
  id: number
  originFloor: number
  destinationFloor: number
  waitTime: number
  boardTime: number
  priority: number
}

export interface FloorRequest {
  floor: number
  direction: DirectionType
  timestamp: number
  active: boolean
}

export interface ElevatorSystem {
  elevators: Elevator[]
  floorRequests: FloorRequest[]
  totalFloors: number
  isRunning: boolean
  speed: number
  requestFrequency: number
}

export interface ElevatorConfig {
  numElevators: number
  numFloors: number
  capacity: number
  speed: number
  requestFrequency: number
}

// In your frontend constants file
export const SIMULATION_SPEEDS = [
  { value: 1, label: '1x Normal' },
  { value: 2, label: '2x Fast' },
  { value: 5, label: '5x Very Fast' },
  { value: 10, label: '10x Ultra Fast' }
]