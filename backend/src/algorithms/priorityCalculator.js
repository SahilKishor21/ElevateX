const { PRIORITY_WEIGHTS } = require('../utils/constants') || {
  PRIORITY_WEIGHTS: { STARVATION_THRESHOLD: 30000, EXPONENTIAL_BASE: 1.2 }
}

class PriorityCalculator {
  constructor() {
    this.trafficPatternCache = new Map()
    this.elevatorPerformanceHistory = new Map()
    this.systemLoadHistory = []
  }

  calculateRequestPriority(request) {
    const priority = typeof request.priority === 'number' ? request.priority : 0
    const waitTimeMultiplier = this.getWaitTimePriority(request)
    const trafficBonus = this.getTrafficBonus(request)
    const starvationBonus = this.getStarvationBonus(request)
    const timeOfDayBonus = this.getTimeOfDayBonus(request)
    const urgencyMultiplier = this.getUrgencyMultiplier(request)

    const finalPriority = (priority * waitTimeMultiplier * urgencyMultiplier) + trafficBonus + starvationBonus + timeOfDayBonus
    
    return Math.max(0.1, finalPriority)
  }

  // ENHANCED: More aggressive wait time escalation
  getWaitTimePriority(request) {
    if (!request || typeof request.waitTime !== 'number') return 1
    
    const waitSeconds = request.waitTime / 1000
    
    // Exponential escalation starts earlier and grows faster
    if (waitSeconds > 20) {
      const exponent = (waitSeconds - 20) / 15 // Faster escalation
      return Math.pow(1.5, exponent) // More aggressive than before
    }
    
    return 1
  }

  // NEW: Urgency multiplier for high-volume scenarios
  getUrgencyMultiplier(request) {
    if (!request) return 1
    
    const waitSeconds = request.waitTime / 1000
    
    // Critical urgency for very long waits
    if (waitSeconds > 90) return 3.0  // Critical
    if (waitSeconds > 60) return 2.5  // Very urgent
    if (waitSeconds > 45) return 2.0  // Urgent
    if (waitSeconds > 30) return 1.5  // Elevated
    
    return 1
  }

  // ENHANCED: More aggressive starvation detection
  getStarvationBonus(request) {
    if (!request || typeof request.waitTime !== 'number') return 0
    
    const waitSeconds = request.waitTime / 1000
    
    // Multiple tiers of starvation prevention
    if (waitSeconds > 120) return 25  // Critical starvation
    if (waitSeconds > 90) return 20   // Severe starvation  
    if (waitSeconds > 60) return 15   // Standard starvation
    if (waitSeconds > 45) return 10   // Pre-starvation warning
    
    return 0
  }

  getTrafficBonus(request) {
    if (!request) return 0
    
    const hour = new Date().getHours()
    const cacheKey = `${hour}-${request.originFloor}-${request.destinationFloor}`
    
    // Check cache first for performance
    if (this.trafficPatternCache.has(cacheKey)) {
      return this.trafficPatternCache.get(cacheKey)
    }
    
    let bonus = 0
    
    // Morning rush (8-10 AM): Heavy lobby to upper floor traffic
    if (hour >= 8 && hour <= 10) {
      if (request.originFloor === 1 && request.destinationFloor > 5) {
        bonus = 20 // Increased from 15
      }
      // Bonus for any upward movement during morning rush
      else if (request.destinationFloor > request.originFloor) {
        bonus = 8
      }
    }
    
    // Evening rush (5-7 PM): Heavy upper to lobby traffic
    if (hour >= 17 && hour <= 19) {
      if (request.originFloor > 5 && request.destinationFloor === 1) {
        bonus = 15 // Increased from 10
      }
      // Bonus for any downward movement during evening rush
      else if (request.destinationFloor < request.originFloor) {
        bonus = 6
      }
    }
    
    // Lunch time (12-2 PM): Mid-floor traffic
    if (hour >= 12 && hour <= 14) {
      const midFloor = Math.floor(15 / 2) // Assuming 15 floors, make dynamic if needed
      if (Math.abs(request.originFloor - midFloor) <= 3 || Math.abs(request.destinationFloor - midFloor) <= 3) {
        bonus = 8 // Increased from 5
      }
    }
    
    // Cache the result
    this.trafficPatternCache.set(cacheKey, bonus)
    
    // Clear cache periodically to prevent memory bloat
    if (this.trafficPatternCache.size > 100) {
      const firstKey = this.trafficPatternCache.keys().next().value
      this.trafficPatternCache.delete(firstKey)
    }
    
    return bonus
  }

  // ENHANCED: More sophisticated time-of-day bonuses
  getTimeOfDayBonus(request) {
    const hour = new Date().getHours()
    const minute = new Date().getMinutes()
    
    // Peak hours get higher priority
    const peakHours = [8, 9, 12, 13, 17, 18]
    if (peakHours.includes(hour)) {
      // Even higher priority during peak minutes
      if ((hour === 8 || hour === 17) && minute >= 30) return 8 // Rush hour peak
      if ((hour === 9 || hour === 18) && minute <= 30) return 8 // Rush hour peak
      return 5 // Regular peak hour
    }
    
    // Shoulder hours get moderate priority
    if ([7, 10, 11, 14, 15, 16, 19].includes(hour)) return 3
    
    // Off-peak hours
    if (hour < 6 || hour > 22) return -1 // Slightly lower priority
    
    return 0
  }

  // ENHANCED: Better elevator scoring with performance history
  calculateElevatorScore(elevator, request) {
    const basePenalty = this.getDistancePenalty(elevator, request)
    const capacityPenalty = this.getCapacityPenalty(elevator)
    const directionPenalty = this.getDirectionPenalty(elevator, request)
    const performancePenalty = this.getPerformancePenalty(elevator)
    const loadBalancePenalty = this.getLoadBalancePenalty(elevator)
    
    return basePenalty + capacityPenalty + directionPenalty + performancePenalty + loadBalancePenalty
  }

  getCapacityPenalty(elevator) {
    if (!elevator || typeof elevator.getLoad !== 'function') return 0
    
    const loadFactor = elevator.getLoad()
    
    // More aggressive penalty for high capacity usage
    if (loadFactor > 0.9) return 30 * loadFactor  // Very high penalty
    if (loadFactor > 0.8) return 25 * loadFactor  // High penalty
    if (loadFactor > 0.6) return 15 * loadFactor  // Medium penalty
    
    return 10 * loadFactor // Base penalty
  }

  // ENHANCED: Better direction penalty calculation
  getDirectionPenalty(elevator, request) {
    if (!elevator || elevator.state === 'idle') return 0
    
    const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down'
    const elevatorDirection = elevator.direction
    
    // Same direction bonuses
    if (elevatorDirection === requestDirection) {
      if (requestDirection === 'up' && elevator.currentFloor <= request.originFloor) {
        return -10 // Bonus for good alignment
      }
      if (requestDirection === 'down' && elevator.currentFloor >= request.originFloor) {
        return -10 // Bonus for good alignment
      }
      return 5 // Same direction but not optimal pickup
    }
    
    // Opposite direction penalties
    return 20 // Significant penalty for opposite direction
  }

  getDistancePenalty(elevator, request) {
    if (!elevator) return 0
    const distance = Math.abs(elevator.currentFloor - request.originFloor)
    
    // Non-linear distance penalty - closer elevators much preferred
    if (distance === 0) return 0
    if (distance <= 2) return distance * 2
    if (distance <= 5) return distance * 3
    return distance * 4 // Higher penalty for distant elevators
  }

  // NEW: Performance-based penalty using historical data
  getPerformancePenalty(elevator) {
    if (!elevator) return 0
    
    const elevatorId = elevator.id
    const history = this.elevatorPerformanceHistory.get(elevatorId)
    
    if (!history) return 0
    
    // Penalize elevators with poor recent performance
    const avgCompletionTime = history.avgCompletionTime || 0
    const failureRate = history.failureRate || 0
    
    let penalty = 0
    if (avgCompletionTime > 60) penalty += 10 // Slow elevator
    if (failureRate > 0.1) penalty += 15 // High failure rate
    
    return penalty
  }

  // NEW: Advanced load balancing penalty
  getLoadBalancePenalty(elevator) {
    if (!elevator) return 0
    
    const queueLength = elevator.requestQueue?.length || 0
    const passengerCount = elevator.passengers?.length || 0
    
    // Exponential penalty for queue length
    let penalty = Math.pow(queueLength, 1.5) * 5
    
    // Additional penalty for passenger count
    penalty += passengerCount * 3
    
    // Penalty for elevators in motion (prefer idle elevators when possible)
    if (elevator.state !== 'idle') {
      penalty += 8
    }
    
    return penalty
  }

  // NEW: Update elevator performance history
  updateElevatorPerformance(elevatorId, completionTime, success = true) {
    let history = this.elevatorPerformanceHistory.get(elevatorId) || {
      completions: [],
      failures: 0,
      totalRequests: 0
    }
    
    history.totalRequests++
    
    if (success) {
      history.completions.push(completionTime)
      // Keep only recent completions (last 50)
      if (history.completions.length > 50) {
        history.completions.shift()
      }
      // Calculate average
      history.avgCompletionTime = history.completions.reduce((a, b) => a + b, 0) / history.completions.length
    } else {
      history.failures++
    }
    
    history.failureRate = history.failures / history.totalRequests
    
    this.elevatorPerformanceHistory.set(elevatorId, history)
  }

  // NEW: System load tracking for dynamic priority adjustment
  updateSystemLoad(activeRequests, elevatorUtilization) {
    const currentLoad = {
      timestamp: Date.now(),
      activeRequests,
      utilization: elevatorUtilization,
      avgWaitTime: this.calculateSystemAvgWaitTime(activeRequests)
    }
    
    this.systemLoadHistory.push(currentLoad)
    
    // Keep only recent history
    if (this.systemLoadHistory.length > 100) {
      this.systemLoadHistory.shift()
    }
  }

  calculateSystemAvgWaitTime(requests) {
    if (!Array.isArray(requests) || requests.length === 0) return 0
    
    const waitTimes = requests
      .filter(r => r && typeof r.waitTime === 'number')
      .map(r => r.waitTime)
    
    if (waitTimes.length === 0) return 0
    
    return waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
  }

  // NEW: Get dynamic priority multiplier based on system load
  getSystemLoadMultiplier() {
    if (this.systemLoadHistory.length === 0) return 1
    
    const recent = this.systemLoadHistory.slice(-10)
    const avgLoad = recent.reduce((sum, load) => sum + load.utilization, 0) / recent.length
    const avgRequests = recent.reduce((sum, load) => sum + load.activeRequests, 0) / recent.length
    
    // Increase priority escalation during high load
    if (avgLoad > 0.8 || avgRequests > 20) return 1.5
    if (avgLoad > 0.6 || avgRequests > 15) return 1.3
    if (avgLoad > 0.4 || avgRequests > 10) return 1.1
    
    return 1
  }

  // NEW: Clear caches periodically to prevent memory bloat
  clearCaches() {
    this.trafficPatternCache.clear()
    
    // Keep only recent performance history
    for (const [elevatorId, history] of this.elevatorPerformanceHistory.entries()) {
      if (history.totalRequests === 0) {
        this.elevatorPerformanceHistory.delete(elevatorId)
      }
    }
    
    console.log('PriorityCalculator: Caches cleared')
  }

  // NEW: Get comprehensive scoring metrics
  getCalculatorMetrics() {
    return {
      cacheSize: this.trafficPatternCache.size,
      trackedElevators: this.elevatorPerformanceHistory.size,
      systemLoadHistory: this.systemLoadHistory.length,
      currentSystemLoad: this.getSystemLoadMultiplier()
    }
  }
}

module.exports = PriorityCalculator