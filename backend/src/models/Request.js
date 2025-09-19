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
    // FIXED: Add finalWaitTime to prevent further updates after serving
    this.finalWaitTime = null
    
    // STARVATION FIX: Add starvation tracking properties
    this.starvationLevel = 'none' // none, early, moderate, severe, critical
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
    // FIXED: Don't update wait time if request has been served or if finalWaitTime is already captured
    if (!this.isServed && this.finalWaitTime === null) {
      const oldWaitTime = this.waitTime
      this.waitTime = Date.now() - this.timestamp
      
      // STARVATION FIX: Update starvation status when wait time changes
      this.updateStarvationStatus(oldWaitTime)
    }
  }

  // STARVATION FIX: Monitor and escalate starvation levels
  updateStarvationStatus(previousWaitTime) {
    const waitSeconds = this.waitTime / 1000
    const previousWaitSeconds = previousWaitTime / 1000
    let newStarvationLevel = 'none'
    
    // Determine current starvation level
    if (waitSeconds > 90) {
      newStarvationLevel = 'critical' // 1.5 minutes - immediate emergency action
    } else if (waitSeconds > 60) {
      newStarvationLevel = 'severe'   // 1 minute - assignment requirement violated
    } else if (waitSeconds > 45) {
      newStarvationLevel = 'moderate' // 45 seconds - preventive escalation  
    } else if (waitSeconds > 30) {
      newStarvationLevel = 'early'    // 30 seconds - assignment escalation point
    }
    
    // Track escalations and log significant changes
    if (newStarvationLevel !== this.starvationLevel) {
      const escalation = {
        timestamp: Date.now(),
        previousLevel: this.starvationLevel,
        newLevel: newStarvationLevel,
        waitTime: this.waitTime
      }
      
      this.starvationHistory.push(escalation)
      
      // Log starvation level changes
      if (newStarvationLevel !== 'none') {
        console.log(`🚨 STARVATION ESCALATION: Request ${this.id} (${this.originFloor}→${this.destinationFloor}) - ${this.starvationLevel} → ${newStarvationLevel} (${waitSeconds.toFixed(1)}s)`)
        
        // Track first starvation warning
        if (this.firstStarvationWarning === null && newStarvationLevel === 'early') {
          this.firstStarvationWarning = Date.now()
        }
        
        this.starvationEscalations++
        
        // Set emergency priority for severe/critical starvation
        if ((newStarvationLevel === 'severe' || newStarvationLevel === 'critical') && !this.emergencyPrioritySet) {
          this.priority = Math.max(this.priority, 8) // Set high emergency priority
          this.emergencyPrioritySet = true
          console.log(`🚑 EMERGENCY PRIORITY SET: Request ${this.id} priority raised to ${this.priority}`)
        }
      }
      
      this.starvationLevel = newStarvationLevel
    }
    
    // ASSIGNMENT REQUIREMENT: Track 30-second escalations
    if (waitSeconds > 30 && previousWaitSeconds <= 30 && !this.thirtySecondEscalated) {
      this.thirtySecondEscalated = true
      console.log(`⚠️ 30-SECOND ESCALATION: Request ${this.id} has exceeded assignment threshold`)
    }
  }

  calculatePriority() {
    this.updateWaitTime()
    let priorityScore = this.priority
    
    // STARVATION FIX: More aggressive priority escalation
    if (this.waitTime > 30000) {
      const escalationFactor = this.getStarvationEscalationFactor()
      priorityScore *= escalationFactor
      
      // Additional starvation-based priority boost
      priorityScore += this.getStarvationPriorityBoost()
    }
    
    const hour = new Date().getHours()
    
    // ASSIGNMENT REQUIREMENT: Morning rush lobby-to-upper priority
    if (hour >= 8 && hour <= 10 && this.originFloor === 1 && this.destinationFloor > 5) {
      priorityScore *= 2.0
    }
    
    // Evening rush upper-to-lobby priority  
    if (hour >= 17 && hour <= 19 && this.originFloor > 5 && this.destinationFloor === 1) {
      priorityScore *= 1.5
    }
    
    return priorityScore
  }

  // STARVATION FIX: Calculate escalation factor based on starvation level
  getStarvationEscalationFactor() {
    const waitSeconds = this.waitTime / 1000
    
    switch (this.starvationLevel) {
      case 'critical': return Math.pow(5.0, (waitSeconds - 90) / 15)  // Exponential after 90s
      case 'severe':   return Math.pow(3.0, (waitSeconds - 60) / 10)  // Exponential after 60s
      case 'moderate': return Math.pow(2.0, (waitSeconds - 45) / 10)  // Exponential after 45s
      case 'early':    return Math.pow(1.8, (waitSeconds - 30) / 10)  // Assignment requirement
      default:         return Math.pow(1.2, (waitSeconds - 15) / 10)  // Gradual increase
    }
  }

  // STARVATION FIX: Additional priority boost for starving requests
  getStarvationPriorityBoost() {
    switch (this.starvationLevel) {
      case 'critical': return 500  // Maximum boost for critical starvation
      case 'severe':   return 300  // Very high boost for severe starvation
      case 'moderate': return 150  // High boost for moderate starvation
      case 'early':    return 75   // Moderate boost for early warning
      default:         return 0
    }
  }

  assign(elevatorId) {
    this.assignedElevator = elevatorId
    
    // STARVATION FIX: Log successful assignment for starving requests
    if (this.starvationLevel !== 'none') {
      const waitSeconds = this.waitTime / 1000
      console.log(`✅ STARVATION RESOLVED: Request ${this.id} assigned to E${elevatorId} after ${waitSeconds.toFixed(1)}s (${this.starvationLevel} starvation)`)
    }
  }

  serve() {
    this.isServed = true
    this.isActive = false
    this.servedAt = Date.now()
    
    // STARVATION FIX: Log service completion for monitoring
    if (this.starvationLevel !== 'none') {
      const totalWaitSeconds = (this.finalWaitTime || this.waitTime) / 1000
      console.log(`🎯 STARVED REQUEST SERVED: Request ${this.id} completed after ${totalWaitSeconds.toFixed(1)}s total wait (${this.starvationLevel} level)`)
    }
  }

  getTravelTime() {
    if (!this.servedAt) return 0
    return this.servedAt - this.createdAt
  }

  // STARVATION FIX: Enhanced starvation detection
  isStarving() {
    this.updateWaitTime()
    return this.starvationLevel !== 'none' && this.waitTime > 60000 // Assignment violation at 60 seconds
  }

  // STARVATION FIX: Check if request is in critical starvation state
  isCriticallyStarving() {
    return this.starvationLevel === 'critical' || this.waitTime > 90000
  }

  // STARVATION FIX: Get detailed starvation info
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
      waitTime: this.finalWaitTime !== null ? this.finalWaitTime : this.waitTime, // Use finalWaitTime if available
      assignedElevator: this.assignedElevator,
      isActive: this.isActive,
      isServed: this.isServed,
      passengerCount: this.passengerCount,
      // STARVATION FIX: Include starvation information in status
      starvationLevel: this.starvationLevel,
      isStarving: this.isStarving(),
      starvationInfo: this.getStarvationInfo()
    }
  }
}

module.exports = Request