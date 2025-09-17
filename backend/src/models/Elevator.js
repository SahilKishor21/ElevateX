class Elevator {
  constructor(id, capacity = 8, color = '#3b82f6') {
    this.id = id
    this.currentFloor = 1
    this.targetFloor = null
    this.state = 'idle'
    this.direction = 'idle'
    this.passengers = []
    this.capacity = capacity
    this.doorOpen = false
    this.requestQueue = []
    this.lastMoveTime = Date.now()
    this.totalDistance = 0
    this.totalTrips = 0
    this.maintenanceMode = false
    this.color = color
    this.loadingStartTime = null
    this.doorOpenTime = null
  }

  moveTo(floor) {
    if (this.maintenanceMode || this.state === 'loading') return false

    this.targetFloor = floor
    if (floor > this.currentFloor) {
      this.direction = 'up'
      this.state = 'moving_up'
    } else if (floor < this.currentFloor) {
      this.direction = 'down'
      this.state = 'moving_down'
    } else {
      this.state = 'idle'
      this.direction = 'idle'
      return true
    }

    return true
  }

  update(deltaTime) {
    const now = Date.now()

    switch (this.state) {
      case 'moving_up':
      case 'moving_down':
        if (now - this.lastMoveTime >= 2000) {
          this.currentFloor += this.direction === 'up' ? 1 : -1
          this.totalDistance++
          this.lastMoveTime = now

          if (this.currentFloor === this.targetFloor) {
            this.state = 'loading'
            this.direction = 'idle'
            this.doorOpen = true
            this.doorOpenTime = now
            this.loadingStartTime = now
            this.totalTrips++
          }
        }
        break

      case 'loading':
        if (now - this.loadingStartTime >= 3000) {
          this.state = 'idle'
          this.doorOpen = false
          this.doorOpenTime = null
          this.loadingStartTime = null
          this.targetFloor = null
        }
        break

      case 'idle':
        // CRITICAL FIX: Only process queue if no current target and not already moving
        if (this.requestQueue.length > 0 && !this.targetFloor) {
          const nextFloor = this.getNextFloorFromQueue()
          if (nextFloor && nextFloor !== this.currentFloor) {
            console.log(`E${this.id}: Moving from queue to floor ${nextFloor}`)
            this.moveTo(nextFloor)
          }
        }
        break
    }
  }

  // CRITICAL FIX: Smarter queue processing
  getNextFloorFromQueue() {
    if (this.requestQueue.length === 0) return null

    // Remove current floor from queue if present
    this.requestQueue = this.requestQueue.filter(floor => floor !== this.currentFloor)
    
    if (this.requestQueue.length === 0) return null

    // Get the next floor based on current direction or closest
    let nextFloor
    
    if (this.direction === 'up') {
      // Continue up if possible
      const upFloors = this.requestQueue.filter(floor => floor > this.currentFloor)
      if (upFloors.length > 0) {
        nextFloor = Math.min(...upFloors)
      } else {
        // No more up floors, go to highest down floor
        nextFloor = Math.max(...this.requestQueue)
      }
    } else if (this.direction === 'down') {
      // Continue down if possible
      const downFloors = this.requestQueue.filter(floor => floor < this.currentFloor)
      if (downFloors.length > 0) {
        nextFloor = Math.max(...downFloors)
      } else {
        // No more down floors, go to lowest up floor
        nextFloor = Math.min(...this.requestQueue)
      }
    } else {
      // Idle - go to closest floor
      nextFloor = this.requestQueue.reduce((closest, floor) => {
        return Math.abs(floor - this.currentFloor) < Math.abs(closest - this.currentFloor) 
          ? floor : closest
      })
    }

    // Remove the selected floor from queue
    const floorIndex = this.requestQueue.indexOf(nextFloor)
    if (floorIndex !== -1) {
      this.requestQueue.splice(floorIndex, 1)
    }

    return nextFloor
  }

  // CRITICAL FIX: Better request adding with immediate action
  addRequest(floor) {
    if (floor === this.currentFloor) {
      console.log(`E${this.id}: Ignoring request for current floor ${floor}`)
      return // Don't add request for current floor
    }

    if (!this.requestQueue.includes(floor)) {
      console.log(`E${this.id}: Adding request for floor ${floor}`)
      this.requestQueue.push(floor)
      
      // CRITICAL FIX: If idle and no target, immediately start moving
      if (this.state === 'idle' && !this.targetFloor) {
        const nextFloor = this.getNextFloorFromQueue()
        if (nextFloor) {
          console.log(`E${this.id}: Immediately moving to floor ${nextFloor}`)
          this.moveTo(nextFloor)
        }
      }
    }
  }

  addPassenger(passenger) {
    if (this.passengers.length < this.capacity) {
      this.passengers.push(passenger)
      this.addRequest(passenger.destinationFloor)
      return true
    }
    return false
  }

  // IMPROVED: Better random passenger generation with realistic data
  addSimulatedPassenger() {
    if (this.passengers.length >= this.capacity) return false

    // Generate realistic destinations based on current floor
    let destinationFloor
    if (this.currentFloor === 1) {
      // From lobby, go to upper floors
      destinationFloor = Math.floor(Math.random() * 10) + 2 // Floors 2-11
    } else if (this.currentFloor > 10) {
      // From upper floors, likely go to lobby or nearby floors
      if (Math.random() < 0.6) {
        destinationFloor = 1 // 60% chance to lobby
      } else {
        destinationFloor = Math.floor(Math.random() * 15) + 1
      }
    } else {
      // From middle floors, random destination
      destinationFloor = Math.floor(Math.random() * 15) + 1
    }

    // Ensure destination is different from origin
    while (destinationFloor === this.currentFloor) {
      destinationFloor = Math.floor(Math.random() * 15) + 1
    }

    const passenger = {
      id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      originFloor: this.currentFloor,
      destinationFloor: destinationFloor,
      boardTime: Date.now(),
      waitTime: 0,
      priority: 1,
      isRealRequest: false // Mark as simulated
    }

    this.passengers.push(passenger)
    this.addRequest(passenger.destinationFloor)
    return true
  }

  removePassenger(passengerId) {
    const index = this.passengers.findIndex(p => p.id === passengerId)
    if (index !== -1) {
      const removed = this.passengers.splice(index, 1)[0]
      console.log(`Passenger removed: ${removed.isRealRequest ? 'REAL' : 'SIM'} - ${removed.id}`)
      return removed
    }
    return null
  }

  getPassengersForFloor(floor) {
    return this.passengers.filter(p => p.destinationFloor === floor)
  }

  isIdle() {
    return this.state === 'idle' && this.requestQueue.length === 0 && !this.targetFloor
  }

  isFull() {
    return this.passengers.length >= this.capacity
  }

  getLoad() {
    return this.passengers.length / this.capacity
  }

  getUtilization() {
    return this.state !== 'idle' ? 1 : 0
  }

  setMaintenance(maintenance) {
    this.maintenanceMode = maintenance
    if (maintenance) {
      this.state = 'maintenance'
      this.requestQueue = []
      this.passengers = []
    }
  }

  // ENHANCED: Better status reporting with passenger details
  getStatus() {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      targetFloor: this.targetFloor,
      state: this.state,
      direction: this.direction,
      passengers: this.passengers,
      capacity: this.capacity,
      doorOpen: this.doorOpen,
      requestQueue: [...this.requestQueue], // Copy to prevent mutation
      totalDistance: this.totalDistance,
      totalTrips: this.totalTrips,
      maintenanceMode: this.maintenanceMode,
      color: this.color,
      load: this.getLoad(),
      utilization: this.getUtilization(),
      // NEW: Enhanced debug info
      passengerCount: this.passengers.length,
      realPassengers: this.passengers.filter(p => p.isRealRequest).length,
      simPassengers: this.passengers.filter(p => !p.isRealRequest).length,
      queueLength: this.requestQueue.length
    }
  }
}

module.exports = Elevator