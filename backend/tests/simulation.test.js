const SimulationEngine = require('../src/services/simulationEngine')
const { DEFAULT_CONFIG } = require('../src/utils/constants')

describe('Simulation Engine', () => {
  let simulationEngine

  beforeEach(() => {
    simulationEngine = new SimulationEngine()
  })

  afterEach(() => {
    simulationEngine.stop()
  })

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      simulationEngine.initialize()
      
      expect(simulationEngine.elevators.length).toBe(DEFAULT_CONFIG.NUM_ELEVATORS)
      expect(simulationEngine.config.numFloors).toBe(DEFAULT_CONFIG.NUM_FLOORS)
    })

    test('should initialize with custom config', () => {
      const customConfig = {
        numElevators: 5,
        numFloors: 20,
        capacity: 10
      }
      
      simulationEngine.initialize(customConfig)
      
      expect(simulationEngine.elevators.length).toBe(5)
      expect(simulationEngine.config.numFloors).toBe(20)
      expect(simulationEngine.config.capacity).toBe(10)
    })
  })

  describe('Simulation Control', () => {
    test('should start simulation successfully', () => {
      simulationEngine.initialize()
      const result = simulationEngine.start()
      
      expect(result).toBe(true)
      expect(simulationEngine.isRunning).toBe(true)
    })

    test('should stop simulation successfully', () => {
      simulationEngine.initialize()
      simulationEngine.start()
      const result = simulationEngine.stop()
      
      expect(result).toBe(true)
      expect(simulationEngine.isRunning).toBe(false)
    })

    test('should reset simulation', () => {
      simulationEngine.initialize()
      simulationEngine.addRequest({
        originFloor: 1,
        destinationFloor: 5,
        direction: 'up'
      })
      
      expect(simulationEngine.activeRequests.length).toBe(1)
      
      simulationEngine.reset()
      
      expect(simulationEngine.activeRequests.length).toBe(0)
      expect(simulationEngine.isRunning).toBe(false)
    })
  })

  describe('Request Management', () => {
    beforeEach(() => {
      simulationEngine.initialize()
    })

    test('should add request successfully', () => {
      const requestId = simulationEngine.addRequest({
        originFloor: 1,
        destinationFloor: 10,
        direction: 'up',
        priority: 2
      })
      
      expect(requestId).toBeDefined()
      expect(simulationEngine.activeRequests.length).toBe(1)
    })

    test('should add floor request', () => {
      simulationEngine.addFloorRequest(5, 'up')
      
      expect(simulationEngine.floorRequests.length).toBe(1)
      expect(simulationEngine.floorRequests[0].floor).toBe(5)
      expect(simulationEngine.floorRequests[0].direction).toBe('up')
    })

    test('should not duplicate floor requests', () => {
      simulationEngine.addFloorRequest(5, 'up')
      simulationEngine.addFloorRequest(5, 'up')
      
      expect(simulationEngine.floorRequests.length).toBe(1)
    })
  })

  describe('State Management', () => {
    test('should return complete state', () => {
      simulationEngine.initialize()
      const state = simulationEngine.getState()
      
      expect(state).toHaveProperty('elevators')
      expect(state).toHaveProperty('activeRequests')
      expect(state).toHaveProperty('floorRequests')
      expect(state).toHaveProperty('isRunning')
      expect(state).toHaveProperty('currentTime')
      expect(state).toHaveProperty('config')
    })

    test('should update config at runtime', () => {
      simulationEngine.initialize()
      simulationEngine.start()
      
      simulationEngine.updateConfig({ speed: 2, requestFrequency: 5 })
      
      expect(simulationEngine.config.speed).toBe(2)
      expect(simulationEngine.config.requestFrequency).toBe(5)
    })
  })

  describe('Metrics', () => {
    test('should provide performance metrics', () => {
      simulationEngine.initialize()
      const metrics = simulationEngine.getPerformanceMetrics()
      
      expect(metrics).toHaveProperty('averageWaitTime')
      expect(metrics).toHaveProperty('elevatorUtilization')
      expect(metrics).toHaveProperty('throughput')
      expect(metrics).toHaveProperty('starvationCount')
    })

    test('should provide real-time metrics', () => {
      simulationEngine.initialize()
      const metrics = simulationEngine.getRealTimeMetrics()
      
      expect(metrics).toHaveProperty('activeRequests')
      expect(metrics).toHaveProperty('elevatorsInMotion')
      expect(metrics).toHaveProperty('systemLoad')
    })
  })
})