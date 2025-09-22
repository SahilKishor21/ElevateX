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
    this.finalWaitTime = null
    this.starvationLevel = 'none'
    this.firstStarvationWarning = null
    this.starvationEscalations = 0
    this.thirtySecondEscalated = false
    this.emergencyPrioritySet = false
    this.starvationHistory = []
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  updateWaitTime() {
    if (!this.isServed && this.finalWaitTime === null) {
      const oldWaitTime = this.waitTime
      this.waitTime = Date.now() - this.timestamp
      this.updateStarvationStatus(oldWaitTime)
    }
  }

  updateStarvationStatus(previousWaitTime) {
    const waitSeconds = this.waitTime / 1000
    const previousWaitSeconds = previousWaitTime / 1000
    let newStarvationLevel = 'none'
    if (waitSeconds > 90) {
      newStarvationLevel = 'critical'
    } else if (waitSeconds > 60) {
      newStarvationLevel = 'severe'
    } else if (waitSeconds > 45) {
      newStarvationLevel = 'moderate'
    } else if (waitSeconds > 30) {
      newStarvationLevel = 'early'
    }
    if (newStarvationLevel !== this.starvationLevel) {
      const escalation = {
        timestamp: Date.now(),
        previousLevel: this.starvationLevel,
        newLevel: newStarvationLevel,
        waitTime: this.waitTime
      }
      this.starvationHistory.push(escalation)
      if (newStarvationLevel !== 'none') {
        console.log(`🚨 STARVATION ESCALATION: Request ${this.id} (${this.originFloor}→${this.destinationFloor}) - ${this.starvationLevel} → ${newStarvationLevel} (${waitSeconds.toFixed(1)}s)`)
        if (this.firstStarvationWarning === null && newStarvationLevel === 'early') {
          this.firstStarvationWarning = Date.now()
        }
        this.starvationEscalations++
        if ((newStarvationLevel === 'severe' || newStarvationLevel === 'critical') && !this.emergencyPrioritySet) {
          this.priority = Math.max(this.priority, 8)
          this.emergencyPrioritySet = true
          console.log(`🚑 EMERGENCY PRIORITY SET: Request ${this.id} priority raised to ${this.priority}`)
        }
      }
      this.starvationLevel = newStarvationLevel
    }
    if (waitSeconds > 30 && previousWaitSeconds <= 30 && !this.thirtySecondEscalated) {
      this.thirtySecondEscalated = true
      console.log(`⚠️ 30-SECOND ESCALATION: Request ${this.id} has exceeded assignment threshold`)
    }
  }

  calculatePriority() {
    this.updateWaitTime()
    let priorityScore = this.priority
    if (this.waitTime > 30000) {
      const escalationFactor = this.getStarvationEscalationFactor()
      priorityScore *= escalationFactor
      priorityScore += this.getStarvationPriorityBoost()
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

  getStarvationEscalationFactor() {
    const waitSeconds = this.waitTime / 1000
    switch (this.starvationLevel) {
      case 'critical': return Math.pow(5.0, (waitSeconds - 90) / 15)
      case 'severe':   return Math.pow(3.0, (waitSeconds - 60) / 10)
      case 'moderate': return Math.pow(2.0, (waitSeconds - 45) / 10)
      case 'early':    return Math.pow(1.8, (waitSeconds - 30) / 10)
      default:         return Math.pow(1.2, (waitSeconds - 15) / 10)
    }
  }

  getStarvationPriorityBoost() {
    switch (this.starvationLevel) {
      case 'critical': return 500
      case 'severe':   return 300
      case 'moderate': return 150
      case 'early':    return 75
      default:         return 0
    }
  }

  assign(elevatorId) {
    this.assignedElevator = elevatorId
    if (this.starvationLevel !== 'none') {
      const waitSeconds = this.waitTime / 1000
      console.log(`✅ STARVATION RESOLVED: Request ${this.id} assigned to E${elevatorId} after ${waitSeconds.toFixed(1)}s (${this.starvationLevel} starvation)`)
    }
  }

  serve() {
    this.isServed = true
    this.isActive = false
    this.servedAt = Date.now()
    if (this.starvationLevel !== 'none') {
      const totalWaitSeconds = (this.finalWaitTime || this.waitTime) / 1000
      console.log(`🎯 STARVED REQUEST SERVED: Request ${this.id} completed after ${totalWaitSeconds.toFixed(1)}s total wait (${this.starvationLevel} level)`)
    }
  }

  getTravelTime() {
    if (!this.servedAt) return 0
    return this.servedAt - this.createdAt
  }

  isStarving() {
    this.updateWaitTime()
    return this.starvationLevel !== 'none' && this.waitTime > 60000
  }

  isCriticallyStarving() {
    return this.starvationLevel === 'critical' || this.waitTime > 90000
  }

  getStarvationInfo() {
    return {
      level: this.starvationLevel,
      waitSeconds: this.waitTime / 1000,
      escalations: this.starvationEscalations,
      thirtySecondEscalated: this.thirtySecondEscalated,
      emergencyPriority: this.emergencyPrioritySet,
      firstWarning: this.firstStarvationWarning,
      history: this.starvationHistory
    }
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
      waitTime: this.finalWaitTime !== null ? this.finalWaitTime : this.waitTime,
      assignedElevator: this.assignedElevator,
      isActive: this.isActive,
      isServed: this.isServed,
      passengerCount: this.passengerCount,
      starvationLevel: this.starvationLevel,
      isStarving: this.isStarving(),
      starvationInfo: this.getStarvationInfo()
    }
  }
}

module.exports = Request
