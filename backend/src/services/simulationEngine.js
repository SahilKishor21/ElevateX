const Elevator = require('../models/Elevator')
const Request = require('../models/Request')
const HybridScheduler = require('../algorithms/hybridScheduler')
const MetricsService = require('./metricsService')
const { DEFAULT_CONFIG } = require('../utils/constants')

class SimulationEngine {
  constructor() {
    this.elevators = []
    this.activeRequests = []
    this.floorRequests = []
    this.config = { ...DEFAULT_CONFIG }
    this.isRunning = false
    this.currentTime = 0
    this.startTime = null
    this.intervalId = null
    this.scheduler = new HybridScheduler()
    this.metricsService = new MetricsService()
    this.requestIdCounter = 0
    
  }

  getHistoricalData() {
  return this.metricsService.historicalData.slice(-1)[0] || null
}

getHistoricalData() {
  return this.metricsService.historicalData.slice(-1)[0] || {
    timestamp: Date.now(),
    metrics: this.getPerformanceMetrics(),
    requests: this.activeRequests.length
  }
}

  initialize(config = {}) {
    this.config = { ...this.config, ...config }
    this.elevators = []
    this.activeRequests = []
    this.floorRequests = []
    this.currentTime = 0

    // Create elevators
    for (let i = 0; i < this.config.numElevators; i++) {
      const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']
      this.elevators.push(new Elevator(i, this.config.capacity, colors[i % colors.length]))
    }

    this.metricsService.reset()
  }

  start() {
    if (this.isRunning) return false

    this.isRunning = true
    this.startTime = Date.now()
    
    this.intervalId = setInterval(() => {
      this.update()
    }, DEFAULT_CONFIG.SIMULATION_INTERVAL)

    // Generate random requests
    this.requestGeneratorInterval = setInterval(() => {
      if (Math.random() < this.config.requestFrequency / 600) { // Convert per-minute to per-100ms
        this.generateRandomRequest()
      }
    }, DEFAULT_CONFIG.SIMULATION_INTERVAL)

    return true
  }

  stop() {
    if (!this.isRunning) return false

    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.requestGeneratorInterval) {
      clearInterval(this.requestGeneratorInterval)
      this.requestGeneratorInterval = null
    }

    return true
  }

  reset() {
    this.stop()
    this.initialize(this.config)
  }

  update() {
    this.currentTime = Date.now() - this.startTime

    // Update elevators
    this.elevators.forEach(elevator => elevator.update())

    // Update requests wait times
    this.activeRequests.forEach(request => request.updateWaitTime())

    // Run scheduling algorithm
    this.scheduler.optimizeRoutes(this.elevators, this.activeRequests)
    this.scheduler.preventStarvation(this.activeRequests, this.elevators)
    this.scheduler.positionIdleElevators(this.elevators, this.config.numFloors)

    // Remove served requests
    this.activeRequests = this.activeRequests.filter(req => req.isActive)
    this.floorRequests = this.floorRequests.filter(req => req.active)

    // Update metrics
    this.metricsService.update(this.elevators, this.activeRequests)
  }

  addRequest(requestData) {
    const request = new Request({
      ...requestData,
      id: `req_${++this.requestIdCounter}_${Date.now()}`
    })
    
    this.activeRequests.push(request)

    // Add floor request if needed
    if (request.direction) {
      this.addFloorRequest(request.originFloor, request.direction)
    }

    return request.id
  }

  addFloorRequest(floor, direction) {
    const existing = this.floorRequests.find(
      req => req.floor === floor && req.direction === direction && req.active
    )
    
    if (!existing) {
      this.floorRequests.push({
        floor,
        direction,
        timestamp: Date.now(),
        active: true
      })
    }
  }

  generateRandomRequest() {
    const originFloor = Math.floor(Math.random() * this.config.numFloors) + 1
    let destinationFloor = Math.floor(Math.random() * this.config.numFloors) + 1
    
    while (destinationFloor === originFloor) {
      destinationFloor = Math.floor(Math.random() * this.config.numFloors) + 1
    }

    this.addRequest({
      type: 'floor_call',
      originFloor,
      destinationFloor,
      direction: destinationFloor > originFloor ? 'up' : 'down',
      passengerCount: Math.floor(Math.random() * 3) + 1
    })
  }

  getState() {
    return {
      elevators: this.elevators.map(e => e.getStatus()),
      activeRequests: this.activeRequests.map(r => r.getStatus()),
      floorRequests: this.floorRequests,
      isRunning: this.isRunning,
      currentTime: this.currentTime,
      config: this.config
    }
  }

  getPerformanceMetrics() {
    return this.metricsService.getPerformanceMetrics()
  }

  getRealTimeMetrics() {
    return this.metricsService.getRealTimeMetrics(this.elevators, this.activeRequests)
  }

  updateConfig(newConfig) {
    if (this.isRunning) {
      // Only allow certain runtime config changes
      const allowedRuntimeChanges = ['speed', 'requestFrequency']
      Object.keys(newConfig).forEach(key => {
        if (allowedRuntimeChanges.includes(key)) {
          this.config[key] = newConfig[key]
        }
      })
    } else {
      this.config = { ...this.config, ...newConfig }
      this.initialize(this.config)
    }
  }
}

module.exports = SimulationEngine