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
    elevators: simulationEngine.elevators,
    metrics: simulationEngine.getMetrics()
  })
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.emit('simulation_update', {
    elevators: simulationEngine.elevators,
    floorRequests: simulationEngine.floorRequests,
    activeRequests: simulationEngine.activeRequests,
    isRunning: simulationEngine.isRunning,
    currentTime: simulationEngine.currentTime
  })

  socket.on('start_simulation', (config) => {
    try {
      elevatorController.startSimulation(config)
      io.emit('simulation_update', {
        elevators: simulationEngine.elevators,
        floorRequests: simulationEngine.floorRequests,
        activeRequests: simulationEngine.activeRequests,
        isRunning: simulationEngine.isRunning,
        currentTime: simulationEngine.currentTime
      })
    } catch (error) {
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('stop_simulation', () => {
    elevatorController.stopSimulation()
    io.emit('simulation_update', {
      elevators: simulationEngine.elevators,
      floorRequests: simulationEngine.floorRequests,
      activeRequests: simulationEngine.activeRequests,
      isRunning: simulationEngine.isRunning,
      currentTime: simulationEngine.currentTime
    })
  })

  socket.on('reset_simulation', () => {
    elevatorController.resetSimulation()
    io.emit('simulation_update', {
      elevators: simulationEngine.elevators,
      floorRequests: simulationEngine.floorRequests,
      activeRequests: simulationEngine.activeRequests,
      isRunning: simulationEngine.isRunning,
      currentTime: simulationEngine.currentTime
    })
  })

  socket.on('config_change', (config) => {
    elevatorController.updateConfig(config)
  })

  socket.on('add_request', (request) => {
    elevatorController.addRequest(request)
    io.emit('simulation_update', {
      elevators: simulationEngine.elevators,
      floorRequests: simulationEngine.floorRequests,
      activeRequests: simulationEngine.activeRequests,
      isRunning: simulationEngine.isRunning,
      currentTime: simulationEngine.currentTime
    })
  })

  socket.on('emergency_stop', () => {
    elevatorController.emergencyStop()
    io.emit('simulation_update', {
      elevators: simulationEngine.elevators,
      floorRequests: simulationEngine.floorRequests,
      activeRequests: simulationEngine.activeRequests,
      isRunning: simulationEngine.isRunning,
      currentTime: simulationEngine.currentTime
    })
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

setInterval(() => {
  if (simulationEngine.isRunning) {
    io.emit('simulation_update', {
      elevators: simulationEngine.elevators,
      floorRequests: simulationEngine.floorRequests,
      activeRequests: simulationEngine.activeRequests,
      isRunning: simulationEngine.isRunning,
      currentTime: simulationEngine.currentTime
    })

    io.emit('metrics_update', {
      performance: simulationEngine.getPerformanceMetrics(),
      realTime: simulationEngine.getRealTimeMetrics(),
      historical: simulationEngine.getHistoricalData()
    })
  }
}, 1000)

server.listen(PORT, () => {
  console.log(`Elevator Simulation Server running on port ${PORT}`)
  console.log(`Dashboard available at http://localhost:${PORT}`)
})