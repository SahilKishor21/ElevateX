class Request {
  constructor(data) {
    this.id = data.id || this.generateId()
    this.type = data.type || 'floor_call'
    this.originFloor = data.originFloor
    this.destinationFloor = data.destinationFloor || null
    this.direction = data.direction || null
    this.timestamp = data.timestamp || Date.now()
    this.priority = data.priority || 2
    this.waitTime = 0
    this.assignedElevator = null
    this.isActive = true
    this.isServed = false
    this.passengerCount = data.passengerCount || 1
    this.createdAt = Date.now()
    this.servedAt = null
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  updateWaitTime() {
    this.waitTime = Date.now() - this.timestamp
  }

  calculatePriority() {
    this.updateWaitTime()
    let priorityScore = this.priority
    if (this.waitTime > 30000) {
      priorityScore *= Math.pow(1.8, (this.waitTime - 30000) / 10000)
    }
    const hour = new Date().getHours()
    if (hour >= 8 && hour <= 10 && this.originFloor === 1 && this.destinationFloor > 5) {
      priorityScore *= 2.0
    }
    if (hour >= 17 && hour <= 19 && this.originFloor > 5 && this.destinationFloor === 1) {
      priorityScore *= 1.5
    }
    return priorityScore
  }

  assign(elevatorId) {
    this.assignedElevator = elevatorId
  }

  serve() {
    this.isServed = true
    this.isActive = false
    this.servedAt = Date.now()
  }

  getTravelTime() {
    if (!this.servedAt) return 0
    return this.servedAt - this.createdAt
  }

  isStarving() {
    this.updateWaitTime()
    return this.waitTime > 60000
  }

  getStatus() {
    this.updateWaitTime()
    let dir = this.direction
    if (!dir && this.destinationFloor) {
      dir = this.destinationFloor > this.originFloor ? 'up' : 'down'
    }
    return {
      id: this.id,
      type: this.type,
      originFloor: this.originFloor,
      destinationFloor: this.destinationFloor,
      direction: dir,
      timestamp: this.timestamp,
      priority: this.calculatePriority(),
      waitTime: this.waitTime,
      assignedElevator: this.assignedElevator,
      isActive: this.isActive,
      isServed: this.isServed,
      passengerCount: this.passengerCount
    }
  }
}

module.exports = Request