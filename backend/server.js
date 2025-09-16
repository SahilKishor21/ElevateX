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
    config: simulationEngine.config
  })
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Send initial state
  socket.emit('simulation_update', {
    elevators: simulationEngine.elevators.map(e => e.getStatus()),
    floorRequests: simulationEngine.floorRequests,
    activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
    isRunning: simulationEngine.isRunning,
    currentTime: simulationEngine.currentTime,
    config: simulationEngine.config
  })

  socket.on('start_simulation', (config) => {
    try {
      console.log('Starting simulation with config:', config)
      
      if (config) {
        simulationEngine.updateConfig(config)
      }
      
      const success = simulationEngine.start()
      
      if (success) {
        io.emit('simulation_update', {
          elevators: simulationEngine.elevators.map(e => e.getStatus()),
          floorRequests: simulationEngine.floorRequests,
          activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
          isRunning: simulationEngine.isRunning,
          currentTime: simulationEngine.currentTime,
          config: simulationEngine.config
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
        floorRequests: simulationEngine.floorRequests,
        activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config
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
        floorRequests: simulationEngine.floorRequests,
        activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config
      })
    } catch (error) {
      console.error('Reset simulation error:', error)
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('config_change', (config) => {
    try {
      console.log('Config change received:', config)
      
      const oldRunning = simulationEngine.isRunning
      simulationEngine.updateConfig(config)
      
      // Send updated state immediately
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests,
        activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config
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
        floorRequests: simulationEngine.floorRequests,
        activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config
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
      
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators.map(e => e.getStatus()),
        floorRequests: simulationEngine.floorRequests,
        activeRequests: simulationEngine.activeRequests.map(r => r.getStatus()),
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime,
        config: simulationEngine.config
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
    
    // Ensure all elevator data is complete
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
      currentTime: systemState.currentTime
    })

    const performanceMetrics = simulationEngine.getPerformanceMetrics()
    const realTimeMetrics = simulationEngine.getRealTimeMetrics()

    io.emit('metrics_update', {
      performance: performanceMetrics,
      realTime: realTimeMetrics,
      historical: simulationEngine.getHistoricalData()
    })
  }
}, 1000)

// Performance monitoring
setInterval(() => {
  if (simulationEngine.isRunning) {
    const systemLoad = simulationEngine.getSystemLoad()
    console.log(`System Load - Active Requests: ${systemLoad.activeRequests}, Buffered: ${systemLoad.bufferedRequests}, Avg Utilization: ${(systemLoad.averageLoad * 100).toFixed(1)}%`)
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