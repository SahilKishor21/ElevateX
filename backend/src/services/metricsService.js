class MetricsService {
  constructor() {
    this.reset()
    this.debug = process.env.NODE_ENV === 'development'
  }

  reset() {
    this.historicalData = []
    this.requestHistory = []
    this.performanceHistory = []
    this.startTime = Date.now()
    this.assignmentMetrics = {
      lobbyToUpperRequests: 0,
      upperToLobbyRequests: 0,
      peakHourRequests: 0,
      starvationEvents: 0,
      thirtySecondEscalations: 0
    }
    
    if (this.debug) {
      console.log('MetricsService: Reset complete')
    }
  }

  update(elevators, activeRequests) {
    const now = Date.now()
 
    const validActiveRequests = Array.isArray(activeRequests) ? activeRequests : []
    const validElevators = Array.isArray(elevators) ? elevators : []
    
    const servedRequests = this.requestHistory.filter(r => r && r.isServed)
    const waitTimes = servedRequests
      .map(r => this.getActualWaitTime(r))
      .filter(t => typeof t === 'number' && t > 0)
    
    const currentStarvationCount = validActiveRequests.filter(r => {
      if (!r || typeof r.waitTime !== 'number') return false
      return r.waitTime > 60000 && r.isActive && !r.isServed
    }).length

    if (this.debug) {
      console.log(`MetricsService Update:`, {
        servedRequestsTotal: servedRequests.length,
        validWaitTimes: waitTimes.length,
        waitTimesArray: waitTimes.slice(-5), 
        averageWaitTime: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
        currentStarvationCount,
        activeRequestsCount: validActiveRequests.length
      })
    }
    
    const metrics = {
      timestamp: now,
      averageWaitTime: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
      maxWaitTime: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      elevatorUtilization: validElevators.map(e => this.getElevatorUtilization(e)),
      activeRequests: validActiveRequests.length,
      starvationCount: currentStarvationCount,
      throughput: this.calculateThroughput(),
      systemLoad: this.calculateSystemLoad(validElevators, validActiveRequests)
    }

    this.performanceHistory.push(metrics)
    
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift()
    }

    const historicalEntry = {
      timestamp: now,
      metrics: this.getPerformanceMetrics(),
      requests: validActiveRequests.length
    }
    
    this.historicalData.push(historicalEntry)
    if (this.historicalData.length > 50) {
      this.historicalData.shift()
    }

    if (this.debug && (currentStarvationCount > 0 || waitTimes.length > 0)) {
      console.log(`MetricsService: Updated - Avg wait: ${Math.round(metrics.averageWaitTime/1000)}s, Starvation: ${currentStarvationCount}`)
    }
  }

  getElevatorUtilization(elevator) {
    if (!elevator) return 0
    
    if (typeof elevator.getUtilization === 'function') {
      return elevator.getUtilization()
    }
    
    if (elevator.state === 'idle') return 0
    if (elevator.state === 'maintenance') return 0

    if (elevator.state === 'moving_up' || elevator.state === 'moving_down' || elevator.state === 'loading') {
      return 0.8
    }
    
    return 0.5 
  }

  getActualWaitTime(request) {
    if (!request) return 0
    if (typeof request.finalWaitTime === 'number' && request.finalWaitTime >= 0) {
      return request.finalWaitTime
    }
    
    if (typeof request.waitTime === 'number' && request.waitTime >= 0) {
      return request.waitTime
    }
    
    if (request.servedAt && request.timestamp) {
      return request.servedAt - request.timestamp
    }
    
    return 0
  }

  calculateThroughput() {
    const oneHourAgo = Date.now() - 3600000
    const recentRequests = this.requestHistory.filter(r => 
      r && r.servedAt && r.servedAt > oneHourAgo
    )
    return recentRequests.length
  }

  calculateSystemLoad(elevators, activeRequests) {
    if (!Array.isArray(elevators) || elevators.length === 0) return 0
    
    const activeElevators = elevators.filter(e => 
      e && e.state !== 'idle' && e.state !== 'maintenance'
    ).length
    const utilizationRate = activeElevators / elevators.length
    
    const requestLoad = Math.min(activeRequests.length / (elevators.length * 10), 1)
  
    const totalCapacity = elevators.reduce((sum, e) => {
      if (!e) return sum
      return sum + (e.capacity || 8)
    }, 0)
    
    const currentLoad = elevators.reduce((sum, e) => {
      if (!e || !e.passengers) return sum
      return sum + (Array.isArray(e.passengers) ? e.passengers.length : 0)
    }, 0)
    
    const capacityUtilization = totalCapacity > 0 ? currentLoad / totalCapacity : 0
 
    const systemLoad = (utilizationRate * 0.4) + (requestLoad * 0.3) + (capacityUtilization * 0.3)
    
    if (this.debug && systemLoad > 0.5) {
      console.log(`MetricsService: High system load - Active: ${activeElevators}/${elevators.length}, Load: ${(systemLoad*100).toFixed(1)}%`)
    }
    
    return Math.min(systemLoad, 1)
  }

  getPerformanceMetrics() {
    const recent = this.performanceHistory.slice(-10)
 
    if (recent.length === 0) {
      const defaultMetrics = {
        averageWaitTime: 0,
        maxWaitTime: 0,
        averageTravelTime: 0,
        elevatorUtilization: [],
        throughput: 0,
        starvationCount: 0,
        userSatisfactionScore: 100,
        energyEfficiency: 85,
        responseTime: 0,
        systemReliability: 100,
        assignmentCompliance: this.calculateAssignmentCompliance(),
        peakHourEfficiency: this.calculatePeakHourEfficiency(),
        requestDistribution: this.getRequestDistribution()
      }
      
      if (this.debug) {
        console.log('MetricsService: Returning default metrics (no history)')
      }
      
      return defaultMetrics
    }

    const latest = recent[recent.length - 1]
    const avgUtilization = latest.elevatorUtilization.length > 0 ? 
      latest.elevatorUtilization.reduce((a, b) => a + b, 0) / latest.elevatorUtilization.length : 0
    
    const performanceMetrics = {
      averageWaitTime: latest.averageWaitTime / 1000, // Convert to seconds
      maxWaitTime: latest.maxWaitTime / 1000, // Convert to seconds
      averageTravelTime: this.calculateAverageTravelTime(),
      elevatorUtilization: latest.elevatorUtilization,
      throughput: latest.throughput,
      starvationCount: latest.starvationCount,
      userSatisfactionScore: this.calculateSatisfactionScore(latest),
      energyEfficiency: Math.max(50, 100 - (avgUtilization * 30)),
      responseTime: latest.averageWaitTime / 1000, // Convert to seconds
      systemReliability: latest.starvationCount === 0 ? 100 : Math.max(70, 100 - latest.starvationCount * 5),
      assignmentCompliance: this.calculateAssignmentCompliance(),
      peakHourEfficiency: this.calculatePeakHourEfficiency(),
      requestDistribution: this.getRequestDistribution()
    }
    
    if (this.debug) {
      console.log(`MetricsService: Performance metrics - Avg wait: ${performanceMetrics.averageWaitTime.toFixed(1)}s, Starvation: ${performanceMetrics.starvationCount}`)
    }
    
    return performanceMetrics
  }

  calculateAssignmentCompliance() {
    let score = 100
   
    if (this.assignmentMetrics.starvationEvents > 0) {
      score -= this.assignmentMetrics.starvationEvents * 10
    }
    
    if (this.assignmentMetrics.thirtySecondEscalations > 0) {
      score += Math.min(10, this.assignmentMetrics.thirtySecondEscalations * 2)
    }
  
    const totalDirectionalRequests = this.assignmentMetrics.lobbyToUpperRequests + this.assignmentMetrics.upperToLobbyRequests
    if (totalDirectionalRequests > 10) {
      const lobbyPercentage = (this.assignmentMetrics.lobbyToUpperRequests / totalDirectionalRequests) * 100
      const hour = new Date().getHours()
      
      if (hour === 9 && lobbyPercentage > 50) {
        score += 15 
      }
    }
    
    return Math.max(0, Math.min(100, score))
  }

  calculatePeakHourEfficiency() {
    const hour = new Date().getHours()
    const isPeakHour = [8, 9, 12, 13, 17, 18].includes(hour)
    
    if (!isPeakHour) return 100
    
    const recent = this.performanceHistory.slice(-5)
    if (recent.length === 0) return 100
    
    const latest = recent[recent.length - 1]
    const avgWaitTime = latest.averageWaitTime / 1000
    const starvationCount = latest.starvationCount || 0
    
    let efficiency = 100
    
    // Peak hour standards
    if (avgWaitTime > 45) efficiency -= 30
    else if (avgWaitTime > 30) efficiency -= 15
    else if (avgWaitTime > 15) efficiency -= 5
    
    efficiency -= starvationCount * 20 
    
    return Math.max(0, efficiency)
  }

  getRequestDistribution() {
    const interFloorRequests = Math.max(0, 
      this.requestHistory.length - 
      this.assignmentMetrics.lobbyToUpperRequests - 
      this.assignmentMetrics.upperToLobbyRequests
    )
    
    return {
      lobbyToUpper: this.assignmentMetrics.lobbyToUpperRequests,
      upperToLobby: this.assignmentMetrics.upperToLobbyRequests,
      interFloor: interFloorRequests,
      total: this.requestHistory.length
    }
  }

  updateAssignmentMetrics(metrics) {
    if (metrics && typeof metrics === 'object') {
      this.assignmentMetrics = { ...this.assignmentMetrics, ...metrics }
      if (this.debug) {
        console.log(`MetricsService: Assignment metrics updated:`, this.assignmentMetrics)
      }
    }
  }

  getRealTimeMetrics(elevators, activeRequests) {
    const validElevators = Array.isArray(elevators) ? elevators : []
    const validActiveRequests = Array.isArray(activeRequests) ? activeRequests : []
    
    const elevatorsInMotion = validElevators.filter(e => 
      e && (e.state === 'moving_up' || e.state === 'moving_down')
    ).length
    
    const averageLoadFactor = validElevators.length > 0 ? 
      validElevators.reduce((sum, e) => sum + this.getElevatorLoad(e), 0) / validElevators.length : 0
    
    // Calculate current starvation alerts
    const starvationAlerts = validActiveRequests.filter(r => {
      if (!r || typeof r.waitTime !== 'number') return false
      return r.waitTime > 60000 && r.isActive && !r.isServed
    }).length
    
    const hour = new Date().getHours()
    const isPeakHour = [8, 9, 12, 13, 17, 18].includes(hour)
    
    const realTimeMetrics = {
      currentTime: Date.now(),
      activeRequests: validActiveRequests.length,
      elevatorsInMotion,
      averageLoadFactor,
      systemLoad: this.calculateSystemLoad(validElevators, validActiveRequests),
      alertsCount: starvationAlerts,
      starvationAlerts: starvationAlerts,
      peakHourStatus: isPeakHour ? 'ACTIVE' : 'NORMAL',
      complianceScore: this.calculateAssignmentCompliance()
    }
    
    if (this.debug && starvationAlerts > 0) {
      console.log(`MetricsService: Real-time alerts - Starvation: ${starvationAlerts}`)
    }
    
    return realTimeMetrics
  }

  // Helper method to get elevator load safely
  getElevatorLoad(elevator) {
    if (!elevator) return 0
    
    if (typeof elevator.getLoad === 'function') {
      return elevator.getLoad()
    }
    
    // Fallback calculation
    if (!elevator.passengers) return 0
    
    const passengerCount = Array.isArray(elevator.passengers) ? elevator.passengers.length : 0
    const capacity = elevator.capacity || 8
    
    return capacity > 0 ? passengerCount / capacity : 0
  }

  calculateAverageTravelTime() {
    const servedRequests = this.requestHistory.filter(r => 
      r && r.isServed && typeof r.getTravelTime === 'function' && r.getTravelTime() > 0
    )
    
    if (servedRequests.length === 0) return 0
    
    const totalTravelTime = servedRequests.reduce((sum, r) => sum + r.getTravelTime(), 0)
    return (totalTravelTime / servedRequests.length) / 1000
  }

  calculateSatisfactionScore(metrics) {
    let score = 100
    
    if (metrics.averageWaitTime > 30000) score -= 20
    else if (metrics.averageWaitTime > 15000) score -= 10
    
    score -= metrics.starvationCount * 15
    
    if (metrics.systemLoad > 0.8) score -= 15
    else if (metrics.systemLoad > 0.6) score -= 5
    
    return Math.max(0, score)
  }

  addRequestToHistory(request) {
    if (!request) return
    
    // Ensure request has proper wait time calculated
    if (typeof request.updateWaitTime === 'function') {
      request.updateWaitTime()
    }
    
    this.requestHistory.push(request)
    
    // ASSIGNMENT: Track request patterns
    if (request.originFloor === 1 && request.destinationFloor > 5) {
      this.assignmentMetrics.lobbyToUpperRequests++
    } else if (request.originFloor > 5 && request.destinationFloor === 1) {
      this.assignmentMetrics.upperToLobbyRequests++
    }
    
    // Track starvation events
    const finalWaitTime = this.getActualWaitTime(request)
    if (finalWaitTime > 60000) {
      this.assignmentMetrics.starvationEvents++
      if (this.debug) {
        console.log(`MetricsService: Starvation event recorded - wait time: ${Math.round(finalWaitTime/1000)}s`)
      }
    }
    
    // Track 30-second escalations
    if (finalWaitTime > 30000) {
      this.assignmentMetrics.thirtySecondEscalations++
    }
    
    const hour = new Date().getHours()
    if ([8, 9, 12, 13, 17, 18].includes(hour)) {
      this.assignmentMetrics.peakHourRequests++
    }
    
    if (this.requestHistory.length > 1000) {
      this.requestHistory.shift()
    }
    
    if (this.debug) {
      console.log(`MetricsService: Added request to history - wait time: ${Math.round(finalWaitTime/1000)}s`)
    }
  }

  // ASSIGNMENT: Get assignment metrics for frontend
  getAssignmentMetrics() {
    return { ...this.assignmentMetrics }
  }

  // ASSIGNMENT: Get assignment compliance details
  getAssignmentCompliance() {
    const totalDirectional = this.assignmentMetrics.lobbyToUpperRequests + this.assignmentMetrics.upperToLobbyRequests
    const lobbyTrafficPercentage = totalDirectional > 0 ? 
      (this.assignmentMetrics.lobbyToUpperRequests / totalDirectional) * 100 : 0

    return {
      lobbyTrafficPercentage,
      peakHourRequests: this.assignmentMetrics.peakHourRequests,
      starvationEvents: this.assignmentMetrics.starvationEvents,
      thirtySecondEscalations: this.assignmentMetrics.thirtySecondEscalations,
      complianceScore: this.calculateAssignmentCompliance()
    }
  }
}

module.exports = MetricsService