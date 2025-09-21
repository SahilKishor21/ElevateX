const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
require('dotenv').config()

const SimulationEngine = require('./src/services/simulationEngine')
const ElevatorController = require('./src/controllers/elevatorController')
const algorithmController = require('./src/controllers/algorithmController')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

const PORT = process.env.PORT || 3001
const DEBUG = process.env.NODE_ENV === 'development'

// ADDED: Track simulation initialization state to prevent reset on restart
let isSimulationInitialized = false

app.use(helmet())
app.use(compression())
app.use(cors())
app.use(express.json())
app.use(morgan('combined'))

const simulationEngine = new SimulationEngine()
const elevatorController = new ElevatorController(simulationEngine)

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.get('/api/status', (req, res) => {
  const performanceMetrics = simulationEngine.getPerformanceMetrics()
  
  if (DEBUG) {
    console.log('API Status - Performance Metrics:', {
      averageWaitTime: performanceMetrics.averageWaitTime,
      starvationCount: performanceMetrics.starvationCount
    })
  }

  res.json({
    isRunning: simulationEngine.isRunning,
    elevators: simulationEngine.elevators.map(e => e.getStatus()),
    metrics: performanceMetrics,
    config: simulationEngine.config,
    currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm,
    isInitialized: isSimulationInitialized // ADDED: Include initialization status
  })
})

// Get algorithm comparison
app.get('/api/algorithm-comparison', (req, res) => {
  try {
    const allRequests = simulationEngine.getAllRequests ? simulationEngine.getAllRequests() : 
                        [...simulationEngine.floorRequests, ...simulationEngine.activeRequests]
    const currentAlg = simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : 
                       simulationEngine.config.algorithm || algorithmController.getCurrentAlgorithmName()
    const result = algorithmController.compareAlgorithms(simulationEngine.elevators, allRequests, currentAlg)
    res.json(result)
  } catch (err) {
    console.error('/api/algorithm-comparison error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Switch algorithm
app.post('/api/switch-algorithm', (req, res) => {
  try {
    const { algorithm } = req.body
    if (!['hybrid', 'scan'].includes(algorithm)) return res.status(400).json({ error: 'Invalid algorithm' })
    
    if (typeof simulationEngine.switchAlgorithm === 'function') {
      const result = simulationEngine.switchAlgorithm(algorithm)
      res.json({ success: true, algorithm: result.algorithm })
    } else {
      simulationEngine.updateConfig({ algorithm })
      algorithmController.setCurrentAlgorithm(algorithm)
      res.json({ success: true, algorithm })
    }
  } catch (err) {
    console.error('/api/switch-algorithm error:', err)
    res.status(500).json({ error: err.message })
  }
})

// CRITICAL: Enhanced helper function to safely get request status
function safeGetRequestStatus(r) {
  if (!r) return null
  
  if (typeof r.getStatus === 'function') {
    return r.getStatus()
  } else {
    // Handle plain objects from frontend
    return {
      id: r.id || `unknown_${Date.now()}`,
      type: r.type || 'floor_call',
      originFloor: typeof r.originFloor === 'number' ? r.originFloor : 1,
      destinationFloor: typeof r.destinationFloor === 'number' ? r.destinationFloor : null,
      direction: r.direction || 'up',
      timestamp: r.timestamp || Date.now(),
      priority: r.priority || 2,
      waitTime: typeof r.waitTime === 'number' ? r.waitTime : (Date.now() - (r.timestamp || Date.now())),
      assignedElevator: r.assignedElevator,
      isActive: r.isActive !== undefined ? r.isActive : true,
      isServed: r.isServed !== undefined ? r.isServed : false,
      passengerCount: r.passengerCount || 1,
      // CRITICAL: Include finalWaitTime for metrics calculation
      finalWaitTime: r.finalWaitTime
    }
  }
}

// CRITICAL: FIXED helper to get complete system state
function getCompleteSystemState() {
  try {
    const elevators = simulationEngine.elevators.map(e => e.getStatus())
    
    // CRITICAL FIX: Don't process floor requests through safeGetRequestStatus
    // Floor requests are simple objects: { floor, direction, timestamp, active }
    // FloorIndicator expects: requests.filter(req => req.floor === floor)
    const floorRequests = (simulationEngine.floorRequests || []).filter(r => r && r.active)
    
    // Active requests DO need processing through safeGetRequestStatus
    const activeRequests = simulationEngine.activeRequests.map(r => safeGetRequestStatus(r)).filter(Boolean)
    
    // Get all metrics
    const performanceMetrics = simulationEngine.getPerformanceMetrics()
    const realTimeMetrics = simulationEngine.getRealTimeMetrics()
    const assignmentCompliance = simulationEngine.getAssignmentCompliance ? simulationEngine.getAssignmentCompliance() : null
    
    if (DEBUG && (performanceMetrics.averageWaitTime > 0 || floorRequests.length > 0)) {
      console.log('Server State - Complete Check:', {
        floorRequestsCount: floorRequests.length,
        floorRequestsSample: floorRequests.slice(0, 3),
        averageWaitTime: performanceMetrics.averageWaitTime,
        activeRequests: activeRequests.length,
        servedRequests: simulationEngine.servedRequestsHistory?.length || 0,
        isInitialized: isSimulationInitialized
      })
    }

    return {
      elevators,
      floorRequests, // FIXED: Simple floor request objects - no processing needed
      activeRequests,
      isRunning: simulationEngine.isRunning,
      currentTime: simulationEngine.currentTime,
      config: simulationEngine.config,
      currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm,
      assignmentMetrics: simulationEngine.assignmentMetrics || {
        lobbyToUpperRequests: 0,
        upperToLobbyRequests: 0,
        peakHourRequests: 0,
        starvationEvents: 0,
        thirtySecondEscalations: 0
      },
      assignmentCompliance: assignmentCompliance,
      performanceMetrics,
      realTimeMetrics,
      isInitialized: isSimulationInitialized // ADDED: Include initialization status
    }
  } catch (error) {
    console.error('Error getting complete system state:', error)
    return {
      elevators: [],
      floorRequests: [],
      activeRequests: [],
      isRunning: false,
      currentTime: 0,
      config: simulationEngine.config,
      error: error.message,
      isInitialized: isSimulationInitialized
    }
  }
}

io.on('connection', (socket) => {
  if (DEBUG) {
    console.log('Client connected:', socket.id)
  }

  // CRITICAL: Send initial state with all metrics
  try {
    const initialState = getCompleteSystemState()
    socket.emit('simulation_update', initialState)
    
    // Also send initial metrics
    socket.emit('metrics_update', {
      performance: initialState.performanceMetrics,
      realTime: initialState.realTimeMetrics,
      historical: simulationEngine.getHistoricalData ? simulationEngine.getHistoricalData() : [],
      assignmentMetrics: initialState.assignmentMetrics,
      assignmentCompliance: initialState.assignmentCompliance,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Error sending initial state:', error)
    socket.emit('error', { message: 'Failed to get initial state' })
  }

  // FIXED: Modified start_simulation handler to prevent reset on restart
  socket.on('start_simulation', (config) => {
    try {
      if (DEBUG) {
        console.log('Starting simulation with config:', config, 'isInitialized:', isSimulationInitialized)
      }
      
      // CRITICAL FIX: Only update config on initial start, not on restart
      if (config) {
        if (!isSimulationInitialized) {
          console.log('Initial start - updating configuration')
          simulationEngine.updateConfig(config)
          isSimulationInitialized = true
        } else {
          console.log('Restart detected - preserving existing configuration and state')
          // For restart, we don't update config to preserve simulation state
          // Only log that we're restarting with existing state
        }
      } else if (!isSimulationInitialized) {
        // If no config provided and not initialized, this might be an error case
        console.warn('No config provided for uninitialized simulation')
      }
      
      const success = simulationEngine.start()

      if (success) {
        const state = getCompleteSystemState()
        io.emit('simulation_update', state)
        
        if (DEBUG) {
          console.log('Simulation started successfully. State preserved:', {
            activeRequests: state.activeRequests.length,
            floorRequests: state.floorRequests.length,
            elevators: state.elevators.length
          })
        }
      }
    } catch (error) {
      console.error('Start simulation error:', error)
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('stop_simulation', () => {
    try {
      if (DEBUG) {
        console.log('Stopping simulation (preserving state for restart)')
      }
      simulationEngine.stop()
      // NOTE: Don't reset isSimulationInitialized flag here - we want to preserve state for restart
      const state = getCompleteSystemState()
      io.emit('simulation_update', state)
    } catch (error) {
      console.error('Stop simulation error:', error)
      socket.emit('error', { message: error.message })
    }
  })

  // FIXED: Modified reset_simulation handler to reset initialization flag
  socket.on('reset_simulation', () => {
    try {
      if (DEBUG) {
        console.log('Resetting simulation (clearing all state)')
      }
      simulationEngine.reset()
      isSimulationInitialized = false // CRITICAL: Reset the initialization flag
      const state = getCompleteSystemState()
      io.emit('simulation_update', state)
      
      if (DEBUG) {
        console.log('Simulation reset complete. Initialization flag cleared.')
      }
    } catch (error) {
      console.error('Reset simulation error:', error)
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('config_change', (config) => {
    try {
      if (DEBUG) {
        console.log('Config change received:', config)
      }
      simulationEngine.updateConfig(config)
      // Note: Don't change initialization flag on config updates
      const state = getCompleteSystemState()
      io.emit('simulation_update', state)
      socket.emit('config_updated', {
        success: true,
        config: simulationEngine.config,
        message: 'Configuration updated successfully'
      })
    } catch (error) {
      console.error('Config update failed:', error)
      socket.emit('config_updated', {
        success: false,
        error: error.message
      })
    }
  })

  socket.on('add_request', (request) => {
    try {
      if (DEBUG) {
        console.log('Adding request:', `${request.originFloor}→${request.destinationFloor || 'Floor Call'}`)
      }
      const requestId = simulationEngine.addRequest(request)
      const state = getCompleteSystemState()
      io.emit('simulation_update', state)
      socket.emit('request_added', { success: true, requestId })
    } catch (error) {
      console.error('Add request failed:', error)
      socket.emit('request_added', { success: false, error: error.message })
    }
  })

  socket.on('emergency_stop', () => {
    try {
      if (DEBUG) {
        console.log('Emergency stop triggered')
      }
      simulationEngine.emergencyStop()
      // Emergency stop should preserve initialization state for quick restart
      const state = getCompleteSystemState()
      io.emit('simulation_update', state)
    } catch (error) {
      console.error('Emergency stop failed:', error)
      socket.emit('error', { message: error.message })
    }
  })

  // ASSIGNMENT: Assignment-specific endpoints
  socket.on('get_assignment_compliance', () => {
    try {
      const compliance = simulationEngine.getAssignmentCompliance()
      socket.emit('assignment_compliance', compliance)
    } catch (error) {
      console.error('Get assignment compliance failed:', error)
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('trigger_peak_traffic', (data) => {
    try {
      const { type = 'morning' } = data || {}
      if (DEBUG) {
        console.log(`Triggering ${type} peak traffic`)
      }
      
      // Generate multiple requests based on peak type
      const requestCount = type === 'morning' ? 8 : type === 'evening' ? 6 : 4
      
      for (let i = 0; i < requestCount; i++) {
        setTimeout(() => {
          let originFloor, destinationFloor
          
          if (type === 'morning') {
            // Morning: mostly lobby to upper floors
            originFloor = Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 5) + 1
            destinationFloor = Math.floor(Math.random() * 10) + 6
          } else if (type === 'evening') {
            // Evening: mostly upper floors to lobby
            originFloor = Math.floor(Math.random() * 10) + 6
            destinationFloor = Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 5) + 1
          } else {
            // Lunch: mixed
            originFloor = Math.floor(Math.random() * simulationEngine.config.numFloors) + 1
            destinationFloor = Math.floor(Math.random() * simulationEngine.config.numFloors) + 1
            while (destinationFloor === originFloor) {
              destinationFloor = Math.floor(Math.random() * simulationEngine.config.numFloors) + 1
            }
          }
          
          simulationEngine.addRequest({
            type: 'floor_call',
            originFloor,
            destinationFloor,
            direction: destinationFloor > originFloor ? 'up' : 'down',
            priority: 3, // High priority for peak traffic
            timestamp: Date.now()
          })
        }, i * 500) // Stagger requests
      }
      
      socket.emit('peak_traffic_triggered', { success: true, type, requestCount })
    } catch (error) {
      console.error('Trigger peak traffic failed:', error)
      socket.emit('peak_traffic_triggered', { success: false, error: error.message })
    }
  })

  socket.on('disconnect', () => {
    if (DEBUG) {
      console.log('Client disconnected:', socket.id)
    }
  })
})

// CRITICAL: Enhanced real-time updates with proper floor requests handling
setInterval(() => {
  if (simulationEngine.isRunning) {
    try {
      const systemState = getCompleteSystemState()
      
      // CRITICAL: Ensure floor requests are properly formatted for frontend
      io.emit('simulation_update', {
        elevators: systemState.elevators,
        floorRequests: systemState.floorRequests, // FIXED: Already properly formatted, no additional processing
        activeRequests: systemState.activeRequests,
        isRunning: systemState.isRunning,
        currentTime: systemState.currentTime,
        config: systemState.config,
        currentAlgorithm: systemState.currentAlgorithm,
        assignmentMetrics: systemState.assignmentMetrics,
        assignmentCompliance: systemState.assignmentCompliance,
        isInitialized: systemState.isInitialized // ADDED: Include initialization status
      })

      // CRITICAL: Send comprehensive metrics update
      const performanceMetrics = simulationEngine.getPerformanceMetrics()
      const realTimeMetrics = simulationEngine.getRealTimeMetrics()
      const assignmentCompliance = systemState.assignmentCompliance

      io.emit('metrics_update', {
        performance: {
          ...performanceMetrics,
          // Ensure all critical metrics are present
          averageWaitTime: typeof performanceMetrics.averageWaitTime === 'number' ? performanceMetrics.averageWaitTime : 0,
          starvationCount: typeof performanceMetrics.starvationCount === 'number' ? performanceMetrics.starvationCount : 0,
          assignmentCompliance: assignmentCompliance?.complianceScore || 100,
          peakHourEfficiency: performanceMetrics.peakHourEfficiency || 100,
          requestDistribution: performanceMetrics.requestDistribution || {
            lobbyToUpper: 0,
            upperToLobby: 0, 
            interFloor: 0,
            total: 0
          }
        },
        realTime: {
          ...realTimeMetrics,
          starvationAlerts: realTimeMetrics.starvationAlerts || realTimeMetrics.alertsCount || 0,
          peakHourStatus: realTimeMetrics.peakHourStatus || 'NORMAL',
          complianceScore: assignmentCompliance?.complianceScore || 100
        },
        historical: simulationEngine.getHistoricalData ? simulationEngine.getHistoricalData() : [],
        currentAlgorithm: systemState.currentAlgorithm,
        assignmentMetrics: systemState.assignmentMetrics,
        assignmentCompliance: assignmentCompliance,
        timestamp: Date.now()
      })

      // Debug logging for metrics and floor requests flow
      if (DEBUG && (performanceMetrics.averageWaitTime > 0 || systemState.floorRequests.length > 0)) {
        console.log(`Server Metrics Flow - Avg wait: ${performanceMetrics.averageWaitTime.toFixed(1)}s, Starvation: ${performanceMetrics.starvationCount}, Active: ${systemState.activeRequests.length}, Floor Requests: ${systemState.floorRequests.length}, Initialized: ${systemState.isInitialized}`)
      }
      
    } catch (error) {
      console.error('Real-time update error:', error)
      io.emit('error', { message: 'Real-time update failed' })
    }
  }
}, 1000)

// Performance monitoring
setInterval(() => {
  if (simulationEngine.isRunning) {
    try {
      const systemLoad = simulationEngine.getSystemLoad()
      const currentAlgorithm = simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
      
      if (DEBUG) {
        console.log(`System Performance - Active Requests: ${systemLoad.activeRequests}, Buffered: ${systemLoad.bufferedRequests || 0}, Avg Utilization: ${(systemLoad.averageLoad * 100).toFixed(1)}%, Algorithm: ${currentAlgorithm}, Initialized: ${isSimulationInitialized}`)
      }
      
      // Alert on performance issues
      if (systemLoad.activeRequests > simulationEngine.elevators.length * 20) {
        console.warn(`⚠️ High system load: ${systemLoad.activeRequests} active requests`)
      }
      
    } catch (error) {
      console.error('Performance monitoring error:', error)
    }
  }
}, 5000)

// CRITICAL: Health check for metrics calculation and floor requests
setInterval(() => {
  if (simulationEngine.isRunning) {
    try {
      const metrics = simulationEngine.getPerformanceMetrics()
      const servedCount = simulationEngine.servedRequestsHistory?.length || 0
      const activeCount = simulationEngine.activeRequests?.length || 0
      const floorRequestsCount = simulationEngine.floorRequests?.length || 0
      
      if (DEBUG && (servedCount > 0 || activeCount > 10 || floorRequestsCount > 0)) {
        console.log(`Health Check - Served: ${servedCount}, Active: ${activeCount}, Floor Requests: ${floorRequestsCount}, Avg Wait: ${metrics.averageWaitTime?.toFixed(1) || 0}s, Initialized: ${isSimulationInitialized}`)
      }
      
      // Alert if metrics seem stuck
      if (servedCount > 10 && metrics.averageWaitTime === 0) {
        console.warn('⚠️ Metrics calculation issue: No average wait time despite served requests')
      }
      
      // Alert if floor requests aren't working
      if (floorRequestsCount === 0 && activeCount > 5) {
        console.warn('⚠️ Floor requests may not be registering properly')
      }
      
      // Alert if simulation seems stuck in uninitialized state
      if (!isSimulationInitialized && simulationEngine.isRunning) {
        console.warn('⚠️ Simulation running but not properly initialized')
      }
      
    } catch (error) {
      console.error('Health check error:', error)
    }
  }
}, 10000)

server.listen(PORT, () => {
  console.log(`Elevator Simulation Server running on port ${PORT}`)
  console.log(`Dashboard available at http://localhost:${PORT}`)
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`)
  if (DEBUG) {
    console.log('Debug mode enabled - enhanced logging active')
    console.log('Pause/restart functionality: State preservation enabled')
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  simulationEngine.stop()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  simulationEngine.stop()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})