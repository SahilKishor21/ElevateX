export enum RequestType {
  FLOOR_CALL = 'floor_call',
  CABIN_REQUEST = 'cabin_request',
  EMERGENCY = 'emergency'
}

export enum RequestPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
  EMERGENCY = 5
}

export interface Request {
  id: string;
  type: RequestType;
  originFloor: number;
  destinationFloor: number | null;
  direction: 'up' | 'down' | null;
  timestamp: number;
  priority: RequestPriority;
  waitTime: number;
  assignedElevator: number | null;
  isActive: boolean;
  isServed: boolean;
  passengerCount: number;
}

export interface TrafficPattern {
  hour: number;
  intensity: number;
  primaryDirection: 'up' | 'down' | 'mixed';
  hotspotFloors: number[];
  expectedRequests: number;
}

export interface RequestMetrics {
  totalRequests: number;
  servedRequests: number;
  pendingRequests: number;
  averageWaitTime: number;
  maxWaitTime: number;
  starvationCount: number;
  requestsPerHour: number;
}

// In your frontend constants file
export const SIMULATION_SPEEDS = [
  { value: 1, label: '1x Normal' },
  { value: 2, label: '2x Fast' },
  { value: 5, label: '5x Very Fast' },
  { value: 10, label: '10x Ultra Fast' }
]