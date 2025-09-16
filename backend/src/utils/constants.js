const DEFAULT_CONFIG = {
  NUM_ELEVATORS: 3,
  NUM_FLOORS: 15,
  ELEVATOR_CAPACITY: 8,
  SIMULATION_SPEED: 1,
  REQUEST_FREQUENCY: 2,
  SIMULATION_INTERVAL: 1000,
  numElevators: 3,
  numFloors: 15,
  capacity: 8,
  speed: 1,
  requestFrequency: 2
}

const PRIORITY_WEIGHTS = {
  STARVATION_THRESHOLD: 30000,
  CRITICAL_THRESHOLD: 60000,
  EXPONENTIAL_BASE: 1.8,
  RUSH_HOUR_MULTIPLIER: 2.0,
}

const WEBSOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  SIMULATION_UPDATE: 'simulation_update',
  METRICS_UPDATE: 'metrics_update',
  CONFIG_CHANGE: 'config_change',
  ADD_REQUEST: 'add_request',
  EMERGENCY_STOP: 'emergency_stop',
  START_SIMULATION: 'start_simulation',
  STOP_SIMULATION: 'stop_simulation',
  RESET_SIMULATION: 'reset_simulation'
}

module.exports = {
  DEFAULT_CONFIG,
  PRIORITY_WEIGHTS,
  WEBSOCKET_EVENTS
}