const PriorityCalculator = require('./priorityCalculator')
const TrafficAnalyzer = require('../services/trafficAnalyzer')

class HybridScheduler {
  constructor() {
    this.priorityCalculator = new PriorityCalculator()
    this.trafficAnalyzer = new TrafficAnalyzer()
    this.lastOptimization = 0
  }

  optimizeRoutes(elevators, requests) {
    const now = Date.now()
    
    // Don't optimize too frequently
    if (now - this.lastOptimization < 500) return
    this.lastOptimization = now

    // Update request priorities
    requests.forEach(request => {
      request.updateWaitTime()
    })

    // Sort requests by calculated priority (highest first)
    const pendingRequests = requests
      .filter(r => r.isActive && !r.assignedElevator)
      .sort((a, b) => {
        const priorityA = this.priorityCalculator.calculateRequestPriority(a)
        const priorityB = this.priorityCalculator.calculateRequestPriority(b)
        return priorityB - priorityA
      })

    // Assign requests to optimal elevators
    pendingRequests.forEach(request => {
      const elevator = this.assignOptimalElevator(request, elevators)
      if (elevator) {
        request.assign(elevator.id)
        elevator.addRequest(request.originFloor)
        if (request.destinationFloor) {
          elevator.addRequest(request.destinationFloor)
        }
      }
    })

    // Optimize existing elevator routes
    this.optimizeExistingRoutes(elevators)
  }

  assignOptimalElevator(request, elevators) {
    const availableElevators = elevators.filter(e => 
      !e.maintenanceMode && !e.isFull()
    )
    
    if (availableElevators.length === 0) return null

    // Calculate scores for each elevator
    const elevatorScores = availableElevators.map(elevator => ({
      elevator,
      score: this.calculateAssignmentScore(elevator, request)
    }))

    // Sort by score (lower is better)
    elevatorScores.sort((a, b) => a.score - b.score)

    return elevatorScores[0].elevator
  }

  calculateAssignmentScore(elevator, request) {
    const distance = Math.abs(elevator.currentFloor - request.originFloor)
    const waitTimeMultiplier = Math.max(1, request.waitTime / 30000)
    const directionAlignment = this.getDirectionAlignment(elevator, request)
    const capacityPenalty = elevator.getLoad() * 20
    const trafficBonus = this.priorityCalculator.getTrafficBonus(request)
    
    // Lower score = better assignment
    const baseScore = distance + capacityPenalty
    const modifiedScore = baseScore * waitTimeMultiplier * directionAlignment
    
    return Math.max(0.1, modifiedScore - trafficBonus)
  }

  getDirectionAlignment(elevator, request) {
    if (elevator.state === 'idle') return 0.8 // Slight preference for idle elevators

    const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down'
    
    if (elevator.direction === requestDirection) {
      // Check if elevator can pick up request on its way
      if (requestDirection === 'up' && elevator.currentFloor <= request.originFloor) {
        return 0.5 // Very good alignment
      }
      if (requestDirection === 'down' && elevator.currentFloor >= request.originFloor) {
        return 0.5 // Very good alignment
      }
    }
    
    return 1.3 // Poor alignment - elevator needs to change direction or backtrack
  }

  optimizeExistingRoutes(elevators) {
    elevators.forEach(elevator => {
      if (elevator.requestQueue.length > 1) {
        // Re-sort request queue based on current direction and efficiency
        elevator.requestQueue.sort((a, b) => {
          if (elevator.direction === 'up') {
            return a - b // Ascending for upward movement
          } else if (elevator.direction === 'down') {
            return b - a // Descending for downward movement
          } else {
            // For idle elevators, sort by distance from current floor
            const distanceA = Math.abs(a - elevator.currentFloor)
            const distanceB = Math.abs(b - elevator.currentFloor)
            return distanceA - distanceB
          }
        })
      }
    })
  }

  preventStarvation(requests, elevators) {
    const starvingRequests = requests.filter(r => r.isStarving() && r.isActive)
    
    starvingRequests.forEach(request => {
      if (!request.assignedElevator) {
        // Force assignment to nearest available elevator
        const nearestElevator = this.findNearestAvailableElevator(request.originFloor, elevators)
        if (nearestElevator) {
          // Remove any existing low-priority requests if elevator is full
          if (nearestElevator.isFull()) {
            this.clearLowPriorityRequests(nearestElevator, requests)
          }
          
          request.assign(nearestElevator.id)
          nearestElevator.addRequest(request.originFloor)
          request.priority = 5 // Maximum priority
          
          console.log(`Emergency assignment: Request ${request.id} assigned to elevator ${nearestElevator.id} (starving for ${request.waitTime}ms)`)
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
      
      // Prefer elevators with lower load if distances are close
      if (Math.abs(currentDistance - nearestDistance) <= 2) {
        return current.getLoad() < nearest.getLoad() ? current : nearest
      }
      
      return currentDistance < nearestDistance ? current : nearest
    })
  }

  clearLowPriorityRequests(elevator, allRequests) {
    // Find requests assigned to this elevator with low priority
    const elevatorRequests = allRequests.filter(r => r.assignedElevator === elevator.id && r.isActive)
    const lowPriorityRequests = elevatorRequests
      .filter(r => r.priority <= 2 && r.waitTime < 30000)
      .sort((a, b) => a.priority - b.priority)

    // Remove one low priority request to make space
    if (lowPriorityRequests.length > 0) {
      const requestToRemove = lowPriorityRequests[0]
      requestToRemove.assignedElevator = null
      
      // Remove from elevator's queue
      const floorIndex = elevator.requestQueue.indexOf(requestToRemove.originFloor)
      if (floorIndex !== -1) {
        elevator.requestQueue.splice(floorIndex, 1)
      }
    }
  }

  positionIdleElevators(elevators, numFloors) {
    const idleElevators = elevators.filter(e => e.isIdle())
    
    if (idleElevators.length === 0) return

    const trafficPattern = this.trafficAnalyzer.predictTrafficPattern()
    const optimalPositions = this.trafficAnalyzer.getOptimalElevatorPositioning(idleElevators.length, numFloors)
    
    // Check for preemptive movement recommendations
    const recommendations = this.trafficAnalyzer.shouldTriggerPreemptiveMovement(elevators, trafficPattern)
    
    recommendations.forEach(rec => {
      const elevator = elevators.find(e => e.id === rec.elevatorId)
      if (elevator && elevator.isIdle()) {
        elevator.moveTo(rec.targetFloor)
        console.log(`Preemptive positioning: Elevator ${elevator.id} moving to floor ${rec.targetFloor} - ${rec.reason}`)
      }
    })

    // Position remaining idle elevators
    idleElevators.forEach((elevator, index) => {
      if (elevator.state === 'idle' && index < optimalPositions.length) {
        const targetFloor = optimalPositions[index]
        if (elevator.currentFloor !== targetFloor) {
          elevator.moveTo(targetFloor)
        }
      }
    })
  }

  getSchedulingMetrics(elevators, requests) {
    const activeRequests = requests.filter(r => r.isActive)
    const servedRequests = requests.filter(r => r.isServed)
    const starvingRequests = activeRequests.filter(r => r.isStarving())
    
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
    const totalTrips = elevators.reduce((sum, e) => sum + e.totalTrips, 0)
    
    if (totalDistance === 0 || servedRequests.length === 0) return 0
    
    return (servedRequests.length / totalDistance) * 100
  }
}

module.exports = HybridScheduler