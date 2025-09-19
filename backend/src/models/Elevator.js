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
    this.speed = 1 // Store speed multiplier
    
    // FIXED: Track utilization time properly
    this.activeTime = 0
    this.totalOperationTime = 0
    this.lastStateChange = Date.now()
  }

  // Method to update speed
  setSpeed(speed) {
    this.speed = speed || 1
    console.log(`Elevator ${this.id} speed set to ${this.speed}x`)
  }

  moveTo(floor) {
    if (this.maintenanceMode || this.state === 'loading') return false
    
    // FIXED: Track state change for utilization
    this.updateUtilizationTracking()
    
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
  
  // Apply speed multiplier to movement timing
  const moveInterval = 2000 / (this.speed || 1)
  const loadingInterval = 3000 / (this.speed || 1)
  
  if (this.maintenanceMode) {
    this.state = 'maintenance'
    return
  }
  
  switch (this.state) {
    case 'moving_up':
    case 'moving_down':
      if (now - this.lastMoveTime >= moveInterval) {
        this.currentFloor += this.direction === 'up' ? 1 : -1
        this.totalDistance = (this.totalDistance || 0) + 1
        this.lastMoveTime = now
        
        if (this.currentFloor === this.targetFloor) {
          this.updateUtilizationTracking()
          this.state = 'loading'
          this.doorOpen = true
          this.doorOpenTime = now
          this.loadingStartTime = now
          this.totalTrips = (this.totalTrips || 0) + 1
        }
      }
      break
      
    case 'loading':
      if (now - this.loadingStartTime >= loadingInterval) {
        this.updateUtilizationTracking()
        this.state = 'idle'
        this.doorOpen = false
        this.doorOpenTime = null
        this.loadingStartTime = null
        this.targetFloor = null
        
        // Only set direction to idle if truly no requests
        if (!Array.isArray(this.requestQueue) || this.requestQueue.length === 0) {
          this.direction = 'idle'
        }
      }
      break
      
    case 'idle':
      // FIX: Only process queue if it has valid destinations
      if (Array.isArray(this.requestQueue) && this.requestQueue.length > 0) {
        const nextFloor = this.requestQueue[0]
        
        // Remove and skip if already at this floor
        if (nextFloor === this.currentFloor) {
          this.requestQueue.shift()
        } else if (nextFloor && typeof nextFloor === 'number') {
          // Only move if valid floor number
          this.requestQueue.shift()
          this.moveTo(nextFloor)
        } else {
          // Invalid entry, remove it
          this.requestQueue.shift()
        }
      }
      // Don't do anything else when idle
      break
      
    case 'maintenance':
      this.requestQueue = []
      this.passengers = []
      this.targetFloor = null
      this.direction = 'idle'
      break
  }
}

  // FIXED: Track utilization time when state changes
  updateUtilizationTracking() {
    const now = Date.now()
    const timeSinceLastChange = now - this.lastStateChange
    
    // If elevator was active (not idle), add to active time
    if (this.state !== 'idle' && this.state !== 'maintenance') {
      this.activeTime += timeSinceLastChange
    }
    
    this.totalOperationTime += timeSinceLastChange
    this.lastStateChange = now
  }

  addRequest(floor) {
    // Validate input
    if (typeof floor !== 'number' || floor < 1 || this.maintenanceMode) {
      return false
    }
    
    // Don't add request for current floor
    if (floor === this.currentFloor) {
      return false
    }
    
    // Initialize requestQueue if needed
    if (!Array.isArray(this.requestQueue)) {
      this.requestQueue = []
    }
    
    // Don't add duplicate requests
    if (!this.requestQueue.includes(floor)) {
      this.requestQueue.push(floor)
      
      // Sort queue based on current direction and position
      this.requestQueue.sort((a, b) => {
        if (this.direction === 'up') return a - b
        else if (this.direction === 'down') return b - a
        return Math.abs(a - this.currentFloor) - Math.abs(b - this.currentFloor)
      })
      
      console.log(`E${this.id}: Added floor ${floor} to queue. Current queue: [${this.requestQueue.join(', ')}]`)
      return true
    }
    
    return false
  }

  addPassenger(passenger) {
    if (this.passengers.length < this.capacity) {
      this.passengers.push(passenger)
      this.addRequest(passenger.destinationFloor)
      return true
    }
    return false
  }

  removePassenger(passengerId) {
    const index = this.passengers.findIndex(p => p.id === passengerId)
    if (index !== -1) return this.passengers.splice(index, 1)[0]
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

  // FIXED: Correct utilization calculation - binary for system metrics
  getUtilization() {
    // For system utilization calculations, return binary value
    // 1 = elevator is active (moving, loading, or has pending work)
    // 0 = elevator is truly idle
    
    const isActive = this.state !== 'idle' || 
                    this.requestQueue.length > 0 || 
                    this.passengers.length > 0 ||
                    this.maintenanceMode
    
    console.log(`E${this.id} utilization: ${isActive ? 1 : 0} (state: ${this.state}, queue: ${this.requestQueue.length}, passengers: ${this.passengers.length})`)
    
    return isActive ? 1 : 0
  }

  // ENHANCED: Detailed utilization for advanced metrics
  getDetailedUtilization() {
    this.updateUtilizationTracking()
    
    const timeBasedUtilization = this.totalOperationTime > 0 ? 
      (this.activeTime / this.totalOperationTime) * 100 : 0
    
    const capacityUtilization = (this.passengers.length / this.capacity) * 100
    const workloadUtilization = this.requestQueue.length
    const currentStateUtilization = this.getUtilization() * 100
    
    return {
      timeBasedUtilization,
      capacityUtilization,
      workloadUtilization,
      currentStateUtilization,
      combinedUtilization: currentStateUtilization // Use current state for real-time metrics
    }
  }

  setMaintenance(maintenance) {
    this.updateUtilizationTracking()
    this.maintenanceMode = maintenance
    if (maintenance) {
      this.state = 'maintenance'
      this.requestQueue = []
      this.passengers = []
    }
  }

  getStatus() {
    // Ensure passengers array is always valid
    const validPassengers = Array.isArray(this.passengers) ? this.passengers : []
    
    // Ensure requestQueue array is always valid
    const validRequestQueue = Array.isArray(this.requestQueue) ? this.requestQueue : []
    
    // Calculate accurate load and utilization
    const currentLoad = this.capacity > 0 ? validPassengers.length / this.capacity : 0
    const utilization = this.getUtilization() // Use fixed utilization
    const detailedUtil = this.getDetailedUtilization()
    
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      targetFloor: this.targetFloor,
      state: this.state,
      direction: this.direction,
      passengers: validPassengers, // Always return valid array
      capacity: this.capacity,
      doorOpen: this.doorOpen,
      requestQueue: [...validRequestQueue], // Return copy to prevent mutation
      totalDistance: this.totalDistance || 0,
      totalTrips: this.totalTrips || 0,
      maintenanceMode: this.maintenanceMode || false,
      color: this.color || '#3b82f6',
      load: Math.min(1, Math.max(0, currentLoad)), // Clamp between 0-1
      utilization: utilization, // FIXED: Use binary utilization for system calculations
      // ENHANCED: Detailed metrics for assignment requirements
      utilizationMetrics: detailedUtil,
      // Additional debug info for frontend accuracy
      passengerCount: validPassengers.length,
      queueLength: validRequestQueue.length,
      isMoving: this.state === 'moving_up' || this.state === 'moving_down',
      isIdle: this.state === 'idle' && validRequestQueue.length === 0,
      timestamp: Date.now() 
    }
  }
}

module.exports = Elevator