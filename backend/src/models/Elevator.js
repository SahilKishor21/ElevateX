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
        if (this.requestQueue.length > 0) {
          const nextFloor = this.requestQueue.shift()
          this.moveTo(nextFloor)
        }
        break
    }
  }

  addRequest(floor) {
    if (!this.requestQueue.includes(floor) && floor !== this.currentFloor) {
      this.requestQueue.push(floor)
      this.requestQueue.sort((a, b) => {
        if (this.direction === 'up') {
          return a - b
        } else if (this.direction === 'down') {
          return b - a
        }
        return Math.abs(a - this.currentFloor) - Math.abs(b - this.currentFloor)
      })
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

  addSimulatedPassenger() {
    if (this.passengers.length >= this.capacity) return false

    const passenger = {
      id: `passenger_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      originFloor: this.currentFloor,
      destinationFloor: Math.floor(Math.random() * 15) + 1,
      boardTime: Date.now(),
      waitTime: 0,
      priority: 1
    }

    // Ensure destination is different from origin
    while (passenger.destinationFloor === passenger.originFloor) {
      passenger.destinationFloor = Math.floor(Math.random() * 15) + 1
    }

    this.passengers.push(passenger)
    this.addRequest(passenger.destinationFloor)
    return true
  }

  removePassenger(passengerId) {
    const index = this.passengers.findIndex(p => p.id === passengerId)
    if (index !== -1) {
      return this.passengers.splice(index, 1)[0]
    }
    return null
  }

  getPassengersForFloor(floor) {
    return this.passengers.filter(p => p.destinationFloor === floor)
  }

  isIdle() {
    return this.state === 'idle' && this.requestQueue.length === 0
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
      requestQueue: this.requestQueue,
      totalDistance: this.totalDistance,
      totalTrips: this.totalTrips,
      maintenanceMode: this.maintenanceMode,
      color: this.color,
      load: this.getLoad(),
      utilization: this.getUtilization()
    }
  }
}

module.exports = Elevator