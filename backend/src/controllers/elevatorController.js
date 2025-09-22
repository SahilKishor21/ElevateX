const { WEBSOCKET_EVENTS } = require('../utils/constants')

class ElevatorController {
  constructor(simulationEngine) {
    this.simulationEngine = simulationEngine
  }

  startSimulation(config = {}) {
    try {
      this.simulationEngine.initialize(config)
      const success = this.simulationEngine.start()
      
      if (!success) {
        throw new Error('Failed to start simulation - already running')
      }

      return {
        success: true,
        message: 'Simulation started successfully',
        state: this.simulationEngine.getState()
      }
    } catch (error) {
      throw new Error(`Failed to start simulation: ${error.message}`)
    }
  }

  stopSimulation() {
    const success = this.simulationEngine.stop()
    
    return {
      success,
      message: success ? 'Simulation stopped' : 'Simulation was not running',
      state: this.simulationEngine.getState()
    }
  }

  resetSimulation() {
    this.simulationEngine.reset()
    
    return {
      success: true,
      message: 'Simulation reset successfully',
      state: this.simulationEngine.getState()
    }
  }

  addRequest(requestData) {
    if (!this.simulationEngine.isRunning) {
      throw new Error('Cannot add request - simulation not running')
    }

    const requestId = this.simulationEngine.addRequest(requestData)
    
    return {
      success: true,
      requestId,
      message: 'Request added successfully'
    }
  }

  updateConfig(config) {
    this.simulationEngine.updateConfig(config)
    
    return {
      success: true,
      message: 'Configuration updated',
      config: this.simulationEngine.config
    }
  }

  emergencyStop() {
    this.simulationEngine.stop()
    this.simulationEngine.elevators.forEach(elevator => {
      elevator.state = 'maintenance'
      elevator.requestQueue = []
    })

    return {
      success: true,
      message: 'Emergency stop activated',
      state: this.simulationEngine.getState()
    }
  }

  getSystemStatus() {
    const state = this.simulationEngine.getState()
    const metrics = this.simulationEngine.getPerformanceMetrics()
    const realTimeMetrics = this.simulationEngine.getRealTimeMetrics()

    return {
      ...state,
      performance: metrics,
      realTime: realTimeMetrics,
      health: this.calculateSystemHealth(state, metrics)
    }
  }

  calculateSystemHealth(state, metrics) {
    let healthScore = 100
    const issues = []

    if (metrics.starvationCount > 0) {
      healthScore -= metrics.starvationCount * 10
      issues.push(`${metrics.starvationCount} requests waiting too long`)
    }

    const activeElevators = state.elevators.filter(e => e.state !== 'idle').length
    const utilizationRate = state.elevators.length > 0 ? activeElevators / state.elevators.length : 0
    
    if (utilizationRate > 0.9) {
      healthScore -= 20
      issues.push('System under heavy load')
    }

    // Check for maintenance mode elevators
    const maintenanceElevators = state.elevators.filter(e => e.maintenanceMode).length
    if (maintenanceElevators > 0) {
      healthScore -= maintenanceElevators * 15
      issues.push(`${maintenanceElevators} elevators in maintenance`)
    }

    return {
      score: Math.max(0, Math.round(healthScore)),
      status: healthScore > 80 ? 'healthy' : healthScore > 50 ? 'warning' : 'critical',
      issues
    }
  }
}

module.exports = ElevatorController