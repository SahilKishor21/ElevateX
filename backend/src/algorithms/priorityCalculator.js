const { PRIORITY_WEIGHTS } = require('../utils/constants')

class PriorityCalculator {
  calculateRequestPriority(request) {
    let priority = request.priority
    
    const waitTimeMultiplier = this.getWaitTimePriority(request)
    const trafficBonus = this.getTrafficBonus(request)
    const starvationBonus = request.isStarving() ? 10 : 0
    const timeOfDayBonus = this.getTimeOfDayBonus(request)
    
    return priority * waitTimeMultiplier + trafficBonus + starvationBonus + timeOfDayBonus
  }

  getWaitTimePriority(request) {
    if (request.waitTime > PRIORITY_WEIGHTS.STARVATION_THRESHOLD) {
      return Math.pow(PRIORITY_WEIGHTS.EXPONENTIAL_BASE, 
        (request.waitTime - PRIORITY_WEIGHTS.STARVATION_THRESHOLD) / 10000)
    }
    return 1
  }

  getTrafficBonus(request) {
    const hour = new Date().getHours()
    
    // Morning rush: lobby to upper floors
    if (hour >= 8 && hour <= 10) {
      if (request.originFloor === 1 && request.destinationFloor > 5) {
        return 15
      }
    }
    
    // Evening rush: upper floors to lobby
    if (hour >= 17 && hour <= 19) {
      if (request.originFloor > 5 && request.destinationFloor === 1) {
        return 10
      }
    }
    
    // Lunch time: middle floor activity
    if (hour >= 12 && hour <= 14) {
      const midFloor = 8
      if (Math.abs(request.originFloor - midFloor) <= 2) {
        return 5
      }
    }
    
    return 0
  }

  getTimeOfDayBonus(request) {
    const hour = new Date().getHours()
    const minute = new Date().getMinutes()
    
    // Peak times get priority boost
    const peakHours = [8, 9, 12, 13, 17, 18]
    if (peakHours.includes(hour)) {
      return 3
    }
    
    // Off-peak times (late night/early morning) get slight penalty
    if (hour < 6 || hour > 22) {
      return -2
    }
    
    return 0
  }

  getCapacityPenalty(elevator) {
    const loadFactor = elevator.getLoad()
    if (loadFactor > 0.8) {
      return 20 * loadFactor
    }
    return 0
  }

  getDirectionPenalty(elevator, request) {
    if (elevator.state === 'idle') return 0
    
    const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down'
    
    if (elevator.direction !== requestDirection) {
      return 10
    }
    
    // Check if elevator is moving away from request
    if (requestDirection === 'up' && elevator.currentFloor > request.originFloor) {
      return 15
    }
    
    if (requestDirection === 'down' && elevator.currentFloor < request.originFloor) {
      return 15
    }
    
    return 0
  }

  getDistancePenalty(elevator, request) {
    const distance = Math.abs(elevator.currentFloor - request.originFloor)
    return distance * 2
  }

  calculateElevatorScore(elevator, request) {
    const basePenalty = this.getDistancePenalty(elevator, request)
    const capacityPenalty = this.getCapacityPenalty(elevator)
    const directionPenalty = this.getDirectionPenalty(elevator, request)
    
    // Lower score is better
    return basePenalty + capacityPenalty + directionPenalty
  }
}

module.exports = PriorityCalculator