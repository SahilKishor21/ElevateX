const PriorityCalculator = require('./priorityCalculator')

class HybridScheduler {
  constructor() {
    this.priorityCalculator = new PriorityCalculator()
    this.lastOptimization = 0
    this.elevatorLastAssignment = new Map() // Track last assignment time for each elevator
  }

  optimizeRoutes(elevators, requests) {
    const now = Date.now()
    
    if (now - this.lastOptimization < 500) return
    this.lastOptimization = now

    requests.forEach(request => {
      if (typeof request.updateWaitTime === 'function') {
        request.updateWaitTime()
      }
    })

    const pendingRequests = requests
      .filter(r => r.isActive && !r.assignedElevator)
      .sort((a, b) => {
        const priorityA = this.priorityCalculator.calculateRequestPriority(a)
        const priorityB = this.priorityCalculator.calculateRequestPriority(b)
        return priorityB - priorityA
      })

    // Distribute requests more evenly across elevators
    pendingRequests.forEach(request => {
      const elevator = this.assignOptimalElevator(request, elevators)
      if (elevator) {
        request.assign(elevator.id)
        elevator.addRequest(request.originFloor)
        if (request.destinationFloor) {
          elevator.addRequest(request.destinationFloor)
        }
        // Track assignment to prevent one elevator from being overloaded
        this.elevatorLastAssignment.set(elevator.id, now)
      }
    })

    this.optimizeExistingRoutes(elevators)
  }

  assignOptimalElevator(request, elevators) {
    const availableElevators = elevators.filter(e => 
      !e.maintenanceMode && !e.isFull()
    )
    
    if (availableElevators.length === 0) return null

    const elevatorScores = availableElevators.map(elevator => {
      let score = this.calculateAssignmentScore(elevator, request)
      
      // Add penalty for elevators that were recently assigned (load balancing)
      const lastAssignment = this.elevatorLastAssignment.get(elevator.id) || 0
      const timeSinceAssignment = Date.now() - lastAssignment
      if (timeSinceAssignment < 5000) { // Within last 5 seconds
        score += 10 // Add penalty to encourage using other elevators
      }
      
      // Add penalty for elevators with many queued requests
      score += elevator.requestQueue.length * 5
      
      return {
        elevator,
        score: score
      }
    })

    elevatorScores.sort((a, b) => a.score - b.score)
    return elevatorScores[0].elevator
  }

  calculateAssignmentScore(elevator, request) {
    const distance = Math.abs(elevator.currentFloor - request.originFloor)
    const waitTimeMultiplier = Math.max(1, request.waitTime / 30000)
    const directionAlignment = this.getDirectionAlignment(elevator, request)
    const capacityPenalty = elevator.getLoad() * 25
    const trafficBonus = this.priorityCalculator.getTrafficBonus(request)
    
    const baseScore = distance + capacityPenalty
    const modifiedScore = baseScore * waitTimeMultiplier * directionAlignment
    
    return Math.max(0.1, modifiedScore - trafficBonus)
  }

  getDirectionAlignment(elevator, request) {
    if (elevator.state === 'idle') return 0.8

    const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down'
    
    if (elevator.direction === requestDirection) {
      if (requestDirection === 'up' && elevator.currentFloor <= request.originFloor) {
        return 0.5
      }
      if (requestDirection === 'down' && elevator.currentFloor >= request.originFloor) {
        return 0.5
      }
    }
    
    return 1.3
  }

  optimizeExistingRoutes(elevators) {
    elevators.forEach(elevator => {
      if (elevator.requestQueue.length > 1) {
        elevator.requestQueue.sort((a, b) => {
          if (elevator.direction === 'up') {
            return a - b
          } else if (elevator.direction === 'down') {
            return b - a
          } else {
            const distanceA = Math.abs(a - elevator.currentFloor)
            const distanceB = Math.abs(b - elevator.currentFloor)
            return distanceA - distanceB
          }
        })
      }
    })
  }

  preventStarvation(requests, elevators) {
    const starvingRequests = requests.filter(r => {
      return r.isActive && typeof r.isStarving === 'function' && r.isStarving()
    })
    
    starvingRequests.forEach(request => {
      if (!request.assignedElevator) {
        const nearestElevator = this.findNearestAvailableElevator(request.originFloor, elevators)
        if (nearestElevator) {
          if (nearestElevator.isFull()) {
            this.clearLowPriorityRequests(nearestElevator, requests)
          }
          
          request.assign(nearestElevator.id)
          nearestElevator.addRequest(request.originFloor)
          request.priority = 5
        }
      }
    })
  }

  findNearestAvailableElevator(floor, elevators) {
    const availableElevators = elevators.filter(e => !e.maintenanceMode)
    
    if (availableElevators.length === 0) return null

    return availableElevators.reduce((nearest, current) => {
      const currentDistance = Math.abs(current.currentFloor - floor)
      const nearestDistance = Math.abs(nearest.currentFloor - floor)
      
      if (Math.abs(currentDistance - nearestDistance) <= 2) {
        return current.getLoad() < nearest.getLoad() ? current : nearest
      }
      
      return currentDistance < nearestDistance ? current : nearest
    })
  }

  clearLowPriorityRequests(elevator, allRequests) {
    const elevatorRequests = allRequests.filter(r => r.assignedElevator === elevator.id && r.isActive)
    const lowPriorityRequests = elevatorRequests
      .filter(r => r.priority <= 2 && r.waitTime < 30000)
      .sort((a, b) => a.priority - b.priority)

    if (lowPriorityRequests.length > 0) {
      const requestToRemove = lowPriorityRequests[0]
      requestToRemove.assignedElevator = null
      
      const floorIndex = elevator.requestQueue.indexOf(requestToRemove.originFloor)
      if (floorIndex !== -1) {
        elevator.requestQueue.splice(floorIndex, 1)
      }
    }
  }

  // FIXED: Better idle elevator positioning that doesn't keep E1 stuck
  positionIdleElevators(elevators, numFloors) {
    const idleElevators = elevators.filter(e => e.isIdle())
    
    if (idleElevators.length === 0) return

    const hour = new Date().getHours()
    const positions = this.calculateOptimalPositions(hour, numFloors, idleElevators.length)
    
    idleElevators.forEach((elevator, index) => {
      if (index < positions.length) {
        const targetFloor = positions[index]
        // Only move if elevator has been idle for at least 10 seconds and target is different
        const hasBeenIdle = elevator.state === 'idle' && elevator.requestQueue.length === 0
        const shouldReposition = hasBeenIdle && elevator.currentFloor !== targetFloor
        
        if (shouldReposition) {
          // Add randomization to prevent all elevators going to same floor
          const adjustedTarget = targetFloor + Math.floor(Math.random() * 3) - 1
          const finalTarget = Math.max(1, Math.min(numFloors, adjustedTarget))
          elevator.moveTo(finalTarget)
        }
      }
    })
  }

  calculateOptimalPositions(hour, numFloors, elevatorCount) {
    const positions = []
    
    if (hour >= 8 && hour <= 10) {
      // Morning rush - but don't put ALL elevators at lobby
      positions.push(1) // One at lobby
      if (elevatorCount > 1) positions.push(Math.floor(numFloors * 0.3)) // One at 30% height
      if (elevatorCount > 2) positions.push(Math.floor(numFloors * 0.6)) // One at 60% height
      if (elevatorCount > 3) positions.push(Math.floor(numFloors * 0.8)) // One at 80% height
    } else if (hour >= 17 && hour <= 19) {
      // Evening rush - spread across upper floors
      const upperStart = Math.floor(numFloors * 0.6)
      for (let i = 0; i < elevatorCount; i++) {
        positions.push(upperStart + i * 2)
      }
    } else {
      // Normal distribution - spread evenly
      for (let i = 0; i < elevatorCount; i++) {
        const position = Math.floor((i + 1) * numFloors / (elevatorCount + 1))
        positions.push(Math.max(1, position))
      }
    }
    
    // Fill remaining positions with random floors if needed
    while (positions.length < elevatorCount) {
      const randomFloor = Math.floor(Math.random() * numFloors) + 1
      if (!positions.includes(randomFloor)) {
        positions.push(randomFloor)
      }
    }
    
    return positions.slice(0, elevatorCount)
  }

  getSchedulingMetrics(elevators, requests) {
    const activeRequests = requests.filter(r => r.isActive)
    const servedRequests = requests.filter(r => r.isServed)
    const starvingRequests = activeRequests.filter(r => 
      typeof r.isStarving === 'function' && r.isStarving()
    )
    
    const waitTimes = servedRequests.map(r => r.waitTime).filter(t => t > 0)
    const utilizationRates = elevators.map(e => e.getUtilization())
    
    return {
      algorithm: 'Hybrid Dynamic Scheduler',
      totalRequests: requests.length,
      activeRequests: activeRequests.length,
      servedRequests: servedRequests.length,
      starvingRequests: starvingRequests.length,
      averageWaitTime: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
      maxWaitTime: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      averageUtilization: utilizationRates.reduce((a, b) => a + b, 0) / utilizationRates.length,
      efficiency: this.calculateOverallEfficiency(elevators, servedRequests),
      lastOptimization: new Date(this.lastOptimization).toISOString()
    }
  }

  calculateOverallEfficiency(elevators, servedRequests) {
    const totalDistance = elevators.reduce((sum, e) => sum + e.totalDistance, 0)
    
    if (totalDistance === 0 || servedRequests.length === 0) return 0
    
    return (servedRequests.length / totalDistance) * 100
  }
}

module.exports = HybridScheduler