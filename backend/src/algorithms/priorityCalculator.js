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
    const userExperienceBonus = this.getUserExperienceBias(request)

    const finalPriority = (priority * waitTimeMultiplier * urgencyMultiplier) + 
                         trafficBonus + starvationBonus + timeOfDayBonus + userExperienceBonus
    
    return Math.max(0.1, finalPriority)
  }

  getUserExperienceBias(request) {
    if (!request) return 0
    
    let bias = 0
    const waitSeconds = request.waitTime / 1000
    const hour = new Date().getHours()
    
    if (waitSeconds > 90) {
      bias += 200
      console.log(`CRITICAL STARVATION: Request ${request.id} waiting ${waitSeconds.toFixed(1)}s - Priority boost: +200`)
    } else if (waitSeconds > 60) {
      bias += 150
      console.log(`SEVERE STARVATION: Request ${request.id} waiting ${waitSeconds.toFixed(1)}s - Priority boost: +150`)
    } else if (waitSeconds > 45) {
      bias += 100
      console.log(`MODERATE STARVATION: Request ${request.id} waiting ${waitSeconds.toFixed(1)}s - Priority boost: +100`)
    } else if (waitSeconds > 30) {
      bias += 75
      console.log(`EARLY STARVATION: Request ${request.id} waiting ${waitSeconds.toFixed(1)}s - Priority boost: +75`)
    }
    
    if (hour >= 8 && hour <= 10) {
      if (request.originFloor === 1 && request.destinationFloor > 5) {
        bias += 35
      }
      if (request.destinationFloor > request.originFloor) {
        bias += 15
      }
    }
    
    if (hour >= 17 && hour <= 19) {
      if (request.originFloor > 5 && request.destinationFloor === 1) {
        bias += 30
      }
      if (request.destinationFloor < request.originFloor) {
        bias += 12
      }
    }
    
    if (request.priority >= 4) {
      bias += request.priority * 15
    }
    
    if (request.type === 'accessibility' || request.passengerCount > 4) {
      bias += 25
    }
    
    return bias
  }

  getWaitTimePriority(request) {
    if (!request || typeof request.waitTime !== 'number') return 1
    
    const waitSeconds = request.waitTime / 1000
    
    if (waitSeconds > 90) {
      return Math.pow(5.0, (waitSeconds - 90) / 15)
    } else if (waitSeconds > 60) {
      return Math.pow(3.0, (waitSeconds - 60) / 10)
    } else if (waitSeconds > 30) {
      return Math.pow(2.0, (waitSeconds - 30) / 10)
    } else if (waitSeconds > 15) {
      return 1 + ((waitSeconds - 15) / 15)
    }
    
    return 1
  }

  getUrgencyMultiplier(request) {
    if (!request) return 1
    
    const waitSeconds = request.waitTime / 1000
    
    if (waitSeconds > 120) return 8.0
    if (waitSeconds > 90) return 6.0
    if (waitSeconds > 60) return 4.0
    if (waitSeconds > 45) return 3.0
    if (waitSeconds > 30) return 2.5
    
    return 1
  }

  getStarvationBonus(request) {
    if (!request || typeof request.waitTime !== 'number') return 0
    
    const waitSeconds = request.waitTime / 1000
    
    if (waitSeconds > 120) return 500
    if (waitSeconds > 90) return 300
    if (waitSeconds > 60) return 200
    if (waitSeconds > 45) return 100
    if (waitSeconds > 30) return 50
    
    return 0
  }

  getTrafficBonus(request) {
    if (!request) return 0
    
    const hour = new Date().getHours()
    const minute = new Date().getMinutes()
    const cacheKey = `${hour}-${minute}-${request.originFloor}-${request.destinationFloor}`
    
    if (this.trafficPatternCache.has(cacheKey)) {
      return this.trafficPatternCache.get(cacheKey)
    }
    
    let bonus = 0
    
    if (hour >= 8 && hour <= 10) {
      if (request.originFloor === 1 && request.destinationFloor > 5) {
        if (hour === 9) {
          bonus = 40
        } else {
          bonus = 25
        }
      } else if (request.destinationFloor > request.originFloor) {
        bonus = 12
      }
    }
    
    if (hour >= 17 && hour <= 19) {
      if (request.originFloor > 5 && request.destinationFloor === 1) {
        if (hour === 18) {
          bonus = 35
        } else {
          bonus = 20
        }
      } else if (request.destinationFloor < request.originFloor) {
        bonus = 10
      }
    }
    
    if (hour >= 12 && hour <= 14) {
      const midFloor = Math.floor(15 / 2)
      if (Math.abs(request.originFloor - midFloor) <= 3 || 
          Math.abs(request.destinationFloor - midFloor) <= 3) {
        bonus = 15
      }
    }
    
    this.trafficPatternCache.set(cacheKey, bonus)
    
    if (this.trafficPatternCache.size > 200) {
      const firstKey = this.trafficPatternCache.keys().next().value
      this.trafficPatternCache.delete(firstKey)
    }
    
    return bonus
  }

  getTimeOfDayBonus(request) {
    const hour = new Date().getHours()
    const minute = new Date().getMinutes()
    
    if (hour === 8 && minute >= 30) return 12
    if (hour === 9 && minute <= 30) return 15
    if (hour === 9 && minute > 30) return 10
    if (hour === 10 && minute <= 30) return 8
    
    if (hour === 17 && minute >= 30) return 10
    if (hour === 18 && minute <= 30) return 12
    if (hour === 18 && minute > 30) return 8
    
    if (hour === 12) return 8
    if (hour === 13 && minute <= 30) return 6
    
    const peakHours = [8, 9, 12, 13, 17, 18]
    if (peakHours.includes(hour)) return 5
    
    if ([7, 10, 11, 14, 15, 16, 19].includes(hour)) return 3
    
    if (hour < 6 || hour > 22) return -2
    
    return 0
  }

  calculateElevatorScore(elevator, request) {
    const basePenalty = this.getDistancePenalty(elevator, request)
    const capacityPenalty = this.getCapacityPenalty(elevator)
    const directionPenalty = this.getDirectionPenalty(elevator, request)
    const performancePenalty = this.getPerformancePenalty(elevator)
    const loadBalancePenalty = this.getLoadBalancePenalty(elevator)
    const userExperiencePenalty = this.getUserExperiencePenalty(elevator, request)
    
    return basePenalty + capacityPenalty + directionPenalty + 
           performancePenalty + loadBalancePenalty + userExperiencePenalty
  }

  getUserExperiencePenalty(elevator, request) {
    if (!elevator || !request) return 0
    
    let penalty = 0
    
    const loadFactor = elevator.getLoad()
    if (loadFactor > 0.8) {
      penalty += 25
    }
    
    const stops = elevator.requestQueue?.length || 0
    penalty += stops * 3
    
    const waitSeconds = request.waitTime / 1000
    if (waitSeconds > 60) {
      penalty = Math.max(0, penalty - 20)
    }
    
    if (elevator.direction === 'up' && request.originFloor < elevator.currentFloor) {
      penalty += waitSeconds > 60 ? 5 : 15
    }
    if (elevator.direction === 'down' && request.originFloor > elevator.currentFloor) {
      penalty += waitSeconds > 60 ? 5 : 15
    }
    
    return penalty
  }

  getCapacityPenalty(elevator) {
    if (!elevator || typeof elevator.getLoad !== 'function') return 0
    
    const loadFactor = elevator.getLoad()
    
    if (loadFactor > 0.95) return 50 * loadFactor
    if (loadFactor > 0.8) return 35 * loadFactor
    if (loadFactor > 0.6) return 20 * loadFactor
    
    return 10 * loadFactor
  }

  getDirectionPenalty(elevator, request) {
    if (!elevator || elevator.state === 'idle') return 0
    
    const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down'
    const elevatorDirection = elevator.direction
    
    const waitSeconds = request.waitTime / 1000
    const starvationMultiplier = waitSeconds > 60 ? 0.3 : 1.0
    
    if (elevatorDirection === requestDirection) {
      if (requestDirection === 'up' && elevator.currentFloor <= request.originFloor) {
        return -15
      }
      if (requestDirection === 'down' && elevator.currentFloor >= request.originFloor) {
        return -15
      }
      return 8 * starvationMultiplier
    }
    
    return 25 * starvationMultiplier
  }

  getDistancePenalty(elevator, request) {
    if (!elevator) return 0
    const distance = Math.abs(elevator.currentFloor - request.originFloor)
    
    const waitSeconds = request.waitTime / 1000
    let distanceMultiplier = 1.0
    
    if (waitSeconds > 90) distanceMultiplier = 0.2
    else if (waitSeconds > 60) distanceMultiplier = 0.4
    else if (waitSeconds > 30) distanceMultiplier = 0.7
    
    if (distance === 0) return 0
    if (distance <= 2) return distance * 2 * distanceMultiplier
    if (distance <= 5) return distance * 4 * distanceMultiplier
    if (distance <= 10) return distance * 6 * distanceMultiplier
    return distance * 8 * distanceMultiplier
  }

  getPerformancePenalty(elevator) {
    if (!elevator) return 0
    
    const elevatorId = elevator.id
    const history = this.elevatorPerformanceHistory.get(elevatorId)
    
    if (!history) return 0
    
    let penalty = 0
    const avgCompletionTime = history.avgCompletionTime || 0
    const failureRate = history.failureRate || 0
    
    if (avgCompletionTime > 90) penalty += 20
    else if (avgCompletionTime > 60) penalty += 12
    
    if (failureRate > 0.15) penalty += 25
    else if (failureRate > 0.1) penalty += 15
    
    return penalty
  }

  getLoadBalancePenalty(elevator) {
    if (!elevator) return 0
    
    const queueLength = elevator.requestQueue?.length || 0
    const passengerCount = elevator.passengers?.length || 0
    
    let penalty = Math.pow(queueLength, 1.8) * 6
    penalty += passengerCount * 4
    
    if (elevator.state !== 'idle') {
      penalty += 10
    }
    
    return penalty
  }

  updateElevatorPerformance(elevatorId, completionTime, success = true) {
    let history = this.elevatorPerformanceHistory.get(elevatorId) || {
      completions: [],
      failures: 0,
      totalRequests: 0
    }
    
    history.totalRequests++
    
    if (success) {
      history.completions.push(completionTime)
      if (history.completions.length > 50) {
        history.completions.shift()
      }
      history.avgCompletionTime = history.completions.reduce((a, b) => a + b, 0) / history.completions.length
    } else {
      history.failures++
    }
    
    history.failureRate = history.failures / history.totalRequests
    
    this.elevatorPerformanceHistory.set(elevatorId, history)
  }

  updateSystemLoad(activeRequests, elevatorUtilization) {
    const currentLoad = {
      timestamp: Date.now(),
      activeRequests,
      utilization: elevatorUtilization,
      avgWaitTime: this.calculateSystemAvgWaitTime(activeRequests)
    }
    
    this.systemLoadHistory.push(currentLoad)
    
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

  getSystemLoadMultiplier() {
    if (this.systemLoadHistory.length === 0) return 1
    
    const recent = this.systemLoadHistory.slice(-10)
    const avgLoad = recent.reduce((sum, load) => sum + load.utilization, 0) / recent.length
    const avgRequests = recent.reduce((sum, load) => sum + load.activeRequests, 0) / recent.length
    
    if (avgLoad > 0.8 || avgRequests > 25) return 2.5
    if (avgLoad > 0.6 || avgRequests > 15) return 2.0
    if (avgLoad > 0.4 || avgRequests > 10) return 1.5
    
    return 1
  }

  clearCaches() {
    this.trafficPatternCache.clear()
    
    for (const [elevatorId, history] of this.elevatorPerformanceHistory.entries()) {
      if (history.totalRequests === 0) {
        this.elevatorPerformanceHistory.delete(elevatorId)
      }
    }
    
    console.log('PriorityCalculator: Caches cleared')
  }

  getCalculatorMetrics() {
    return {
      cacheSize: this.trafficPatternCache.size,
      trackedElevators: this.elevatorPerformanceHistory.size,
      systemLoadHistory: this.systemLoadHistory.length,
      currentSystemLoad: this.getSystemLoadMultiplier(),
      averageWaitTimeThreshold: 30,
      starvationThreshold: 60,
      peakHours: [8, 9, 17, 18],
      userExperienceBiasActive: true,
      starvationPrevention: {
        earlyWarningThreshold: 30,
        moderateThreshold: 45, 
        severeThreshold: 60,
        criticalThreshold: 90,
        maxPriorityBonus: 500
      }
    }
  }
}

module.exports = PriorityCalculator
