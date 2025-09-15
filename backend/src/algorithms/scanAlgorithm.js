class ScanAlgorithm {
  constructor() {
    this.name = 'SCAN'
  }

  assignRequests(elevators, requests) {
    const pendingRequests = requests.filter(r => r.isActive && !r.assignedElevator)
    
    // Sort elevators by current floor
    const sortedElevators = [...elevators].sort((a, b) => a.currentFloor - b.currentFloor)
    
    pendingRequests.forEach(request => {
      const bestElevator = this.findBestElevatorSCAN(request, sortedElevators)
      if (bestElevator && !bestElevator.isFull()) {
        request.assign(bestElevator.id)
        bestElevator.addRequest(request.originFloor)
        if (request.destinationFloor) {
          bestElevator.addRequest(request.destinationFloor)
        }
      }
    })
  }

  findBestElevatorSCAN(request, elevators) {
    const availableElevators = elevators.filter(e => !e.maintenanceMode)
    
    if (availableElevators.length === 0) return null

    // Find elevator moving in the same direction and can serve the request
    const sameDirectionElevators = availableElevators.filter(elevator => {
      if (elevator.state === 'idle') return true
      
      const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down'
      
      if (elevator.direction === requestDirection) {
        if (requestDirection === 'up') {
          return elevator.currentFloor <= request.originFloor
        } else {
          return elevator.currentFloor >= request.originFloor
        }
      }
      
      return false
    })

    if (sameDirectionElevators.length > 0) {
      // Return closest elevator in same direction
      return sameDirectionElevators.reduce((closest, current) => {
        const closestDistance = Math.abs(closest.currentFloor - request.originFloor)
        const currentDistance = Math.abs(current.currentFloor - request.originFloor)
        return currentDistance < closestDistance ? current : closest
      })
    }

    // If no same direction elevator, return closest idle elevator
    const idleElevators = availableElevators.filter(e => e.state === 'idle')
    if (idleElevators.length > 0) {
      return idleElevators.reduce((closest, current) => {
        const closestDistance = Math.abs(closest.currentFloor - request.originFloor)
        const currentDistance = Math.abs(current.currentFloor - request.originFloor)
        return currentDistance < closestDistance ? current : closest
      })
    }

    // Last resort: return closest available elevator
    return availableElevators.reduce((closest, current) => {
      const closestDistance = Math.abs(closest.currentFloor - request.originFloor)
      const currentDistance = Math.abs(current.currentFloor - request.originFloor)
      return currentDistance < closestDistance ? current : closest
    })
  }

  getMetrics(elevators, requests) {
    const servedRequests = requests.filter(r => r.isServed)
    const waitTimes = servedRequests.map(r => r.waitTime)
    
    return {
      algorithm: this.name,
      averageWaitTime: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
      maxWaitTime: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      totalServed: servedRequests.length,
      efficiency: this.calculateEfficiency(elevators, servedRequests)
    }
  }

  calculateEfficiency(elevators, servedRequests) {
    const totalDistance = elevators.reduce((sum, e) => sum + e.totalDistance, 0)
    return servedRequests.length > 0 ? servedRequests.length / totalDistance : 0
  }
}

module.exports = ScanAlgorithm