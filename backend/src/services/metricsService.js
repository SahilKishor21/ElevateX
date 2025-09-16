class MetricsService {
  constructor() {
    this.reset()
  }

  reset() {
    this.historicalData = []
    this.requestHistory = []
    this.performanceHistory = []
    this.startTime = Date.now()
  }

  update(elevators, activeRequests) {
    const now = Date.now()
    
    const servedRequests = this.requestHistory.filter(r => r.isServed)
    const waitTimes = servedRequests.map(r => r.waitTime).filter(t => t > 0)
    
    const metrics = {
      timestamp: now,
      averageWaitTime: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
      maxWaitTime: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      elevatorUtilization: elevators.map(e => e.getUtilization()),
      activeRequests: activeRequests.length,
      starvationCount: activeRequests.filter(r => typeof r.isStarving === 'function' && r.isStarving()).length,
      throughput: this.calculateThroughput(),
      systemLoad: this.calculateSystemLoad(elevators, activeRequests)
    }

    this.performanceHistory.push(metrics)
    
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift()
    }

    // Add to historical data
    const historicalEntry = {
      timestamp: now,
      metrics: this.getPerformanceMetrics(),
      requests: activeRequests.length
    }
    
    this.historicalData.push(historicalEntry)
    if (this.historicalData.length > 50) {
      this.historicalData.shift()
    }
  }

  calculateThroughput() {
    const oneHourAgo = Date.now() - 3600000
    const recentRequests = this.requestHistory.filter(r => r.servedAt && r.servedAt > oneHourAgo)
    return recentRequests.length
  }

  calculateSystemLoad(elevators, activeRequests) {
    const activeElevators = elevators.filter(e => e.state !== 'idle').length
    const utilizationRate = elevators.length > 0 ? activeElevators / elevators.length : 0
    const requestLoad = Math.min(activeRequests.length / 50, 1)
    
    return Math.min((utilizationRate + requestLoad) / 2, 1)
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
        systemReliability: 100
      }
    }

    const latest = recent[recent.length - 1]
    const avgUtilization = latest.elevatorUtilization.length > 0 ? 
      latest.elevatorUtilization.reduce((a, b) => a + b, 0) / latest.elevatorUtilization.length : 0
    
    return {
      averageWaitTime: latest.averageWaitTime / 1000,
      maxWaitTime: latest.maxWaitTime / 1000,
      averageTravelTime: this.calculateAverageTravelTime(),
      elevatorUtilization: latest.elevatorUtilization,
      throughput: latest.throughput,
      starvationCount: latest.starvationCount,
      userSatisfactionScore: this.calculateSatisfactionScore(latest),
      energyEfficiency: Math.max(50, 100 - (avgUtilization * 30)),
      responseTime: latest.averageWaitTime / 1000,
      systemReliability: latest.starvationCount === 0 ? 100 : Math.max(70, 100 - latest.starvationCount * 5)
    }
  }

  getRealTimeMetrics(elevators, activeRequests) {
    const elevatorsInMotion = elevators.filter(e => e.state === 'moving_up' || e.state === 'moving_down').length
    const averageLoadFactor = elevators.length > 0 ? elevators.reduce((sum, e) => sum + e.getLoad(), 0) / elevators.length : 0
    
    return {
      currentTime: Date.now(),
      activeRequests: activeRequests.length,
      elevatorsInMotion,
      averageLoadFactor,
      systemLoad: this.calculateSystemLoad(elevators, activeRequests),
      alertsCount: activeRequests.filter(r => typeof r.isStarving === 'function' && r.isStarving()).length
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
    
    if (this.requestHistory.length > 1000) {
      this.requestHistory.shift()
    }
  }
}

module.exports = MetricsService