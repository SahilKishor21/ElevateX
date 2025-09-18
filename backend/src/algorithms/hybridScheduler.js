const PriorityCalculator = require('./priorityCalculator')

class HybridScheduler {
  constructor() {
    this.priorityCalculator = new PriorityCalculator()
    this.lastOptimization = 0
    this.elevatorLastAssignment = new Map() // Track last assignment time for each elevator
    this.elevatorLoadPrediction = new Map() // Predict future load for each elevator
    this.systemLoadThreshold = 0.8 // Switch to high-performance mode above 80% load
    this.highVolumeMode = false
  }

  // FIXED: Prevent double assignments and improve efficiency
  optimizeRoutes(elevators, requests) {
    const now = Date.now()
    
    // FIXED: Reduce throttling for high-volume scenarios
    const throttleInterval = this.highVolumeMode ? 250 : 500 // Faster processing under load
    if (now - this.lastOptimization < throttleInterval) return
    this.lastOptimization = now

    // Update wait times for ALL requests
    requests.forEach(request => {
      if (typeof request.updateWaitTime === 'function') {
        request.updateWaitTime()
      }
    })

    // FIXED: Detect high-volume scenarios and adjust behavior
    this.detectHighVolumeMode(requests, elevators)

    // CRITICAL FIX: Only process UNASSIGNED requests, not already assigned ones
    const pendingRequests = requests
      .filter(r => r.isActive && !r.isServed && (r.assignedElevator === null || r.assignedElevator === undefined))
      .sort((a, b) => {
        const priorityA = this.priorityCalculator.calculateRequestPriority(a)
        const priorityB = this.priorityCalculator.calculateRequestPriority(b)
        return priorityB - priorityA
      })

    console.log(`HybridScheduler: Processing ${pendingRequests.length} unassigned requests (${requests.length} total active) - ${this.highVolumeMode ? 'HIGH VOLUME MODE' : 'Normal'}`)

    // IMPROVED: Batch processing for high-volume scenarios
    if (this.highVolumeMode && pendingRequests.length > 20) {
      this.processBatchAssignment(pendingRequests, elevators)
    } else {
      // Process each unassigned request individually for optimal assignment
      pendingRequests.forEach(request => {
        const elevator = this.assignOptimalElevator(request, elevators)
        if (elevator) {
          console.log(`HybridScheduler: Assigning request ${request.originFloor}→${request.destinationFloor} to E${elevator.id}`)
          request.assign(elevator.id)
          elevator.addRequest(request.originFloor)
          if (request.destinationFloor) {
            elevator.addRequest(request.destinationFloor)
          }
          this.elevatorLastAssignment.set(elevator.id, now)
          this.updateLoadPrediction(elevator.id, request)
        }
      })
    }

    // ENHANCED: Advanced route optimization
    this.optimizeExistingRoutes(elevators)
  }

  // NEW: Detect when system is under high load and adjust behavior
  detectHighVolumeMode(requests, elevators) {
    const activeRequests = requests.filter(r => r.isActive && !r.isServed).length
    const elevatorUtilization = elevators.filter(e => e.state !== 'idle').length / elevators.length
    const avgWaitTime = this.calculateAverageWaitTime(requests)
    
    // Enter high-volume mode if any condition is met
    const shouldEnterHighVolumeMode = 
      activeRequests > elevators.length * 10 || // More than 10 requests per elevator
      elevatorUtilization > this.systemLoadThreshold || // High utilization
      avgWaitTime > 45 // Long wait times

    if (shouldEnterHighVolumeMode && !this.highVolumeMode) {
      console.log('🚨 HybridScheduler: Entering HIGH VOLUME MODE - Optimizing for throughput')
      this.highVolumeMode = true
    } else if (!shouldEnterHighVolumeMode && this.highVolumeMode) {
      console.log('✅ HybridScheduler: Exiting high volume mode - Returning to optimal assignments')
      this.highVolumeMode = false
    }
  }

  // NEW: Batch processing for high-volume scenarios (100+ requests)
  processBatchAssignment(requests, elevators) {
    console.log(`Processing ${requests.length} requests in batch mode`)
    
    // Group requests by origin floor for efficiency
    const requestsByFloor = new Map()
    requests.forEach(request => {
      const floor = request.originFloor
      if (!requestsByFloor.has(floor)) {
        requestsByFloor.set(floor, [])
      }
      requestsByFloor.get(floor).push(request)
    })

    // Assign batches to elevators more efficiently
    const availableElevators = [...elevators].filter(e => !e.maintenanceMode)
    let elevatorIndex = 0

    requestsByFloor.forEach((floorRequests, floor) => {
      // Assign all requests from same floor to same elevator when possible
      const elevator = availableElevators[elevatorIndex % availableElevators.length]
      
      floorRequests.forEach(request => {
        if (!elevator.isFull()) {
          request.assign(elevator.id)
          elevator.addRequest(request.originFloor)
          if (request.destinationFloor) {
            elevator.addRequest(request.destinationFloor)
          }
          this.updateLoadPrediction(elevator.id, request)
        }
      })
      
      elevatorIndex++
    })
  }

  // ENHANCED: Better elevator assignment with predictive load balancing
  assignOptimalElevator(request, elevators) {
    const availableElevators = elevators.filter(e => 
      !e.maintenanceMode && !e.isFull()
    )
    
    if (availableElevators.length === 0) return null

    const elevatorScores = availableElevators.map(elevator => {
      let score = this.calculateAssignmentScore(elevator, request)
      
      // IMPROVED: Enhanced load balancing with prediction
      const lastAssignment = this.elevatorLastAssignment.get(elevator.id) || 0
      const timeSinceAssignment = Date.now() - lastAssignment
      const predictedLoad = this.elevatorLoadPrediction.get(elevator.id) || 0
      
      // Penalty for recently assigned elevators (load balancing)
      if (timeSinceAssignment < 3000) {
        score += 12 // Reduced from 15 for better responsiveness
      }
      
      // ENHANCED: Predictive load penalty
      score += predictedLoad * 5
      
      // Queue length penalty (more aggressive in high-volume mode)
      const queuePenalty = this.highVolumeMode ? 6 : 8
      score += elevator.requestQueue.length * queuePenalty
      
      // Capacity penalty
      score += (elevator.passengers?.length || 0) * 3
      
      // IMPROVED: Direction alignment bonus for better efficiency
      const directionBonus = this.getEnhancedDirectionAlignment(elevator, request)
      score -= directionBonus // Subtract because lower score = better
      
      return { elevator, score }
    })

    elevatorScores.sort((a, b) => a.score - b.score)
    return elevatorScores[0].elevator
  }

  // ENHANCED: Better direction alignment calculation
  getEnhancedDirectionAlignment(elevator, request) {
    if (elevator.state === 'idle') return 10 // Good bonus for idle elevators

    const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down'
    
    if (elevator.direction === requestDirection) {
      if (requestDirection === 'up' && elevator.currentFloor <= request.originFloor) {
        return 15 // Excellent alignment - elevator going up, can pick up on the way
      }
      if (requestDirection === 'down' && elevator.currentFloor >= request.originFloor) {
        return 15 // Excellent alignment - elevator going down, can pick up on the way
      }
      return 5 // Same direction but would need to reverse
    }
    
    return 0 // Different direction, no bonus
  }

  calculateAssignmentScore(elevator, request) {
    const distance = Math.abs(elevator.currentFloor - request.originFloor)
    const waitTimeMultiplier = Math.max(1, request.waitTime / 30000)
    const directionAlignment = this.getDirectionAlignment(elevator, request)
    const capacityPenalty = (elevator.passengers?.length || 0) * 4
    const trafficBonus = this.priorityCalculator.getTrafficBonus(request)
    
    const baseScore = distance + capacityPenalty
    const modifiedScore = baseScore * waitTimeMultiplier * directionAlignment
    const finalScore = Math.max(0.1, modifiedScore - trafficBonus)
    
    return finalScore
  }

  getDirectionAlignment(elevator, request) {
    if (elevator.state === 'idle') return 0.7

    const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down'
    
    if (elevator.direction === requestDirection) {
      if (requestDirection === 'up' && elevator.currentFloor <= request.originFloor) {
        return 0.4
      }
      if (requestDirection === 'down' && elevator.currentFloor >= request.originFloor) {
        return 0.4
      }
      return 1.5
    }
    
    return 2.0
  }

  // ENHANCED: Advanced route optimization with multi-stop efficiency
  optimizeExistingRoutes(elevators) {
    elevators.forEach(elevator => {
      if (elevator.requestQueue.length > 1) {
        // IMPROVED: Advanced queue sorting considering passenger destinations
        elevator.requestQueue = this.optimizeMultiStopRoute(elevator, elevator.requestQueue)
      }
    })
  }

  // NEW: Optimize multi-stop routes for better efficiency
  optimizeMultiStopRoute(elevator, queue) {
    if (queue.length <= 1) return queue

    const currentFloor = elevator.currentFloor
    const direction = elevator.direction

    if (direction === 'up') {
      // For up direction: serve floors in ascending order above current, then descending below
      const above = queue.filter(floor => floor > currentFloor).sort((a, b) => a - b)
      const atCurrent = queue.filter(floor => floor === currentFloor)
      const below = queue.filter(floor => floor < currentFloor).sort((a, b) => b - a)
      return [...atCurrent, ...above, ...below]
    } else if (direction === 'down') {
      // For down direction: serve floors in descending order below current, then ascending above
      const below = queue.filter(floor => floor < currentFloor).sort((a, b) => b - a)
      const atCurrent = queue.filter(floor => floor === currentFloor)
      const above = queue.filter(floor => floor > currentFloor).sort((a, b) => a - b)
      return [...atCurrent, ...below, ...above]
    } else {
      // Idle: serve closest floors first
      return queue.sort((a, b) => 
        Math.abs(a - currentFloor) - Math.abs(b - currentFloor)
      )
    }
  }

  // ENHANCED: Aggressive starvation prevention for high-volume scenarios
  preventStarvation(requests, elevators) {
    const starvingThreshold = this.highVolumeMode ? 45000 : 60000 // More aggressive in high-volume
    const starvingRequests = requests.filter(r => {
      return r.isActive && r.waitTime > starvingThreshold && (r.assignedElevator === null || r.assignedElevator === undefined)
    })
    
    if (starvingRequests.length === 0) return

    console.log(`🚨 Found ${starvingRequests.length} starving requests - applying emergency assignment`)
    
    starvingRequests.forEach(request => {
      const nearestElevator = this.findNearestAvailableElevator(request.originFloor, elevators)
      if (nearestElevator) {
        if (nearestElevator.isFull()) {
          this.clearLowPriorityRequests(nearestElevator, requests)
        }
        
        console.log(`🚑 Emergency assignment: ${request.originFloor}→${request.destinationFloor} to E${nearestElevator.id}`)
        request.assign(nearestElevator.id)
        nearestElevator.addRequest(request.originFloor)
        request.priority = 5 // Highest priority
        this.elevatorLastAssignment.set(nearestElevator.id, Date.now())
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
        const currentLoad = current.passengers?.length || 0
        const nearestLoad = nearest.passengers?.length || 0
        return currentLoad < nearestLoad ? current : nearest
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
      
      console.log(`Cleared low-priority request ${requestToRemove.originFloor}→${requestToRemove.destinationFloor} to make room`)
    }
  }

  // ENHANCED: Smart elevator positioning based on traffic patterns and load
  positionIdleElevators(elevators, numFloors) {
    const idleElevators = elevators.filter(e => e.isIdle())
    
    if (idleElevators.length === 0) return

    const hour = new Date().getHours()
    const positions = this.calculateOptimalPositions(hour, numFloors, idleElevators.length)
    
    idleElevators.forEach((elevator, index) => {
      if (index < positions.length) {
        const targetFloor = positions[index]
        const hasBeenIdle = elevator.state === 'idle' && elevator.requestQueue.length === 0
        
        // IMPROVED: Consider current system load before repositioning
        const shouldReposition = hasBeenIdle && 
                                elevator.currentFloor !== targetFloor && 
                                !this.highVolumeMode // Don't reposition during high volume

        if (shouldReposition) {
          const adjustedTarget = targetFloor + Math.floor(Math.random() * 3) - 1
          const finalTarget = Math.max(1, Math.min(numFloors, adjustedTarget))
          elevator.moveTo(finalTarget)
          console.log(`Positioning idle E${elevator.id} to floor ${finalTarget} (traffic-optimized)`)
        }
      }
    })
  }

  calculateOptimalPositions(hour, numFloors, elevatorCount) {
    const positions = []
    
    if (hour >= 8 && hour <= 10) {
      // Morning rush: concentrate near lobby
      positions.push(1)
      if (elevatorCount > 1) positions.push(Math.floor(numFloors * 0.2))
      if (elevatorCount > 2) positions.push(Math.floor(numFloors * 0.4))
      if (elevatorCount > 3) positions.push(Math.floor(numFloors * 0.6))
    } else if (hour >= 17 && hour <= 19) {
      // Evening rush: concentrate in upper floors
      const upperStart = Math.floor(numFloors * 0.7)
      for (let i = 0; i < elevatorCount; i++) {
        positions.push(Math.min(numFloors, upperStart + i * 2))
      }
    } else if (hour >= 12 && hour <= 14) {
      // Lunch time: distribute around middle floors
      const midFloor = Math.floor(numFloors / 2)
      for (let i = 0; i < elevatorCount; i++) {
        positions.push(Math.max(1, midFloor + (i - Math.floor(elevatorCount/2)) * 3))
      }
    } else {
      // Normal hours: even distribution
      for (let i = 0; i < elevatorCount; i++) {
        const position = Math.floor((i + 1) * numFloors / (elevatorCount + 1))
        positions.push(Math.max(1, position))
      }
    }
    
    // Fill remaining positions if needed
    while (positions.length < elevatorCount) {
      const randomFloor = Math.floor(Math.random() * numFloors) + 1
      if (!positions.includes(randomFloor)) {
        positions.push(randomFloor)
      }
    }
    
    return positions.slice(0, elevatorCount)
  }

  // NEW: Predictive load calculation for better assignment decisions
  updateLoadPrediction(elevatorId, request) {
    const currentLoad = this.elevatorLoadPrediction.get(elevatorId) || 0
    const requestLoad = this.calculateRequestLoad(request)
    this.elevatorLoadPrediction.set(elevatorId, currentLoad + requestLoad)
    
    // Decay prediction over time
    setTimeout(() => {
      const load = this.elevatorLoadPrediction.get(elevatorId) || 0
      this.elevatorLoadPrediction.set(elevatorId, Math.max(0, load - requestLoad))
    }, 60000) // 1 minute decay
  }

  calculateRequestLoad(request) {
    const distance = Math.abs(request.destinationFloor - request.originFloor)
    const priority = request.priority || 1
    return distance * 0.1 + priority * 0.05
  }

  // NEW: Calculate average wait time for system load detection
  calculateAverageWaitTime(requests) {
    const activeRequests = requests.filter(r => r.isActive && !r.isServed)
    if (activeRequests.length === 0) return 0
    
    const totalWaitTime = activeRequests.reduce((sum, r) => sum + (r.waitTime || 0), 0)
    return (totalWaitTime / activeRequests.length) / 1000 // Convert to seconds
  }

  getSchedulingMetrics(elevators, requests) {
    const activeRequests = requests.filter(r => r.isActive)
    const servedRequests = requests.filter(r => r.isServed)
    const starvingRequests = activeRequests.filter(r => r.waitTime > 60000)
    
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
      lastOptimization: new Date(this.lastOptimization).toISOString(),
      highVolumeMode: this.highVolumeMode
    }
  }

  calculateOverallEfficiency(elevators, servedRequests) {
    const totalDistance = elevators.reduce((sum, e) => sum + (e.totalDistance || 0), 0)
    
    if (totalDistance === 0 || servedRequests.length === 0) return 0
    
    return (servedRequests.length / totalDistance) * 100
  }
}

module.exports = HybridScheduler