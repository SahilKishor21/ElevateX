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
    
    // Initialize schedulers and track current algorithm
    this.hybridScheduler = new HybridScheduler()
    this.scanAlgorithm = new ScanAlgorithm()
    this.currentAlgorithm = 'hybrid'
    this.scheduler = this.hybridScheduler
    
    this.metricsService = new MetricsService()
    this.requestIdCounter = 0
    this.requestBuffer = []
    this.lastOptimizationTime = 0
    
    // Track metrics for each algorithm separately
    this.algorithmMetrics = {
      hybrid: { totalRequests: 0, servedRequests: 0, totalDistance: 0 },
      scan: { totalRequests: 0, servedRequests: 0, totalDistance: 0 }
    }

    // Speed configurations for UI
    this.SPEED_OPTIONS = [
      { value: 1, label: '1x Normal' },
      { value: 2, label: '2x Fast' },
      { value: 5, label: '5x Very Fast' },
      { value: 10, label: '10x Ultra Fast' }
    ]
  }

  switchAlgorithm(algorithm) {
    if (!['hybrid', 'scan'].includes(algorithm)) {
      throw new Error('Invalid algorithm. Must be "hybrid" or "scan"')
    }

    console.log(`Switching from ${this.currentAlgorithm} to ${algorithm}`)

    this.currentAlgorithm = algorithm
    this.scheduler = algorithm === 'hybrid' ? this.hybridScheduler : this.scanAlgorithm
    
    // Reset algorithm-specific state when switching
    if (algorithm === 'scan') {
      this.scanAlgorithm.resetScanDirections()
      console.log('SCAN algorithm initialized with fresh scan directions')
    }

    // Clear existing assignments to allow new algorithm to reassign
    this.activeRequests.forEach(request => {
      if (request.isActive && !request.isServed) {
        request.assignedElevator = null
        console.log(`Cleared assignment for request ${request.id} to allow ${algorithm} reassignment`)
      }
    })
    
    console.log(`Algorithm switched to: ${algorithm}`)
    
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
  const activeRequestsCount = this.activeRequests.length
  const bufferedRequestsCount = this.requestBuffer.length
  const elevatorUtilization = this.elevators.map(e => e.getUtilization())
  const averageLoad = this.elevators.length > 0 ? this.elevators.reduce((sum, e) => sum + e.getLoad(), 0) / this.elevators.length : 0
  const overCapacityElevators = this.elevators.filter(e => e.passengers.length > e.capacity).length

  // ADDED: Performance indicators
  const totalSystemCapacity = this.elevators.length * (this.config.capacity || 8)
  const currentOccupancy = this.elevators.reduce((sum, e) => sum + (e.passengers?.length || 0), 0)
  const systemUtilization = totalSystemCapacity > 0 ? currentOccupancy / totalSystemCapacity : 0
  
  const performanceStatus = this.getPerformanceStatus(activeRequestsCount, systemUtilization, averageLoad)

  return {
    activeRequests: activeRequestsCount,
    bufferedRequests: bufferedRequestsCount,
    elevatorUtilization,
    averageLoad,
    overCapacityElevators,
    systemUtilization,
    currentOccupancy,
    totalSystemCapacity,
    performanceStatus,
    isHighLoad: activeRequestsCount > this.elevators.length * 15
  }
}

getPerformanceStatus(activeRequests, systemUtilization, averageLoad) {
  if (activeRequests > this.elevators.length * 20 || systemUtilization > 0.9) {
    return { status: 'overloaded', color: 'red', message: 'System at capacity - expect delays' }
  }
  if (activeRequests > this.elevators.length * 15 || systemUtilization > 0.7) {
    return { status: 'high_load', color: 'orange', message: 'High system load' }
  }
  if (activeRequests > this.elevators.length * 8 || systemUtilization > 0.5) {
    return { status: 'moderate_load', color: 'yellow', message: 'Moderate system load' }
  }
  return { status: 'normal', color: 'green', message: 'System operating normally' }
}

// ENHANCED: Better emergency stop for high-volume scenarios
emergencyStop() {
  console.log('Emergency stop initiated')
  
  this.stop()
  
  // Clear all requests and buffers
  this.activeRequests = []
  this.requestBuffer = []
  this.floorRequests = []
  
  this.elevators.forEach(elevator => {
    elevator.state = 'idle'
    elevator.requestQueue = []
    elevator.targetFloor = null
    elevator.passengers = [] // Clear passengers in emergency
    elevator.doorOpen = false
  })
  
  console.log('Emergency stop completed - all systems cleared')
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
      const elevator = new Elevator(i, this.config.capacity, colors[i % colors.length])
      
      // Set initial speed on elevator creation
      if (typeof elevator.setSpeed === 'function') {
        elevator.setSpeed(this.config.speed || 1)
      }
      
      this.elevators.push(elevator)
    }

    // Reset SCAN algorithm state on initialization
    if (this.currentAlgorithm === 'scan') {
      this.scanAlgorithm.resetScanDirections()
    }

    this.metricsService.reset()
    console.log(`Initialized ${this.config.numElevators} elevators with ${this.currentAlgorithm} algorithm, speed: ${this.config.speed || 1}x`)
  }

  start() {
    if (this.isRunning) return false

    this.isRunning = true
    this.startTime = Date.now()
    
    console.log(`Starting simulation with ${this.currentAlgorithm} algorithm, request frequency: ${this.config.requestFrequency}/min`)
    
    // FIXED: Only position elevators initially if request frequency > 0
    if (this.config.requestFrequency > 0) {
      this.positionElevatorsInitially()
      console.log('Initial elevator positioning enabled (request frequency > 0)')
    } else {
      console.log('Initial elevator positioning disabled (request frequency = 0)')
      // Clear any existing requests when starting with 0 frequency
      this.activeRequests = []
      this.floorRequests = []
      this.requestBuffer = []
    }
    
    this.intervalId = setInterval(() => {
      this.update()
    }, DEFAULT_CONFIG.SIMULATION_INTERVAL)

    // FIXED: Only start request generator if frequency > 0
    if (this.config.requestFrequency > 0) {
      this.requestGeneratorInterval = setInterval(() => {
        if (Math.random() < this.config.requestFrequency / 600) {
          this.generateRandomRequest()
        }
      }, DEFAULT_CONFIG.SIMULATION_INTERVAL)
      console.log('Automatic request generation enabled')
    } else {
      console.log('Automatic request generation disabled (frequency = 0)')
      this.requestGeneratorInterval = null
    }

    return true
  }

  positionElevatorsInitially() {
    // Spread elevators across different floors when starting
    this.elevators.forEach((elevator, index) => {
      const targetFloor = Math.floor((index + 1) * this.config.numFloors / (this.elevators.length + 1)) + 1
      if (elevator.currentFloor !== targetFloor) {
        console.log(`Positioning E${elevator.id} to floor ${targetFloor}`)
        elevator.addRequest(targetFloor)
      }
    })
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

    console.log(`Simulation stopped. Algorithm: ${this.currentAlgorithm}`)
    return true
  }

  reset() {
    this.stop()
    
    // FIXED: Clear all requests and elevator states completely
    this.floorRequests = []
    this.activeRequests = []
    this.servedRequestsHistory = []
    this.requestBuffer = []
    
    // FIXED: Reset all elevators to ground floor and idle state
    this.elevators.forEach(elevator => {
      elevator.currentFloor = 1
      elevator.targetFloor = null
      elevator.state = 'idle'
      elevator.direction = 'idle'
      elevator.passengers = []
      elevator.requestQueue = []
      elevator.doorOpen = false
      elevator.loadingStartTime = null
      elevator.doorOpenTime = null
    })
    
    console.log('System completely reset - all elevators at floor 1, idle state')
    this.initialize(this.config)
  }

  removeFloorRequest(floor, direction) {
    this.floorRequests = this.floorRequests.filter(
      req => !(req.floor === floor && req.direction === direction && req.active)
    )
  }

  update() {
  const updateStart = Date.now()
  this.currentTime = Date.now() - this.startTime

  // IMPROVED: Batch process request buffer more efficiently
  if (this.requestBuffer.length > 0) {
    this.processRequestBuffer()
  }

  // Update request wait times
  this.activeRequests.forEach(request => {
    if (typeof request.updateWaitTime === 'function') {
      request.updateWaitTime()
    }
  })

  // CRITICAL FIX: Only process unassigned requests to prevent double-assignment
  const unassignedRequests = this.activeRequests.filter(r => 
    r.isActive && 
    !r.isServed && 
    (r.assignedElevator === null || r.assignedElevator === undefined)
  )

  if (unassignedRequests.length > 0) {
    console.log(`\n=== SCHEDULING PHASE (${this.currentAlgorithm.toUpperCase()}) ===`)
    console.log(`Processing ${unassignedRequests.length} unassigned requests (${this.activeRequests.length} total active)`)
    
    if (this.currentAlgorithm === 'hybrid') {
      // Use hybrid scheduler with performance improvements
      this.scheduler.optimizeRoutes(this.elevators, this.activeRequests)
      this.scheduler.preventStarvation(this.activeRequests, this.elevators)
      this.scheduler.positionIdleElevators(this.elevators, this.config.numFloors)
    } else if (this.currentAlgorithm === 'scan') {
      console.log('Using SCAN algorithm for request assignment')
      this.scheduler.assignRequests(this.elevators, this.activeRequests)
    }

    this.syncElevatorTargetsWithAssignments()
  }

  // PHASE 2: ELEVATOR UPDATES
  this.elevators.forEach(elevator => {
    if (this.currentAlgorithm === 'scan' && elevator.requestQueue.length > 1) {
      elevator.requestQueue = this.scheduler.sortRequestQueue(elevator, elevator.requestQueue)
    }

    elevator.update()
    
    if (elevator.state === 'loading' && elevator.doorOpen) {
      this.handleElevatorAtFloor(elevator)
    }
  })

  // PHASE 3: IDLE ELEVATOR POSITIONING (only when no pending requests)
  if (unassignedRequests.length === 0) {
    this.positionIdleElevators()
  }

  // PHASE 4: CLEANUP - Enhanced for high-volume scenarios
  this.cleanupEnhanced()

  // PHASE 5: METRICS
  this.algorithmMetrics[this.currentAlgorithm].totalDistance = this.elevators.reduce(
    (sum, e) => sum + (e.totalDistance || 0), 0
  )
  this.metricsService.update(this.elevators, this.getAllRequests())

  // PERFORMANCE MONITORING: Log performance under high load
  if (this.activeRequests.length > 50) {
    const processingTime = Date.now() - updateStart
    console.log(`⚡ High-volume processing: ${this.activeRequests.length} requests, ${processingTime}ms processing time`)
  }
}


  syncElevatorTargetsWithAssignments() {
    console.log('Syncing elevator targets with assignments')
    
    this.activeRequests.forEach(request => {
      if (request.assignedElevator !== null && request.isActive && !request.isServed) {
        const elevator = this.elevators[request.assignedElevator]
        if (elevator) {
          // If elevator is idle and request is for different floor, start moving
          if (elevator.state === 'idle' && elevator.currentFloor !== request.originFloor) {
            console.log(`E${elevator.id}: Starting movement to pickup floor ${request.originFloor}`)
            elevator.addRequest(request.originFloor)
          }
          // If elevator is moving but doesn't have this floor in queue
          else if (!elevator.requestQueue.includes(request.originFloor) && 
                   elevator.currentFloor !== request.originFloor) {
            console.log(`E${elevator.id}: Adding pickup floor ${request.originFloor} to queue`)
            elevator.addRequest(request.originFloor)
          }
        }
      }
    })
  }

  handleElevatorAtFloor(elevator) {
    console.log(`E${elevator.id} doors open at floor ${elevator.currentFloor}`)
    
    // 1. Handle passenger exits
    const exitingPassengers = elevator.passengers.filter(p => p.destinationFloor === elevator.currentFloor)
    exitingPassengers.forEach(passenger => {
      elevator.removePassenger(passenger.id)
      console.log(`Passenger ${passenger.id} exited at floor ${elevator.currentFloor}`)
    })

    // 2. Handle passenger boarding (assigned requests)
    const boardingRequests = this.activeRequests.filter(
      req => req.originFloor === elevator.currentFloor && 
             req.assignedElevator === elevator.id &&
             req.isActive &&
             !req.isServed
    )

    console.log(`${boardingRequests.length} passengers boarding E${elevator.id}`)

    boardingRequests.forEach(request => {
      if (elevator.passengers.length < elevator.capacity) {
        // Update wait time BEFORE serving to get accurate metrics
        if (typeof request.updateWaitTime === 'function') {
          request.updateWaitTime()
        }

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
        elevator.addRequest(passenger.destinationFloor)
        
        this.algorithmMetrics[this.currentAlgorithm].servedRequests++
        
        // Serve the request (sets isServed=true, isActive=false)
        request.serve()
        
        // Add served request to metrics history for wait time calculations
        this.metricsService.addRequestToHistory(request)
        
        if (request.direction) {
          this.removeFloorRequest(request.originFloor, request.direction)
        }
        
        console.log(`${this.currentAlgorithm.toUpperCase()}: Request ${request.id} served: ${request.originFloor}→${request.destinationFloor}, wait time: ${Math.round(request.waitTime/1000)}s`)
      }
    })
  }

  positionIdleElevators() {
    // FIXED: Don't reposition elevators if request frequency is 0 (pure manual mode)
    if (this.config.requestFrequency === 0) {
      console.log('Idle elevator positioning disabled (request frequency = 0)')
      return
    }

    // Only for hybrid algorithm - SCAN handles its own positioning
    if (this.currentAlgorithm === 'hybrid') {
      const idleElevators = this.elevators.filter(e => 
        e.state === 'idle' && 
        e.requestQueue.length === 0 && 
        !e.targetFloor &&
        !this.activeRequests.some(r => r.assignedElevator === e.id && r.isActive && !r.isServed)
      )

      if (idleElevators.length > 0) {
        console.log(`Positioning ${idleElevators.length} idle elevators`)
        
        idleElevators.forEach((elevator, index) => {
          const targetFloor = Math.floor((index + 1) * this.config.numFloors / (idleElevators.length + 1)) + 1
          
          if (elevator.currentFloor !== targetFloor) {
            console.log(`Positioning idle E${elevator.id} to floor ${targetFloor}`)
            elevator.addRequest(targetFloor)
          }
        })
      }
    }
  }

  cleanup() {
    // Clean up served requests
    const servedRequests = this.activeRequests.filter(req => req.isServed)
    this.activeRequests = this.activeRequests.filter(req => req.isActive)
    
    if (servedRequests.length > 0) {
      // Add to simulation history
      this.servedRequestsHistory.push(...servedRequests)
      
      // Add to metrics service history for wait time calculations
      servedRequests.forEach(request => {
        // Ensure wait time is calculated before adding to history
        if (typeof request.updateWaitTime === 'function') {
          request.updateWaitTime()
        }
        this.metricsService.addRequestToHistory(request)
      })
      
      if (this.servedRequestsHistory.length > 100) {
        this.servedRequestsHistory = this.servedRequestsHistory.slice(-100)
      }
    }

    // Clean up expired floor requests
    this.floorRequests = this.floorRequests.filter(req => {
      const isExpired = (Date.now() - req.timestamp) > 120000
      return !isExpired && req.active
    })
  }

  addRequest(requestData) {
  // IMPROVED: Prevent system overload
  if (this.activeRequests.length > this.elevators.length * 30) {
    console.warn('🚨 System overloaded - request buffered')
    const request = new Request({
      ...requestData,
      id: `req_${++this.requestIdCounter}_${Date.now()}`
    })
    this.requestBuffer.push(request)
    return request.id
  }

  const request = new Request({
    ...requestData,
    id: `req_${++this.requestIdCounter}_${Date.now()}`
  })
  
  this.algorithmMetrics[this.currentAlgorithm].totalRequests++
  
  console.log(`Adding request: ${request.originFloor} → ${request.destinationFloor} (${this.currentAlgorithm} algorithm)`)
  
  this.activeRequests.push(request)
  
  if (request.direction) {
    this.addFloorRequest(request.originFloor, request.direction)
  }

  return request.id
}

  processRequestBuffer() {
  // IMPROVED: Dynamic batch size based on system load
  const systemLoad = this.activeRequests.length / (this.elevators.length * 10) // Requests per elevator capacity
  const batchSize = systemLoad > 0.8 ? 25 : systemLoad > 0.5 ? 15 : 10
  
  const batch = this.requestBuffer.splice(0, batchSize)
  console.log(`Processing request buffer: ${batch.length} requests (batch size: ${batchSize})`)
  
  batch.forEach(request => {
    this.activeRequests.push(request)
    if (request.direction) {
      this.addFloorRequest(request.originFloor, request.direction)
    }
  })
  
  if (this.requestBuffer.length > 100) {
    console.warn(`⚠️ Large request buffer: ${this.requestBuffer.length} requests pending`)
  }
}

// ENHANCED: Better cleanup for high-volume scenarios
cleanupEnhanced() {
  const cleanupStart = Date.now()
  
  // Clean up served requests
  const servedRequests = this.activeRequests.filter(req => req.isServed)
  this.activeRequests = this.activeRequests.filter(req => req.isActive)
  
  if (servedRequests.length > 0) {
    // Add to simulation history
    this.servedRequestsHistory.push(...servedRequests)
    
    // Add to metrics service history for wait time calculations
    servedRequests.forEach(request => {
      if (typeof request.updateWaitTime === 'function') {
        request.updateWaitTime()
      }
      this.metricsService.addRequestToHistory(request)
    })
    
    // IMPROVED: More aggressive cleanup for high-volume scenarios
    const maxHistorySize = this.activeRequests.length > 100 ? 50 : 100
    if (this.servedRequestsHistory.length > maxHistorySize) {
      this.servedRequestsHistory = this.servedRequestsHistory.slice(-maxHistorySize)
    }
  }

  // Clean up expired floor requests
  this.floorRequests = this.floorRequests.filter(req => {
    const isExpired = (Date.now() - req.timestamp) > 120000
    return !isExpired && req.active
  })

  // PERFORMANCE: Log cleanup performance for high-volume scenarios
  if (servedRequests.length > 20) {
    const cleanupTime = Date.now() - cleanupStart
    console.log(`🧹 Cleanup: ${servedRequests.length} requests processed in ${cleanupTime}ms`)
  }
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
  // IMPROVED: Prevent system overload during high-volume scenarios
  if (this.activeRequests.length > this.elevators.length * 25) {
    console.log('⚠️ System at capacity - throttling random request generation')
    return
  }

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
          const oldValue = this.config[key]
          this.config[key] = newConfig[key]
          
          // Apply speed changes to all elevators immediately
          if (key === 'speed') {
            console.log(`Updating simulation speed to ${newConfig[key]}x`)
            this.elevators.forEach(elevator => {
              if (typeof elevator.setSpeed === 'function') {
                elevator.setSpeed(newConfig[key])
                console.log(`Applied speed ${newConfig[key]}x to elevator ${elevator.id}`)
              }
            })
          }

          // FIXED: Handle request frequency changes during runtime
          if (key === 'requestFrequency') {
            console.log(`Request frequency changed from ${oldValue} to ${newConfig[key]}`)
            
            if (newConfig[key] === 0) {
              // Stop automatic request generation
              if (this.requestGeneratorInterval) {
                clearInterval(this.requestGeneratorInterval)
                this.requestGeneratorInterval = null
              }
              console.log('Automatic request generation stopped')
              
              // Clear pending requests to ensure pure manual mode
              this.activeRequests = this.activeRequests.filter(r => r.isServed || r.assignedElevator !== null)
              this.floorRequests = []
              this.requestBuffer = []
              console.log('Cleared pending automatic requests')
              
            } else if (oldValue === 0 && newConfig[key] > 0) {
              // Start automatic request generation
              this.requestGeneratorInterval = setInterval(() => {
                if (Math.random() < this.config.requestFrequency / 600) {
                  this.generateRandomRequest()
                }
              }, DEFAULT_CONFIG.SIMULATION_INTERVAL)
              console.log('Automatic request generation started')
            }
          }
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

  getSpeedOptions() {
    return this.SPEED_OPTIONS
  }
}

module.exports = SimulationEngine