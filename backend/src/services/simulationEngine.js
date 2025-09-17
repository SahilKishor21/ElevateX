const Elevator = require('../models/Elevator')
const Request = require('../models/Request')
const HybridScheduler = require('../algorithms/hybridScheduler')
const ScanAlgorithm = require('../algorithms/scanAlgorithm')
const MetricsService = require('./metricsService')
const { DEFAULT_CONFIG } = require('../utils/constants')

class SimulationEngine {
  constructor() {
    this.elevators = []
    this.activeRequests = []
    this.servedRequestsHistory = []
    this.floorRequests = []
    this.config = { ...DEFAULT_CONFIG }
    this.isRunning = false
    this.currentTime = 0
    this.startTime = null
    this.intervalId = null
    
    // CRITICAL FIX: Initialize both schedulers and track current algorithm
    this.hybridScheduler = new HybridScheduler()
    this.scanAlgorithm = new ScanAlgorithm()
    this.currentAlgorithm = 'hybrid'
    this.scheduler = this.hybridScheduler // Default to hybrid
    
    this.metricsService = new MetricsService()
    this.requestIdCounter = 0
    this.requestBuffer = []
    this.maxRequestsPerSecond = 50
    this.lastRequestTime = 0
    this.lastOptimizationTime = 0
    
    // Track metrics for each algorithm separately
    this.algorithmMetrics = {
      hybrid: { totalRequests: 0, servedRequests: 0, totalDistance: 0 },
      scan: { totalRequests: 0, servedRequests: 0, totalDistance: 0 }
    }
  }

  // CRITICAL FIX: Add method to actually switch algorithms
  switchAlgorithm(algorithm) {
    if (!['hybrid', 'scan'].includes(algorithm)) {
      throw new Error('Invalid algorithm. Must be "hybrid" or "scan"')
    }

    this.currentAlgorithm = algorithm
    this.scheduler = algorithm === 'hybrid' ? this.hybridScheduler : this.scanAlgorithm
    
    console.log(`Algorithm switched to: ${algorithm}`)
    console.log(`Active scheduler: ${this.scheduler.constructor.name}`)
    
    return {
      success: true,
      algorithm: this.currentAlgorithm,
      schedulerClass: this.scheduler.constructor.name
    }
  }

  getCurrentAlgorithm() {
    return this.currentAlgorithm
  }

  getAllRequests() {
    return [...this.activeRequests, ...this.servedRequestsHistory]
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
    this.servedRequestsHistory = []
    this.floorRequests = []
    this.requestBuffer = []
    this.currentTime = 0

    // Reset algorithm metrics
    this.algorithmMetrics = {
      hybrid: { totalRequests: 0, servedRequests: 0, totalDistance: 0 },
      scan: { totalRequests: 0, servedRequests: 0, totalDistance: 0 }
    }

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
    
    console.log(`Starting simulation with ${this.currentAlgorithm} algorithm`)
    
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

    console.log(`Simulation stopped. Final algorithm: ${this.currentAlgorithm}`)
    return true
  }

  reset() {
    this.stop()
    this.floorRequests = []
    this.initialize(this.config)
  }

  // PASSENGER FIX: Add method to remove floor requests
  removeFloorRequest(floor, direction) {
    this.floorRequests = this.floorRequests.filter(
      req => !(req.floor === floor && req.direction === direction && req.active)
    )
    console.log(`Removed floor request: Floor ${floor} ${direction}`)
  }

  // CRITICAL FIX: Updated update method with proper request-elevator synchronization
  update() {
    const updateStart = Date.now()
    this.currentTime = Date.now() - this.startTime

    if (this.requestBuffer.length > 0) {
      this.processRequestBuffer()
    }

    // Update request wait times
    this.activeRequests.forEach(request => {
      if (typeof request.updateWaitTime === 'function') {
        request.updateWaitTime()
      }
    })

    // CRITICAL FIX: Run scheduling BEFORE elevator updates
    const unassignedRequests = this.activeRequests.filter(r => r.isActive && !r.assignedElevator)
    if (unassignedRequests.length > 0) {
      console.log(`\n=== SCHEDULING PHASE: ${unassignedRequests.length} unassigned requests ===`)
      console.log('Elevator states:', this.elevators.map(e => 
        `E${e.id}(floor:${e.currentFloor}, state:${e.state}, target:${e.targetFloor}, queue:[${e.requestQueue.join(',')}])`
      ))
      
      if (this.currentAlgorithm === 'hybrid') {
        this.scheduler.optimizeRoutes(this.elevators, this.activeRequests)
        this.scheduler.preventStarvation(this.activeRequests, this.elevators)
        this.scheduler.positionIdleElevators(this.elevators, this.config.numFloors)
      } else {
        this.scheduler.assignRequests(this.elevators, this.activeRequests)
      }
      
      // CRITICAL FIX: After assignment, immediately sync elevator targets
      this.syncElevatorTargetsWithAssignments()
    }

    // Now update elevators
    this.elevators.forEach(elevator => {
      elevator.update()
      
      if (elevator.state === 'loading' && elevator.doorOpen) {
        // Handle passenger exits
        const passengersToRemove = elevator.passengers.filter(p => p.destinationFloor === elevator.currentFloor)
        passengersToRemove.forEach(passenger => {
          elevator.removePassenger(passenger.id)
          console.log(`Passenger ${passenger.id} exited at floor ${elevator.currentFloor}`)
        })

        // CRITICAL FIX: Handle assigned requests at current floor
        const assignedRequestsAtFloor = this.activeRequests.filter(
          req => req.originFloor === elevator.currentFloor && 
                 req.assignedElevator === elevator.id &&
                 req.isActive &&
                 !req.isServed
        )

        console.log(`E${elevator.id} at floor ${elevator.currentFloor}: ${assignedRequestsAtFloor.length} assigned requests`)

        assignedRequestsAtFloor.forEach(request => {
          if (elevator.passengers.length < elevator.capacity) {
            const passenger = {
              id: request.id,
              originFloor: request.originFloor,
              destinationFloor: request.destinationFloor,
              boardTime: Date.now(),
              waitTime: request.waitTime,
              priority: request.priority,
              isRealRequest: true
            }
            
            elevator.passengers.push(passenger)
            // CRITICAL FIX: Add destination to elevator's queue
            elevator.addRequest(passenger.destinationFloor)
            
            this.algorithmMetrics[this.currentAlgorithm].servedRequests++
            request.serve()
            
            if (request.direction) {
              this.removeFloorRequest(request.originFloor, request.direction)
            }
            
            console.log(`✅ ${this.currentAlgorithm.toUpperCase()}: Request ${request.id} served: ${request.originFloor}→${request.destinationFloor}`)
          }
        })

        // Minimal random passenger generation
        if (assignedRequestsAtFloor.length === 0 && Math.random() < 0.05) {
          elevator.addSimulatedPassenger()
        }
      }

      // Prevent over-capacity
      if (elevator.passengers.length > elevator.capacity) {
        const excess = elevator.passengers.length - elevator.capacity
        elevator.passengers = elevator.passengers.slice(0, elevator.capacity)
        console.warn(`Elevator ${elevator.id} over capacity, removed ${excess} passengers`)
      }
    })

    // Clean up served requests
    const servedRequests = this.activeRequests.filter(req => req.isServed)
    this.activeRequests = this.activeRequests.filter(req => req.isActive)
    
    if (servedRequests.length > 0) {
      this.servedRequestsHistory.push(...servedRequests)
      console.log(`Moved ${servedRequests.length} served requests to history`)
      
      if (this.servedRequestsHistory.length > 100) {
        this.servedRequestsHistory = this.servedRequestsHistory.slice(-100)
      }
    }

    // Clean up expired floor requests
    this.floorRequests = this.floorRequests.filter(req => {
      const isExpired = (Date.now() - req.timestamp) > 120000
      if (isExpired) {
        console.log(`Removing expired floor request: Floor ${req.floor} ${req.direction}`)
        return false
      }
      return req.active
    })

    // Track metrics
    this.algorithmMetrics[this.currentAlgorithm].totalDistance = this.elevators.reduce(
      (sum, e) => sum + (e.totalDistance || 0), 0
    )

    this.metricsService.update(this.elevators, this.getAllRequests())

    const updateTime = Date.now() - updateStart
    if (updateTime > 50) {
      console.warn(`Slow update cycle: ${updateTime}ms`)
    }
  }

  // CRITICAL FIX: New method to sync elevator targets with request assignments
  syncElevatorTargetsWithAssignments() {
    console.log('\n=== SYNCING ELEVATOR TARGETS ===')
    
    this.activeRequests.forEach(request => {
      if (request.assignedElevator !== null && request.isActive && !request.isServed) {
        const elevator = this.elevators[request.assignedElevator]
        if (elevator) {
          console.log(`Syncing E${elevator.id} with assigned request ${request.originFloor}→${request.destinationFloor}`)
          
          // CRITICAL FIX: If elevator is idle and request is for different floor, start moving
          if (elevator.state === 'idle' && elevator.currentFloor !== request.originFloor) {
            console.log(`E${elevator.id}: Starting movement to pickup floor ${request.originFloor}`)
            elevator.addRequest(request.originFloor)
          }
          // If elevator is already moving but doesn't have this floor in queue
          else if (!elevator.requestQueue.includes(request.originFloor) && 
                   elevator.currentFloor !== request.originFloor) {
            console.log(`E${elevator.id}: Adding pickup floor ${request.originFloor} to queue`)
            elevator.addRequest(request.originFloor)
          }
        }
      }
    })
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
    
    // Track request for current algorithm
    this.algorithmMetrics[this.currentAlgorithm].totalRequests++
    
    console.log(`Adding request: ${request.originFloor} → ${request.destinationFloor} (${this.currentAlgorithm} algorithm)`)
    
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
      config: this.config,
      currentAlgorithm: this.currentAlgorithm,
      algorithmMetrics: this.algorithmMetrics
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

  emergencyStop() {
    this.stop()
    this.elevators.forEach(elevator => {
      elevator.state = 'idle'
      elevator.requestQueue = []
      elevator.targetFloor = null
    })
  }
}

module.exports = SimulationEngine