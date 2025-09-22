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

let isSimulationInitialized = false
let lastSuccessfulUpdate = Date.now()
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 5
const UPDATE_TIMEOUT = 5000

app.use(helmet())
app.use(compression())
app.use(cors())
app.use(express.json())
app.use(morgan('combined'))

const simulationEngine = new SimulationEngine()
const elevatorController = new ElevatorController(simulationEngine)

function withTimeout(promise, timeoutMs = UPDATE_TIMEOUT, operation = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })
  ])
}

async function safeExecute(fn, fallback = null, operation = 'simulation operation') {
  try {
    return await withTimeout(
      Promise.resolve(fn()), 
      UPDATE_TIMEOUT, 
      operation
    )
  } catch (error) {
    console.error(`Safe execution failed for ${operation}:`, error)
    consecutiveErrors++
    
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(`Too many consecutive errors (${consecutiveErrors}). Attempting recovery...`)
      attemptRecovery()
    }
    
    return fallback
  }
}

function attemptRecovery() {
  try {
    console.log('Attempting simulation recovery...')
    
    if (simulationEngine.activeRequests && Array.isArray(simulationEngine.activeRequests)) {
      const hangingRequests = simulationEngine.activeRequests.filter(req => {
        const waitTime = Date.now() - (req.timestamp || 0)
        return waitTime > 300000
      })
      
      if (hangingRequests.length > 0) {
        console.log(`Found ${hangingRequests.length} potentially hanging requests, cleaning up...`)
        hangingRequests.forEach(req => {
          try {
            req.isServed = true
            req.finalWaitTime = Date.now() - req.timestamp
            if (simulationEngine.completeRequest && typeof simulationEngine.completeRequest === 'function') {
              simulationEngine.completeRequest(req.id)
            }
          } catch (cleanupError) {
            console.error('Error cleaning up hanging request:', cleanupError)
          }
        })
      }
    }
    
    consecutiveErrors = 0
    
    io.emit('simulation_recovery', {
      timestamp: Date.now(),
      message: 'Simulation recovered from hanging state'
    })
    
    console.log('Recovery attempt completed')
  } catch (recoveryError) {
    console.error('Recovery attempt failed:', recoveryError)
  }
}

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    lastUpdate: lastSuccessfulUpdate,
    consecutiveErrors,
    isHealthy: consecutiveErrors < MAX_CONSECUTIVE_ERRORS
  })
})

app.get('/api/status', (req, res) => {
  safeExecute(
    () => simulationEngine.getPerformanceMetrics(),
    { averageWaitTime: 0, starvationCount: 0 },
    'get performance metrics'
  ).then(performanceMetrics => {
    if (DEBUG) {
      console.log('API Status - Performance Metrics:', {
        averageWaitTime: performanceMetrics.averageWaitTime,
        starvationCount: performanceMetrics.starvationCount
      })
    }

    res.json({
      isRunning: simulationEngine.isRunning,
      elevators: simulationEngine.elevators?.map(e => {
        try {
          return e.getStatus()
        } catch (err) {
          console.warn('Error getting elevator status:', err)
          return { id: e.id || 'unknown', floor: 1, state: 'idle' }
        }
      }) || [],
      metrics: performanceMetrics,
      config: simulationEngine.config,
      currentAlgorithm: simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm,
      isInitialized: isSimulationInitialized,
      health: {
        lastUpdate: lastSuccessfulUpdate,
        consecutiveErrors,
        isHealthy: consecutiveErrors < MAX_CONSECUTIVE_ERRORS
      }
    })
  }).catch(error => {
    console.error('API Status error:', error)
    res.status(500).json({ error: 'Failed to get simulation status' })
  })
})

app.get('/api/algorithm-comparison', (req, res) => {
  try {
    const allRequests = simulationEngine.getAllRequests ? simulationEngine.getAllRequests() : 
                        [...(simulationEngine.floorRequests || []), ...(simulationEngine.activeRequests || [])]
    const currentAlg = simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : 
                       simulationEngine.config.algorithm || algorithmController.getCurrentAlgorithmName()
    const result = algorithmController.compareAlgorithms(simulationEngine.elevators, allRequests, currentAlg)
    res.json(result)
  } catch (err) {
    console.error('/api/algorithm-comparison error:', err)
    res.status(500).json({ error: err.message })
  }
})

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

function safeGetRequestStatus(r) {
  if (!r) return null
  
  try {
    if (typeof r.getStatus === 'function') {
      return r.getStatus()
    } else {
      const status = {
        id: r.id || `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: r.type || 'floor_call',
        originFloor: typeof r.originFloor === 'number' && r.originFloor >= 1 ? r.originFloor : 1,
        destinationFloor: typeof r.destinationFloor === 'number' && r.destinationFloor >= 1 ? r.destinationFloor : null,
        direction: ['up', 'down'].includes(r.direction) ? r.direction : 'up',
        timestamp: typeof r.timestamp === 'number' && r.timestamp > 0 ? r.timestamp : Date.now(),
        priority: typeof r.priority === 'number' ? r.priority : 2,
        waitTime: typeof r.waitTime === 'number' ? r.waitTime : Math.max(0, Date.now() - (r.timestamp || Date.now())),
        assignedElevator: r.assignedElevator,
        isActive: r.isActive !== undefined ? Boolean(r.isActive) : true,
        isServed: r.isServed !== undefined ? Boolean(r.isServed) : false,
        passengerCount: typeof r.passengerCount === 'number' && r.passengerCount > 0 ? r.passengerCount : 1,
        finalWaitTime: r.finalWaitTime
      }
      
      if (status.isServed && !status.finalWaitTime) {
        status.finalWaitTime = status.waitTime
      }
      
      return status
    }
  } catch (error) {
    console.error('Error getting request status:', error, r)
    return null
  }
}

async function getCompleteSystemState() {
  try {
    const elevators = await safeExecute(
      () => simulationEngine.elevators?.map(e => {
        try {
          return e.getStatus()
        } catch (err) {
          console.warn('Error getting elevator status:', err)
          return { 
            id: e.id || 'unknown', 
            floor: e.currentFloor || 1, 
            state: 'idle', 
            direction: 'idle',
            passengers: 0,
            targetFloor: null
          }
        }
      }) || [],
      [],
      'get elevators status'
    )
    
    const floorRequests = await safeExecute(
      () => {
        const requests = simulationEngine.floorRequests || []
        return requests.filter(r => {
          return r && 
                 typeof r.floor === 'number' && 
                 r.floor >= 1 && 
                 ['up', 'down'].includes(r.direction) &&
                 r.active === true
        })
      },
      [],
      'get floor requests'
    )
    
    const activeRequests = await safeExecute(
      () => {
        const requests = simulationEngine.activeRequests || []
        return requests.map(r => safeGetRequestStatus(r)).filter(Boolean)
      },
      [],
      'get active requests'
    )
    
    const performanceMetrics = await safeExecute(
      () => simulationEngine.getPerformanceMetrics(),
      {
        averageWaitTime: 0,
        maxWaitTime: 0,
        starvationCount: 0,
        throughput: 0,
        userSatisfactionScore: 100,
        energyEfficiency: 85,
        systemReliability: 100
      },
      'get performance metrics'
    )
    
    const realTimeMetrics = await safeExecute(
      () => simulationEngine.getRealTimeMetrics(),
      {
        currentTime: simulationEngine.currentTime || 0,
        activeRequests: activeRequests.length,
        systemLoad: 0,
        alertsCount: 0
      },
      'get real-time metrics'
    )
    
    const assignmentCompliance = await safeExecute(
      () => simulationEngine.getAssignmentCompliance ? simulationEngine.getAssignmentCompliance() : null,
      null,
      'get assignment compliance'
    )
    
    if (DEBUG && (performanceMetrics.averageWaitTime > 0 || floorRequests.length > 0)) {
      console.log('Server State - Complete Check:', {
        floorRequestsCount: floorRequests.length,
        activeRequestsCount: activeRequests.length,
        averageWaitTime: performanceMetrics.averageWaitTime,
        servedRequests: simulationEngine.servedRequestsHistory?.length || 0,
        isInitialized: isSimulationInitialized,
        consecutiveErrors
      })
    }

    const state = {
      elevators,
      floorRequests,
      activeRequests,
      isRunning: simulationEngine.isRunning,
      currentTime: simulationEngine.currentTime || 0,
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
      isInitialized: isSimulationInitialized
    }
    
    consecutiveErrors = Math.max(0, consecutiveErrors - 1)
    lastSuccessfulUpdate = Date.now()
    
    return state
    
  } catch (error) {
    console.error('Critical error getting complete system state:', error)
    consecutiveErrors++
    
    return {
      elevators: [],
      floorRequests: [],
      activeRequests: [],
      isRunning: false,
      currentTime: 0,
      config: simulationEngine.config || {},
      error: error.message,
      isInitialized: isSimulationInitialized,
      health: {
        consecutiveErrors,
        lastError: error.message,
        timestamp: Date.now()
      }
    }
  }
}

io.on('connection', (socket) => {
  if (DEBUG) {
    console.log('Client connected:', socket.id)
  }

  getCompleteSystemState().then(initialState => {
    socket.emit('simulation_update', initialState)
    
    socket.emit('metrics_update', {
      performance: initialState.performanceMetrics,
      realTime: initialState.realTimeMetrics,
      historical: simulationEngine.getHistoricalData ? simulationEngine.getHistoricalData() : [],
      assignmentMetrics: initialState.assignmentMetrics,
      assignmentCompliance: initialState.assignmentCompliance,
      timestamp: Date.now()
    })
  }).catch(error => {
    console.error('Error sending initial state:', error)
    socket.emit('error', { message: 'Failed to get initial state' })
  })

  socket.on('start_simulation', (config) => {
    try {
      if (DEBUG) {
        console.log('Starting simulation with config:', config, 'isInitialized:', isSimulationInitialized)
      }
      
      if (config) {
        if (!isSimulationInitialized) {
          console.log('Initial start - updating configuration')
          simulationEngine.updateConfig(config)
          isSimulationInitialized = true
        } else {
          console.log('Restart detected - preserving existing configuration and state')
        }
      } else if (!isSimulationInitialized) {
        console.warn('No config provided for uninitialized simulation')
      }
      
      const success = simulationEngine.start()
      
      consecutiveErrors = 0

      if (success) {
        getCompleteSystemState().then(state => {
          io.emit('simulation_update', state)
          
          if (DEBUG) {
            console.log('Simulation started successfully. State preserved:', {
              activeRequests: state.activeRequests.length,
              floorRequests: state.floorRequests.length,
              elevators: state.elevators.length
            })
          }
        }).catch(error => {
          console.error('Error getting state after start:', error)
          socket.emit('error', { message: 'Simulation started but failed to get state' })
        })
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
      
      getCompleteSystemState().then(state => {
        io.emit('simulation_update', state)
      }).catch(error => {
        console.error('Error getting state after stop:', error)
        socket.emit('error', { message: 'Simulation stopped but failed to get state' })
      })
    } catch (error) {
      console.error('Stop simulation error:', error)
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('reset_simulation', () => {
    try {
      if (DEBUG) {
        console.log('Resetting simulation (clearing all state)')
      }
      simulationEngine.reset()
      isSimulationInitialized = false
      consecutiveErrors = 0
      
      getCompleteSystemState().then(state => {
        io.emit('simulation_update', state)
        
        if (DEBUG) {
          console.log('Simulation reset complete. Initialization flag cleared.')
        }
      }).catch(error => {
        console.error('Error getting state after reset:', error)
        socket.emit('error', { message: 'Simulation reset but failed to get state' })
      })
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
      
      getCompleteSystemState().then(state => {
        io.emit('simulation_update', state)
        socket.emit('config_updated', {
          success: true,
          config: simulationEngine.config,
          message: 'Configuration updated successfully'
        })
      }).catch(error => {
        console.error('Error getting state after config update:', error)
        socket.emit('config_updated', {
          success: false,
          error: 'Config updated but failed to get state'
        })
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
      
      getCompleteSystemState().then(state => {
        io.emit('simulation_update', state)
        socket.emit('request_added', { success: true, requestId })
      }).catch(error => {
        console.error('Error getting state after adding request:', error)
        socket.emit('request_added', { success: false, error: 'Request added but failed to get state' })
      })
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
      
      getCompleteSystemState().then(state => {
        io.emit('simulation_update', state)
      }).catch(error => {
        console.error('Error getting state after emergency stop:', error)
        socket.emit('error', { message: 'Emergency stop executed but failed to get state' })
      })
    } catch (error) {
      console.error('Emergency stop failed:', error)
      socket.emit('error', { message: error.message })
    }
  })

  socket.on('trigger_recovery', () => {
    try {
      console.log('Manual recovery triggered by client')
      attemptRecovery()
      
      setTimeout(() => {
        getCompleteSystemState().then(state => {
          io.emit('simulation_update', state)
          socket.emit('recovery_complete', { success: true, timestamp: Date.now() })
        }).catch(error => {
          socket.emit('recovery_complete', { success: false, error: error.message })
        })
      }, 1000)
    } catch (error) {
      console.error('Manual recovery failed:', error)
      socket.emit('recovery_complete', { success: false, error: error.message })
    }
  })

  socket.on('get_assignment_compliance', () => {
    safeExecute(
      () => simulationEngine.getAssignmentCompliance(),
      null,
      'get assignment compliance'
    ).then(compliance => {
      socket.emit('assignment_compliance', compliance)
    }).catch(error => {
      socket.emit('error', { message: error.message })
    })
  })

  socket.on('trigger_peak_traffic', (data) => {
    try {
      const { type = 'morning' } = data || {}
      if (DEBUG) {
        console.log(`Triggering ${type} peak traffic`)
      }
      
      const requestCount = type === 'morning' ? 8 : type === 'evening' ? 6 : 4
      
      for (let i = 0; i < requestCount; i++) {
        setTimeout(() => {
          try {
            let originFloor, destinationFloor
            
            if (type === 'morning') {
              originFloor = Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 5) + 1
              destinationFloor = Math.floor(Math.random() * 10) + 6
            } else if (type === 'evening') {
              originFloor = Math.floor(Math.random() * 10) + 6
              destinationFloor = Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 5) + 1
            } else {
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
              priority: 3,
              timestamp: Date.now()
            })
          } catch (reqError) {
            console.error('Error adding peak traffic request:', reqError)
          }
        }, i * 500)
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

const realTimeUpdateInterval = setInterval(() => {
  if (!simulationEngine.isRunning) return

  try {
    getCompleteSystemState().then(systemState => {
      io.emit('simulation_update', {
        elevators: systemState.elevators,
        floorRequests: systemState.floorRequests,
        activeRequests: systemState.activeRequests,
        isRunning: systemState.isRunning,
        currentTime: systemState.currentTime,
        config: systemState.config,
        currentAlgorithm: systemState.currentAlgorithm,
        assignmentMetrics: systemState.assignmentMetrics,
        assignmentCompliance: systemState.assignmentCompliance,
        isInitialized: systemState.isInitialized
      })

      const metricsUpdate = {
        performance: {
          ...systemState.performanceMetrics,
          averageWaitTime: typeof systemState.performanceMetrics.averageWaitTime === 'number' ? systemState.performanceMetrics.averageWaitTime : 0,
          starvationCount: typeof systemState.performanceMetrics.starvationCount === 'number' ? systemState.performanceMetrics.starvationCount : 0,
          assignmentCompliance: systemState.assignmentCompliance?.complianceScore || 100,
          peakHourEfficiency: systemState.performanceMetrics.peakHourEfficiency || 100
        },
        realTime: {
          ...systemState.realTimeMetrics,
          starvationAlerts: systemState.realTimeMetrics.starvationAlerts || systemState.realTimeMetrics.alertsCount || 0,
          peakHourStatus: systemState.realTimeMetrics.peakHourStatus || 'NORMAL',
          complianceScore: systemState.assignmentCompliance?.complianceScore || 100
        },
        historical: simulationEngine.getHistoricalData ? simulationEngine.getHistoricalData() : [],
        currentAlgorithm: systemState.currentAlgorithm,
        assignmentMetrics: systemState.assignmentMetrics,
        assignmentCompliance: systemState.assignmentCompliance,
        timestamp: Date.now(),
        health: {
          consecutiveErrors,
          lastSuccessfulUpdate,
          isHealthy: consecutiveErrors < MAX_CONSECUTIVE_ERRORS
        }
      }

      io.emit('metrics_update', metricsUpdate)

      if (DEBUG && (systemState.performanceMetrics.averageWaitTime > 0 || systemState.floorRequests.length > 0)) {
        console.log(`Server Metrics Flow - Avg wait: ${systemState.performanceMetrics.averageWaitTime.toFixed(1)}s, Starvation: ${systemState.performanceMetrics.starvationCount}, Active: ${systemState.activeRequests.length}, Floor Requests: ${systemState.floorRequests.length}, Errors: ${consecutiveErrors}`)
      }
      
    }).catch(error => {
      console.error('Real-time update error:', error)
      consecutiveErrors++
      
      io.emit('error', { 
        message: 'Real-time update failed',
        consecutiveErrors,
        suggestRecovery: consecutiveErrors >= 3
      })
      
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error('Too many consecutive real-time errors, attempting recovery...')
        attemptRecovery()
      }
    })
  } catch (syncError) {
    console.error('Synchronous error in real-time update:', syncError)
    consecutiveErrors++
  }
}, 1000)

const performanceMonitoringInterval = setInterval(() => {
  if (!simulationEngine.isRunning) return

  try {
    safeExecute(
      () => simulationEngine.getSystemLoad(),
      { activeRequests: 0, averageLoad: 0 },
      'get system load'
    ).then(systemLoad => {
      const currentAlgorithm = simulationEngine.getCurrentAlgorithm ? simulationEngine.getCurrentAlgorithm() : simulationEngine.config.algorithm
      
      if (DEBUG) {
        console.log(`System Performance - Active: ${systemLoad.activeRequests}, Buffered: ${systemLoad.bufferedRequests || 0}, Utilization: ${(systemLoad.averageLoad * 100).toFixed(1)}%, Algorithm: ${currentAlgorithm}, Errors: ${consecutiveErrors}`)
      }
      
      if (systemLoad.activeRequests > simulationEngine.elevators.length * 20) {
        console.warn(`⚠️ High system load: ${systemLoad.activeRequests} active requests`)
      }
      
    }).catch(error => {
      console.error('Performance monitoring error:', error)
    })
  } catch (syncError) {
    console.error('Synchronous error in performance monitoring:', syncError)
  }
}, 5000)

const healthCheckInterval = setInterval(() => {
  if (!simulationEngine.isRunning) return

  try {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastSuccessfulUpdate
    
    if (timeSinceLastUpdate > 30000) {
      console.warn(`⚠️ Potential deadlock detected: No successful updates for ${timeSinceLastUpdate}ms`)
      attemptRecovery()
      return
    }
    
    safeExecute(
      () => ({
        metrics: simulationEngine.getPerformanceMetrics(),
        served: simulationEngine.servedRequestsHistory?.length || 0,
        active: simulationEngine.activeRequests?.length || 0,
        floor: simulationEngine.floorRequests?.length || 0
      }),
      { metrics: { averageWaitTime: 0 }, served: 0, active: 0, floor: 0 },
      'health check data'
    ).then(({ metrics, served, active, floor }) => {
      if (DEBUG && (served > 0 || active > 10 || floor > 0)) {
        console.log(`Health Check - Served: ${served}, Active: ${active}, Floor: ${floor}, Avg Wait: ${metrics.averageWaitTime?.toFixed(1) || 0}s, Errors: ${consecutiveErrors}, Last Update: ${timeSinceLastUpdate}ms ago`)
      }
      
      if (served > 10 && metrics.averageWaitTime === 0) {
        console.warn('⚠️ Metrics calculation issue: No average wait time despite served requests')
      }
      
      if (floor === 0 && active > 5) {
        console.warn('⚠️ Floor requests may not be registering properly')
      }
      
      if (!isSimulationInitialized && simulationEngine.isRunning) {
        console.warn('⚠️ Simulation running but not properly initialized')
      }
      
      if (simulationEngine.activeRequests && Array.isArray(simulationEngine.activeRequests)) {
        const hangingRequests = simulationEngine.activeRequests.filter(req => {
          const waitTime = now - (req.timestamp || 0)
          return waitTime > 180000
        })
        
        if (hangingRequests.length > 0) {
          console.warn(`⚠️ Found ${hangingRequests.length} requests waiting over 3 minutes - potential hanging requests`)
        }
      }
      
    }).catch(error => {
      console.error('Health check error:', error)
    })
  } catch (syncError) {
    console.error('Synchronous error in health check:', syncError)
  }
}, 10000)

server.listen(PORT, () => {
  console.log(`Elevator Simulation Server running on port ${PORT}`)
  console.log(`Dashboard available at http://localhost:${PORT}`)
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`)
  if (DEBUG) {
    console.log('Debug mode enabled - enhanced logging and deadlock detection active')
    console.log('Pause/restart functionality: State preservation enabled')
    console.log(`Error recovery: Max consecutive errors = ${MAX_CONSECUTIVE_ERRORS}, Timeout = ${UPDATE_TIMEOUT}ms`)
  }
})

function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`)
  
  clearInterval(realTimeUpdateInterval)
  clearInterval(performanceMonitoringInterval)
  clearInterval(healthCheckInterval)
  
  simulationEngine.stop()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
