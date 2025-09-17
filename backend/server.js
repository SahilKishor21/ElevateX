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
    origin: process.env.FRONTEND_URL || "http://localhost:3000" || "https://elevate-x-seven.vercel.app/",
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

global.simulationEngine = simulationEngine

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.get('/api/status', (req, res) => {
  const allRequests = simulationEngine.getAllRequests ? simulationEngine.getAllRequests() : simulationEngine.activeRequests
  
  res.json({
    isRunning: simulationEngine.isRunning,
    elevators: simulationEngine.elevators.map(e => e.getStatus()),
    metrics: simulationEngine.getPerformanceMetrics(),
    config: simulationEngine.config,
    activeRequests: simulationEngine.activeRequests.length,
    totalRequests: allRequests.length,
    currentAlgorithm: simulationEngine.getCurrentAlgorithm()
  })
})

// CRITICAL FIX: Proper algorithm switching endpoint
app.post('/api/switch-algorithm', (req, res) => {
  try {
    const { algorithm } = req.body
    
    console.log(`API request to switch algorithm to: ${algorithm}`)
    
    if (!['hybrid', 'scan'].includes(algorithm)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid algorithm. Must be "hybrid" or "scan"' 
      })
    }

    // CRITICAL FIX: Actually switch the algorithm in simulation engine
    const result = simulationEngine.switchAlgorithm(algorithm)
    
    // Also update the algorithm controller for consistency
    algorithmController.currentAlgorithm = algorithm
    
    console.log(`Algorithm switch result:`, result)
    
    res.json({
      success: true,
      algorithm: algorithm,
      message: `Successfully switched to ${algorithm} algorithm`,
      simulationRunning: simulationEngine.isRunning,
      schedulerClass: result.schedulerClass
    })

  } catch (error) {
    console.error('Algorithm switch error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// CRITICAL FIX: Updated algorithm comparison endpoint with real data
app.get('/api/algorithm-comparison', (req, res) => {
  console.log('=== ALGORITHM COMPARISON REQUEST ===')
  console.log('simulationEngine.isRunning:', simulationEngine.isRunning)
  console.log('simulationEngine.elevators.length:', simulationEngine.elevators?.length || 0)
  console.log('simulationEngine.activeRequests.length:', simulationEngine.activeRequests?.length || 0)
  console.log('Current algorithm:', simulationEngine.getCurrentAlgorithm())
  
  if (simulationEngine.elevators.length === 0) {
    console.log('No elevators found, initializing simulation...')
    simulationEngine.initialize(simulationEngine.config)
  }
  
  const allRequests = simulationEngine.getAllRequests ? simulationEngine.getAllRequests() : simulationEngine.activeRequests
  
  const comparison = algorithmController.compareAlgorithms(
    simulationEngine.elevators,
    allRequests
  )
  
  // Add current algorithm info
  comparison.currentAlgorithm = simulationEngine.getCurrentAlgorithm()
  comparison.algorithmMetrics = simulationEngine.algorithmMetrics
  
  console.log('Sending comparison data with current algorithm:', comparison.currentAlgorithm)
  res.json(comparison)
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  const allRequests = simulationEngine.getAllRequests ? simulationEngine.getAllRequests() : simulationEngine.activeRequests
  
  socket.emit('simulation_update', {
    elevators: simulationEngine.elevators.map(e => e.getStatus()),
    floorRequests: simulationEngine.floorRequests,
    activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
    isRunning: simulationEngine.isRunning,
    currentTime: simulationEngine.currentTime,
    config: simulationEngine.config,
    totalRequests: allRequests.length,
    currentAlgorithm: simulationEngine.getCurrentAlgorithm()
  })

  socket.on('start_simulation', (config) => {
    try {
      console.log(`Starting simulation with config:`, config)
      console.log(`Current algorithm: ${simulationEngine.getCurrentAlgorithm()}`)
      
      if (config) {
        simulationEngine.updateConfig(config)
      }
      
      if (simulationEngine.elevators.length === 0) {
        console.log('Initializing elevators before starting simulation...')
        simulationEngine.initialize(simulationEngine.config)
      }
      
      const success = simulationEngine.start()
      
      if (success) {
        const allRequests = simulationEngine.getAllRequests ? simulationEngine.getAllRequests() : simulationEngine.activeRequests
        
        io.emit('simulation_update', {
          elevators: simulationEngine.elevators.map(e => e.getStatus()),
          floorRequests: simulationEngine.floorRequests,
          activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
          isRunning: simulationEngine.isRunning,
          currentTime: simulationEngine.currentTime,
          config: simulationEngine.config,
          totalRequests: allRequests.length,
          currentAlgorithm: simulationEngine.getCurrentAlgorithm()
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
      
      const allRequests = simulationEngine.getAllRequests ? simulationEngine.getAllRequests() : simulationEngine.activeRequests
      
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests,
        activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config,
        totalRequests: allRequests.length,
        currentAlgorithm: simulationEngine.getCurrentAlgorithm()
      })
    } catch (error) {
      console.error('Stop simulation error:', error)
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('reset_simulation', () => {
    try {
      console.log('Resetting simulation')
      const currentAlgorithm = simulationEngine.getCurrentAlgorithm()
      simulationEngine.reset()
      // Restore algorithm after reset
      simulationEngine.switchAlgorithm(currentAlgorithm)
      
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests,
        activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config,
        totalRequests: 0,
        currentAlgorithm: simulationEngine.getCurrentAlgorithm()
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
      
      const allRequests = simulationEngine.getAllRequests ? simulationEngine.getAllRequests() : simulationEngine.activeRequests
      
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests,
        activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config,
        totalRequests: allRequests.length,
        currentAlgorithm: simulationEngine.getCurrentAlgorithm()
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
    console.log('=== ADD_REQUEST RECEIVED ===')
    console.log('Raw request data:', JSON.stringify(request, null, 2))
    console.log('Current algorithm:', simulationEngine.getCurrentAlgorithm())
    
    try {
      const requestId = simulationEngine.addRequest(request)
      console.log('Request added with ID:', requestId)
      
      const allRequests = simulationEngine.getAllRequests ? simulationEngine.getAllRequests() : simulationEngine.activeRequests
      
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests,
        activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config,
        totalRequests: allRequests.length,
        currentAlgorithm: simulationEngine.getCurrentAlgorithm()
      })

      socket.emit('request_added', {
        success: true,
        requestId: requestId
      })

    } catch (error) {
      console.error('Add request failed:', error)
      socket.emit('request_added', {
        success: false,
        error: error.message
      })
    }
  })

  socket.on('emergency_stop', () => {
    try {
      console.log('Emergency stop triggered')
      simulationEngine.emergencyStop()
      
      const allRequests = simulationEngine.getAllRequests ? simulationEngine.getAllRequests() : simulationEngine.activeRequests
      
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests,
        activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config,
        totalRequests: allRequests.length,
        currentAlgorithm: simulationEngine.getCurrentAlgorithm()
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
    const allRequests = simulationEngine.getAllRequests ? simulationEngine.getAllRequests() : simulationEngine.activeRequests
    
    const completeElevatorData = systemState.elevators.map(elevator => ({
      ...elevator,
      passengers: elevator.passengers || [],
      requestQueue: elevator.requestQueue || [],
      capacity: elevator.capacity || 8,
      totalTrips: elevator.totalTrips || 0,
      totalDistance: elevator.totalDistance || 0
    }))

    io.emit('simulation_update', {
      elevators: completeElevatorData,
      floorRequests: systemState.floorRequests || [],
      activeRequests: systemState.activeRequests || [],
      isRunning: systemState.isRunning,
      currentTime: systemState.currentTime,
      config: simulationEngine.config,
      totalRequests: allRequests.length,
      currentAlgorithm: simulationEngine.getCurrentAlgorithm()
    })

    const performanceMetrics = simulationEngine.getPerformanceMetrics()
    const realTimeMetrics = simulationEngine.getRealTimeMetrics()

    io.emit('metrics_update', {
      performance: performanceMetrics,
      realTime: realTimeMetrics,
      historical: simulationEngine.getHistoricalData(),
      timestamp: Date.now()
    })

    try {
      const algorithmComparison = algorithmController.compareAlgorithms(
        simulationEngine.elevators,
        allRequests
      )
      algorithmComparison.currentAlgorithm = simulationEngine.getCurrentAlgorithm()
      io.emit('algorithm_update', algorithmComparison)
    } catch (error) {
      console.error('Algorithm comparison update failed:', error)
    }
  }
}, 1000)

setInterval(() => {
  if (simulationEngine.isRunning) {
    const systemLoad = simulationEngine.getSystemLoad()
    console.log(`System Load - Active Requests: ${systemLoad.activeRequests}, Avg Utilization: ${(systemLoad.averageLoad * 100).toFixed(1)}%, Algorithm: ${simulationEngine.getCurrentAlgorithm()}`)
  }
}, 5000)

server.listen(PORT, () => {
  console.log(`Elevator Simulation Server running on port ${PORT}`)
  console.log(`Dashboard available at http://localhost:${PORT}`)
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`)
})

// Graceful shutdown
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