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
    this.requestBuffer = []
    this.maxRequestsPerSecond = 50
    this.lastRequestTime = 0
    this.lastOptimizationTime = 0
  }

  getHistoricalData() {
    return this.metricsService.historicalData.slice(-1)[0] || {
      timestamp: Date.now(),
      metrics: this.getPerformanceMetrics(),
      requests: this.activeRequests.length
    }
  }

  getSystemLoad() {
    return {
      activeRequests: this.activeRequests.length,
      bufferedRequests: this.requestBuffer.length,
      elevatorUtilization: this.elevators.map(e => e.getUtilization()),
      averageLoad: this.elevators.length > 0 ? this.elevators.reduce((sum, e) => sum + e.getLoad(), 0) / this.elevators.length : 0,
      overCapacityElevators: this.elevators.filter(e => e.passengers.length > e.capacity).length,
      systemHealth: this.calculateSystemHealth()
    }
  }

  calculateSystemHealth() {
    const activeElevators = this.elevators.filter(e => e.state !== 'idle').length
    const utilizationRate = this.elevators.length > 0 ? activeElevators / this.elevators.length : 0
    const starvingRequests = this.activeRequests.filter(r => r.isStarving()).length
    
    let healthScore = 100
    healthScore -= starvingRequests * 10
    healthScore -= Math.max(0, utilizationRate - 0.8) * 50
    healthScore -= this.elevators.filter(e => e.passengers.length > e.capacity).length * 15
    
    return {
      score: Math.max(0, Math.round(healthScore)),
      status: healthScore > 80 ? 'healthy' : healthScore > 50 ? 'warning' : 'critical'
    }
  }

  initialize(config = {}) {
    this.config = { ...this.config, ...config }
    this.elevators = []
    this.activeRequests = []
    this.floorRequests = []
    this.requestBuffer = []
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

    this.requestGeneratorInterval = setInterval(() => {
      if (Math.random() < this.config.requestFrequency / 600) {
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
    const updateStart = Date.now()
    
    this.currentTime = Date.now() - this.startTime

    if (this.requestBuffer.length > 0) {
      this.processRequestBuffer()
    }

    this.elevators.forEach(elevator => {
      elevator.update()
      
      // Simulate realistic passenger loading/unloading
      if (elevator.state === 'loading' && elevator.doorOpen) {
        // Remove passengers at current floor
        elevator.passengers = elevator.passengers.filter(p => {
          if (p.destinationFloor === elevator.currentFloor) {
            return false // Remove passenger
          }
          return true
        })

        // Add passengers based on pending requests at this floor
        const requestsAtFloor = this.activeRequests.filter(
          req => req.originFloor === elevator.currentFloor && 
                 !req.assignedElevator && 
                 elevator.passengers.length < elevator.capacity &&
                 req.isActive
        )

        requestsAtFloor.forEach(request => {
          if (elevator.passengers.length < elevator.capacity) {
            const passenger = {
              id: request.id,
              originFloor: request.originFloor,
              destinationFloor: request.destinationFloor,
              boardTime: Date.now(),
              waitTime: request.waitTime,
              priority: request.priority
            }
            
            elevator.passengers.push(passenger)
            elevator.addRequest(passenger.destinationFloor)
            request.serve()
          }
        })

        // Add some random passengers for realism
        const availableSpace = elevator.capacity - elevator.passengers.length
        if (availableSpace > 0 && Math.random() < 0.3) {
          const newPassengerCount = Math.min(availableSpace, Math.floor(Math.random() * 2) + 1)
          for (let i = 0; i < newPassengerCount; i++) {
            elevator.addSimulatedPassenger()
          }
        }
      }

      // Enforce capacity limits
      if (elevator.passengers.length > elevator.capacity) {
        const excess = elevator.passengers.length - elevator.capacity
        elevator.passengers = elevator.passengers.slice(0, elevator.capacity)
        console.warn(`Elevator ${elevator.id} over capacity, removed ${excess} passengers`)
      }
    })

    this.activeRequests.forEach(request => request.updateWaitTime())

    const shouldOptimize = this.activeRequests.length < 100 || 
                          (Date.now() - this.lastOptimizationTime) > 1000
    
    if (shouldOptimize) {
      this.scheduler.optimizeRoutes(this.elevators, this.activeRequests)
      this.scheduler.preventStarvation(this.activeRequests, this.elevators)
      this.scheduler.positionIdleElevators(this.elevators, this.config.numFloors)
      this.lastOptimizationTime = Date.now()
    }

    this.activeRequests = this.activeRequests.filter(req => req.isActive)
    this.floorRequests = this.floorRequests.filter(req => req.active)

    this.metricsService.update(this.elevators, this.activeRequests)

    const updateTime = Date.now() - updateStart
    if (updateTime > 50) {
      console.warn(`Slow update cycle: ${updateTime}ms`)
    }
  }

  addRequest(requestData) {
    const now = Date.now()
    
    if (this.requestBuffer.length >= 1000) {
      console.warn('Request buffer full, dropping request')
      return null
    }

    const request = new Request({
      ...requestData,
      id: `req_${++this.requestIdCounter}_${now}`
    })
    
    if (this.activeRequests.length > 50) {
      this.requestBuffer.push(request)
    } else {
      this.activeRequests.push(request)
    }
    
    this.processRequestBuffer()

    if (request.direction) {
      this.addFloorRequest(request.originFloor, request.direction)
    }

    return request.id
  }

  processRequestBuffer() {
    const batchSize = 10
    const batch = this.requestBuffer.splice(0, batchSize)
    
    batch.forEach(request => {
      this.activeRequests.push(request)
      
      if (request.direction) {
        this.addFloorRequest(request.originFloor, request.direction)
      }
    })
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