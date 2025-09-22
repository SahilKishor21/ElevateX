class ScanAlgorithm {
  constructor() {
    this.name = 'SCAN'

    this.elevatorScanDirections = new Map()
    this.lastDirectionChange = new Map()
  }

  assignRequests(elevators, requests) {
    const pendingRequests = requests.filter(r => r.isActive && !r.assignedElevator)
    
    console.log(`\nSCAN: Processing ${pendingRequests.length} pending requests`)
   
    elevators.forEach(elevator => {
      if (!this.elevatorScanDirections.has(elevator.id)) {
        this.elevatorScanDirections.set(elevator.id, 'up')
        this.lastDirectionChange.set(elevator.id, Date.now())
        console.log(`SCAN: Initializing E${elevator.id} with UP scan direction`)
      }
    })

    this.updateScanDirections(elevators)

    pendingRequests.forEach(request => {
      const bestElevator = this.findBestElevatorSCAN(request, elevators)
      if (bestElevator && !bestElevator.isFull()) {
        console.log(`SCAN: Assigning request ${request.originFloor}→${request.destinationFloor} to E${bestElevator.id}`)
        request.assign(bestElevator.id)
      }
    })
  }

  findBestElevatorSCAN(request, elevators) {
    const availableElevators = elevators.filter(e => !e.maintenanceMode)
    
    if (availableElevators.length === 0) return null

    console.log(`SCAN: Finding best elevator for ${request.originFloor}→${request.destinationFloor}`)
    console.log('Available elevators:', availableElevators.map(e => 
      `E${e.id}(floor:${e.currentFloor}, scan:${this.elevatorScanDirections.get(e.id)}, state:${e.state})`
    ))

    const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down'

    // Phase 1: Find elevators that can serve this request in their current scan direction
    const compatibleElevators = availableElevators.filter(elevator => {
      return this.canServeRequestInScanDirection(elevator, request)
    })

    if (compatibleElevators.length > 0) {
      console.log(`SCAN: Found ${compatibleElevators.length} compatible elevators`)
      
      // Return the closest compatible elevator
      const closest = compatibleElevators.reduce((best, current) => {
        const bestDistance = Math.abs(best.currentFloor - request.originFloor)
        const currentDistance = Math.abs(current.currentFloor - request.originFloor)
        return currentDistance < bestDistance ? current : best
      })
      
      console.log(`SCAN: Selected compatible E${closest.id} at floor ${closest.currentFloor}`)
      return closest
    }

    // Phase 2: Find idle elevators and set their scan direction
    const idleElevators = availableElevators.filter(e => e.state === 'idle')
    if (idleElevators.length > 0) {
      console.log(`SCAN: No compatible elevators, selecting closest idle elevator`)
      
      const closest = idleElevators.reduce((best, current) => {
        const bestDistance = Math.abs(best.currentFloor - request.originFloor)
        const currentDistance = Math.abs(current.currentFloor - request.originFloor)
        return currentDistance < bestDistance ? current : best
      })

      // Set scan direction for idle elevator based on request direction
      this.elevatorScanDirections.set(closest.id, requestDirection)
      this.lastDirectionChange.set(closest.id, Date.now())
      
      console.log(`SCAN: Selected idle E${closest.id}, setting scan direction to ${requestDirection}`)
      return closest
    }

    // Phase 3: No ideal match - select closest elevator for future scan cycle
    console.log(`SCAN: Using closest available elevator for next scan cycle`)
    return availableElevators.reduce((best, current) => {
      const bestDistance = Math.abs(best.currentFloor - request.originFloor)
      const currentDistance = Math.abs(current.currentFloor - request.originFloor)
      return currentDistance < bestDistance ? current : best
    })
  }

  canServeRequestInScanDirection(elevator, request) {
    if (elevator.state === 'idle') return true

    const elevatorScanDirection = this.elevatorScanDirections.get(elevator.id)
    const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down'

    console.log(`SCAN: E${elevator.id} scan=${elevatorScanDirection}, request ${request.originFloor}→${request.destinationFloor} (${requestDirection})`)

    // SCAN algorithm: elevator can serve request if:
    // 1. Request direction matches elevator's scan direction
    // 2. Request origin is in the elevator's scan path
    
    if (elevatorScanDirection === 'up') {
      // Elevator scanning UP
      const canPickup = elevator.currentFloor <= request.originFloor
      const sameScanDirection = requestDirection === 'up'
      
      const canServe = canPickup && sameScanDirection
      console.log(`SCAN: UP scan - canPickup:${canPickup}, sameScanDir:${sameScanDirection} = ${canServe}`)
      return canServe
      
    } else if (elevatorScanDirection === 'down') {
      // Elevator scanning DOWN
      const canPickup = elevator.currentFloor >= request.originFloor
      const sameScanDirection = requestDirection === 'down'
      
      const canServe = canPickup && sameScanDirection
      console.log(`SCAN: DOWN scan - canPickup:${canPickup}, sameScanDir:${sameScanDirection} = ${canServe}`)
      return canServe
    }

    return false
  }

  updateScanDirections(elevators) {
    elevators.forEach(elevator => {
      const currentScanDirection = this.elevatorScanDirections.get(elevator.id)
      if (this.shouldReverseScanDirection(elevator, currentScanDirection)) {
        const newDirection = currentScanDirection === 'up' ? 'down' : 'up'
        this.elevatorScanDirections.set(elevator.id, newDirection)
        this.lastDirectionChange.set(elevator.id, Date.now())
        
        console.log(`SCAN: E${elevator.id} reversing from ${currentScanDirection} to ${newDirection} at floor ${elevator.currentFloor}`)
      }
    })
  }

  shouldReverseScanDirection(elevator, scanDirection) {
    const maxFloors = 15
    const lastChange = this.lastDirectionChange.get(elevator.id) || 0
    if (Date.now() - lastChange < 5000) return false

    if (scanDirection === 'up') {
      const atTopFloor = elevator.currentFloor >= maxFloors
      const noUpwardDestinations = elevator.requestQueue.length === 0 ||
                                   Math.max(...elevator.requestQueue, elevator.currentFloor) <= elevator.currentFloor
      return atTopFloor || (elevator.requestQueue.length > 0 && noUpwardDestinations)
    } else if (scanDirection === 'down') {
      const atBottomFloor = elevator.currentFloor <= 1
      const noDownwardDestinations = elevator.requestQueue.length === 0 ||
                                    Math.min(...elevator.requestQueue, elevator.currentFloor) >= elevator.currentFloor
      return atBottomFloor || (elevator.requestQueue.length > 0 && noDownwardDestinations)
    }
    return false
  }

  sortRequestQueue(elevator, queue) {
    const scanDirection = this.elevatorScanDirections.get(elevator.id)
    const currentFloor = elevator.currentFloor

    console.log(`SCAN: Sorting queue for E${elevator.id} - scan:${scanDirection}, floor:${currentFloor}, queue:[${queue.join(',')}]`)

    if (scanDirection === 'up') {
      const above = queue.filter(floor => floor > currentFloor).sort((a, b) => a - b)
      const atCurrent = queue.filter(floor => floor === currentFloor)
      const below = queue.filter(floor => floor < currentFloor).sort((a, b) => b - a)
      const sorted = [...atCurrent, ...above, ...below]
      console.log(`SCAN: UP sort result: [${sorted.join(',')}]`)
      return sorted
    } else {
      const below = queue.filter(floor => floor < currentFloor).sort((a, b) => b - a)
      const atCurrent = queue.filter(floor => floor === currentFloor)
      const above = queue.filter(floor => floor > currentFloor).sort((a, b) => a - b)
      const sorted = [...atCurrent, ...below, ...above]
      console.log(`SCAN: DOWN sort result: [${sorted.join(',')}]`)
      return sorted
    }
  }

  getMetrics(elevators, requests) {
    const servedRequests = requests.filter(r => r.isServed)
    const waitTimes = servedRequests.map(r => r.waitTime)

    return {
      algorithm: this.name,
      averageWaitTime: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
      maxWaitTime: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      totalServed: servedRequests.length,
      efficiency: this.calculateEfficiency(elevators, servedRequests),
      scanDirections: Object.fromEntries(this.elevatorScanDirections),
      directionChanges: this.getDirectionChangeCount()
    }
  }

  calculateEfficiency(elevators, servedRequests) {
    const totalDistance = elevators.reduce((sum, e) => sum + (e.totalDistance || 0), 0)
    return servedRequests.length > 0 && totalDistance > 0 ? servedRequests.length / totalDistance : 0
  }

  getDirectionChangeCount() {
    return this.elevatorScanDirections.size
  }

  resetScanDirections() {
    console.log('SCAN: Resetting all scan directions')
    this.elevatorScanDirections.clear()
    this.lastDirectionChange.clear()
  }

  getElevatorScanDirection(elevatorId) {
    return this.elevatorScanDirections.get(elevatorId) || 'up'
  }
}

module.exports = ScanAlgorithm
