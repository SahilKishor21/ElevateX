export const DEFAULT_CONFIG = {
  NUM_ELEVATORS: 3,
  NUM_FLOORS: 15,
  ELEVATOR_CAPACITY: 8,
  SIMULATION_SPEED: 1,
  REQUEST_FREQUENCY: 2,
  FLOOR_HEIGHT: 60,
  ELEVATOR_WIDTH: 80,
  DOOR_OPEN_TIME: 3000,
  TRAVEL_TIME_PER_FLOOR: 2000,
}

export const SIMULATION_SPEEDS = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '5x', value: 5 },
  { label: '10x', value: 10 },
]

export const ELEVATOR_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f97316',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16'
]

export const STATUS_COLORS = {
  idle: '#6b7280',
  moving_up: '#3b82f6',
  moving_down: '#3b82f6',
  loading: '#f59e0b',
  maintenance: '#ef4444',
}

export const PRIORITY_MULTIPLIERS = {
  STARVATION_THRESHOLD: 30000,
  CRITICAL_THRESHOLD: 60000,
  EXPONENTIAL_BASE: 1.8,
  RUSH_HOUR_MULTIPLIER: 2.0,
}

export const TRAFFIC_PATTERNS = {
  MORNING_RUSH: { start: 8, end: 10, bias: 'lobby_to_upper' },
  LUNCH_TIME: { start: 12, end: 14, bias: 'middle_floors' },
  EVENING_RUSH: { start: 17, end: 19, bias: 'upper_to_lobby' },
}

export const WEBSOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  SIMULATION_UPDATE: 'simulation_update',
  METRICS_UPDATE: 'metrics_update',
  CONFIG_CHANGE: 'config_change',
  CONFIG_UPDATED: 'config_updated', // Add this line
  ADD_REQUEST: 'add_request',
  EMERGENCY_STOP: 'emergency_stop',
  START_SIMULATION: 'start_simulation',
  STOP_SIMULATION: 'stop_simulation',
  RESET_SIMULATION: 'reset_simulation',
}

export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#8b5cf6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#06b6d4',
}

export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT_WAIT_TIME: 15,
  GOOD_WAIT_TIME: 30,
  POOR_WAIT_TIME: 60,
  UTILIZATION_TARGET: 0.75,
  STARVATION_LIMIT: 0,
}

export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: 320,
  HEADER_HEIGHT: 80,
  CARD_BORDER_RADIUS: 12,
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 5000,
}