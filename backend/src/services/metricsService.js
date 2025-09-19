class MetricsService {
  constructor() {
    this.reset()
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
  }

  update(elevators, activeRequests) {
    const now = Date.now()
    
    const servedRequests = this.requestHistory.filter(r => r.isServed)
    // FIXED: Use finalWaitTime if available, otherwise use waitTime
    const waitTimes = servedRequests.map(r => this.getActualWaitTime(r)).filter(t => t > 0)
    
    // FIXED: Calculate starvation count correctly - include ALL requests with >60s wait
    const allActiveRequests = Array.isArray(activeRequests) ? activeRequests : []
    const currentStarvationCount = allActiveRequests.filter(r => {
      if (r && typeof r.waitTime === 'number') {
        return r.waitTime > 60000 && r.isActive && !r.isServed
      }
      return false
    }).length

    console.log(`MetricsService: Starvation count calculation - Active: ${allActiveRequests.length}, Starving: ${currentStarvationCount}`)
    
    const metrics = {
      timestamp: now,
      averageWaitTime: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
      maxWaitTime: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      elevatorUtilization: elevators.map(e => e.getUtilization()),
      activeRequests: allActiveRequests.length,
      starvationCount: currentStarvationCount, // FIXED: Use calculated count
      throughput: this.calculateThroughput(),
      systemLoad: this.calculateSystemLoad(elevators, allActiveRequests)
    }

    this.performanceHistory.push(metrics)
    
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift()
    }

    // Add to historical data
    const historicalEntry = {
      timestamp: now,
      metrics: this.getPerformanceMetrics(),
      requests: allActiveRequests.length
    }
    
    this.historicalData.push(historicalEntry)
    if (this.historicalData.length > 50) {
      this.historicalData.shift()
    }
  }

  // FIXED: Helper method to get the correct wait time
  getActualWaitTime(request) {
    if (request.finalWaitTime !== null && request.finalWaitTime !== undefined) {
      return request.finalWaitTime
    }
    return request.waitTime || 0
  }

  calculateThroughput() {
    const oneHourAgo = Date.now() - 3600000
    const recentRequests = this.requestHistory.filter(r => r.servedAt && r.servedAt > oneHourAgo)
    return recentRequests.length
  }

  // FIXED: System load calculation - properly weight utilization
  calculateSystemLoad(elevators, activeRequests) {
    if (!elevators || elevators.length === 0) return 0
    
    // FIXED: Calculate actual elevator utilization correctly
    const activeElevators = elevators.filter(e => e.state !== 'idle' && e.state !== 'maintenance').length
    const utilizationRate = activeElevators / elevators.length
    
    // Request load factor
    const requestLoad = Math.min(activeRequests.length / (elevators.length * 10), 1)
    
    // Capacity utilization
    const totalCapacity = elevators.reduce((sum, e) => sum + (e.capacity || 8), 0)
    const currentLoad = elevators.reduce((sum, e) => sum + (e.passengers?.length || 0), 0)
    const capacityUtilization = totalCapacity > 0 ? currentLoad / totalCapacity : 0
    
    // Weighted average: 40% elevator state, 30% requests, 30% capacity
    const systemLoad = (utilizationRate * 0.4) + (requestLoad * 0.3) + (capacityUtilization * 0.3)
    
    console.log(`MetricsService: System load - Active elevators: ${activeElevators}/${elevators.length} (${(utilizationRate*100).toFixed(1)}%), Load: ${(systemLoad*100).toFixed(1)}%`)
    
    return Math.min(systemLoad, 1)
  }

  getPerformanceMetrics() {
    const recent = this.performanceHistory.slice(-10)
    if (recent.length === 0) {
      return {
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
        // ASSIGNMENT: Include assignment metrics
        assignmentCompliance: this.calculateAssignmentCompliance(),
        peakHourEfficiency: this.calculatePeakHourEfficiency(),
        requestDistribution: this.getRequestDistribution()
      }
    }

    const latest = recent[recent.length - 1]
    const avgUtilization = latest.elevatorUtilization.length > 0 ? 
      latest.elevatorUtilization.reduce((a, b) => a + b, 0) / latest.elevatorUtilization.length : 0
    
    console.log(`MetricsService: Performance metrics - Starvation: ${latest.starvationCount}, Avg utilization: ${(avgUtilization*100).toFixed(1)}%`)
    
    return {
      averageWaitTime: latest.averageWaitTime / 1000,
      maxWaitTime: latest.maxWaitTime / 1000,
      averageTravelTime: this.calculateAverageTravelTime(),
      elevatorUtilization: latest.elevatorUtilization,
      throughput: latest.throughput,
      starvationCount: latest.starvationCount, // FIXED: Pass through the calculated count
      userSatisfactionScore: this.calculateSatisfactionScore(latest),
      energyEfficiency: Math.max(50, 100 - (avgUtilization * 30)),
      responseTime: latest.averageWaitTime / 1000,
      systemReliability: latest.starvationCount === 0 ? 100 : Math.max(70, 100 - latest.starvationCount * 5),
      // ASSIGNMENT: Include assignment metrics
      assignmentCompliance: this.calculateAssignmentCompliance(),
      peakHourEfficiency: this.calculatePeakHourEfficiency(),
      requestDistribution: this.getRequestDistribution()
    }
  }

  // ASSIGNMENT: Calculate assignment compliance score
  calculateAssignmentCompliance() {
    let score = 100
    
    // Penalty for starvation events
    if (this.assignmentMetrics.starvationEvents > 0) {
      score -= this.assignmentMetrics.starvationEvents * 10
    }
    
    // Bonus for handling 30-second escalations properly
    if (this.assignmentMetrics.thirtySecondEscalations > 0) {
      score += Math.min(10, this.assignmentMetrics.thirtySecondEscalations * 2)
    }
    
    // Check for realistic traffic patterns
    const totalDirectionalRequests = this.assignmentMetrics.lobbyToUpperRequests + this.assignmentMetrics.upperToLobbyRequests
    if (totalDirectionalRequests > 10) {
      const lobbyPercentage = (this.assignmentMetrics.lobbyToUpperRequests / totalDirectionalRequests) * 100
      const hour = new Date().getHours()
      
      if (hour === 9 && lobbyPercentage > 50) {
        score += 15 // Bonus for achieving morning rush pattern
      }
    }
    
    return Math.max(0, Math.min(100, score))
  }

  // ASSIGNMENT: Calculate peak hour efficiency
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
    
    efficiency -= starvationCount * 20 // Heavy penalty during peaks
    
    return Math.max(0, efficiency)
  }

  // ASSIGNMENT: Get request distribution
  getRequestDistribution() {
    return {
      lobbyToUpper: this.assignmentMetrics.lobbyToUpperRequests,
      upperToLobby: this.assignmentMetrics.upperToLobbyRequests,
      interFloor: Math.max(0, this.requestHistory.length - this.assignmentMetrics.lobbyToUpperRequests - this.assignmentMetrics.upperToLobbyRequests),
      total: this.requestHistory.length
    }
  }

  // ASSIGNMENT: Update assignment metrics from simulation engine
  updateAssignmentMetrics(metrics) {
    if (metrics) {
      this.assignmentMetrics = { ...this.assignmentMetrics, ...metrics }
      console.log(`MetricsService: Assignment metrics updated:`, this.assignmentMetrics)
    }
  }

  getRealTimeMetrics(elevators, activeRequests) {
    const elevatorsInMotion = elevators.filter(e => e.state === 'moving_up' || e.state === 'moving_down').length
    const averageLoadFactor = elevators.length > 0 ? elevators.reduce((sum, e) => sum + e.getLoad(), 0) / elevators.length : 0
    
    // FIXED: Calculate current starvation alerts
    const starvationAlerts = activeRequests.filter(r => {
      if (r && typeof r.waitTime === 'number') {
        return r.waitTime > 60000 && r.isActive && !r.isServed
      }
      return false
    }).length
    
    const hour = new Date().getHours()
    const isPeakHour = [8, 9, 12, 13, 17, 18].includes(hour)
    
    return {
      currentTime: Date.now(),
      activeRequests: activeRequests.length,
      elevatorsInMotion,
      averageLoadFactor,
      systemLoad: this.calculateSystemLoad(elevators, activeRequests),
      alertsCount: starvationAlerts,
      // ASSIGNMENT: Real-time assignment metrics
      starvationAlerts: starvationAlerts,
      peakHourStatus: isPeakHour ? 'ACTIVE' : 'NORMAL',
      complianceScore: this.calculateAssignmentCompliance()
    }
  }

  calculateAverageTravelTime() {
    const servedRequests = this.requestHistory.filter(r => r.isServed && r.getTravelTime && r.getTravelTime() > 0)
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
  }

  // ASSIGNMENT: Get assignment metrics for frontend
  getAssignmentMetrics() {
    return this.assignmentMetrics
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