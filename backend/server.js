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
  res.json({
    isRunning: simulationEngine.isRunning,
    elevators: simulationEngine.elevators.map(e => e.getStatus()),
    metrics: simulationEngine.getPerformanceMetrics(),
    config: simulationEngine.config,
    currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
  })
})

// Get algorithm comparison
app.get('/api/algorithm-comparison', (req, res) => {
  try {
    // Get all requests from simulation engine
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

// Switch algorithm (frontend calls POST)
app.post('/api/switch-algorithm', (req, res) => {
  try {
    const { algorithm } = req.body
    if (!['hybrid', 'scan'].includes(algorithm)) return res.status(400).json({ error: 'Invalid algorithm' })
    
    // Check if simulation engine has switchAlgorithm method
    if (typeof simulationEngine.switchAlgorithm === 'function') {
      const result = simulationEngine.switchAlgorithm(algorithm)
      res.json({ success: true, algorithm: result.algorithm })
    } else {
      // Fallback to config update
      simulationEngine.updateConfig({ algorithm })
      algorithmController.setCurrentAlgorithm(algorithm)
      res.json({ success: true, algorithm })
    }
  } catch (err) {
    console.error('/api/switch-algorithm error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Helper function to safely get request status
function safeGetRequestStatus(r) {
  if (typeof r.getStatus === 'function') {
    return r.getStatus()
  } else {
    // Handle plain objects from frontend
    return {
      id: r.id,
      type: r.type || 'floor_call',
      originFloor: r.originFloor,
      destinationFloor: r.destinationFloor,
      direction: r.direction,
      timestamp: r.timestamp,
      priority: r.priority || 2,
      waitTime: r.waitTime || (Date.now() - (r.timestamp || Date.now())),
      assignedElevator: r.assignedElevator,
      isActive: r.isActive !== undefined ? r.isActive : true,
      isServed: r.isServed !== undefined ? r.isServed : false,
      passengerCount: r.passengerCount || 1
    }
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Send initial state
  socket.emit('simulation_update', {
    elevators: simulationEngine.elevators.map(e => e.getStatus()),
    floorRequests: simulationEngine.floorRequests.map(r => safeGetRequestStatus(r)),
    activeRequests: simulationEngine.activeRequests.map(r => safeGetRequestStatus(r)),
    isRunning: simulationEngine.isRunning,
    currentTime: simulationEngine.currentTime,
    config: simulationEngine.config,
    currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
  })

  socket.on('start_simulation', (config) => {
    try {
      console.log('Starting simulation with config:', config)
      if (config) simulationEngine.updateConfig(config)
      const success = simulationEngine.start()

      if (success) {
        io.emit('simulation_update', {
          elevators: simulationEngine.elevators.map(e => e.getStatus()),
          floorRequests: simulationEngine.floorRequests.map(r => safeGetRequestStatus(r)),
          activeRequests: simulationEngine.activeRequests.map(r => safeGetRequestStatus(r)),
          isRunning: simulationEngine.isRunning,
          currentTime: simulationEngine.currentTime,
          config: simulationEngine.config,
          currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
        })
      }
    } catch (error) {
      console.error('Start simulation error:', error)
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('stop_simulation', () => {
    try {
      console.log('Stopping simulation')
      simulationEngine.stop()
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests.map(r => safeGetRequestStatus(r)),
        activeRequests: simulationEngine.activeRequests.map(r => safeGetRequestStatus(r)),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config,
        currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
      })
    } catch (error) {
      console.error('Stop simulation error:', error)
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('reset_simulation', () => {
    try {
      console.log('Resetting simulation')
      simulationEngine.reset()
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests.map(r => safeGetRequestStatus(r)),
        activeRequests: simulationEngine.activeRequests.map(r => safeGetRequestStatus(r)),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config,
        currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
      })
    } catch (error) {
      console.error('Reset simulation error:', error)
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('config_change', (config) => {
    try {
      console.log('Config change received:', config)
      simulationEngine.updateConfig(config)
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests.map(r => safeGetRequestStatus(r)),
        activeRequests: simulationEngine.activeRequests.map(r => safeGetRequestStatus(r)),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config,
        currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
      })
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
      console.log('Adding request:', request)
      const requestId = simulationEngine.addRequest(request)
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests.map(r => safeGetRequestStatus(r)),
        activeRequests: simulationEngine.activeRequests.map(r => safeGetRequestStatus(r)),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config,
        currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
      })
      socket.emit('request_added', { success: true, requestId })
    } catch (error) {
      console.error('Add request failed:', error)
      socket.emit('request_added', { success: false, error: error.message })
    }
  })

  socket.on('emergency_stop', () => {
    try {
      console.log('Emergency stop triggered')
      simulationEngine.emergencyStop()
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests.map(r => safeGetRequestStatus(r)),
        activeRequests: simulationEngine.activeRequests.map(r => safeGetRequestStatus(r)),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config,
        currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
      })
    } catch (error) {
      console.error('Emergency stop failed:', error)
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Real-time updates
setInterval(() => {
  if (simulationEngine.isRunning) {
    const systemState = simulationEngine.getState()
    
    // Handle different state formats
    const elevators = systemState.elevators || simulationEngine.elevators.map(e => e.getStatus())
    const floorRequests = systemState.floorRequests || simulationEngine.floorRequests.map(r => safeGetRequestStatus(r))
    const activeRequests = systemState.activeRequests || simulationEngine.activeRequests.map(r => safeGetRequestStatus(r))
    
    io.emit('simulation_update', {
      elevators,
      floorRequests,
      activeRequests,
      isRunning: systemState.isRunning,
      currentTime: systemState.currentTime,
      config: systemState.config,
      currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
    })

    const performanceMetrics = simulationEngine.getPerformanceMetrics()
    const realTimeMetrics = simulationEngine.getRealTimeMetrics()

    io.emit('metrics_update', {
      performance: performanceMetrics,
      realTime: realTimeMetrics,
      historical: simulationEngine.getHistoricalData ? simulationEngine.getHistoricalData() : [],
      currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
    })
  }
}, 1000)

// Performance monitoring
setInterval(() => {
  if (simulationEngine.isRunning) {
    const systemLoad = simulationEngine.getSystemLoad()
    const currentAlgorithm = simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
    console.log(`System Load - Active Requests: ${systemLoad.activeRequests}, Buffered: ${systemLoad.bufferedRequests || 0}, Avg Utilization: ${(systemLoad.averageLoad * 100).toFixed(1)}%, Algorithm: ${currentAlgorithm}`)
  }
}, 5000)

server.listen(PORT, () => {
  console.log(`🚀 Elevator Simulation Server running on port ${PORT}`)
  console.log(`📊 Dashboard available at http://localhost:${PORT}`)
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`)
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