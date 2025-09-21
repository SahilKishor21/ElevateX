class FixedHybridScheduler {
  constructor() {
    this.name = 'Fixed Hybrid Scheduler';
    this.assignmentMap = new Map(); // Track all assignments
    this.lastAssignmentTime = new Map();
  }

 optimizeRoutes(elevators, requests) {
  const now = Date.now();

  // REMOVED: All throttling - process immediately
  console.log(`HybridScheduler: Processing ${requests.length} total requests`);

  // Update wait times for ALL requests immediately
  requests.forEach((request) => {
    if (typeof request.updateWaitTime === "function") {
      request.updateWaitTime();
    }
  });

  // Get ALL unserved requests that need assignment
  const unassignedRequests = [];
  
  requests.forEach(request => {
    if (!request.isActive || request.isServed) return;
    
    // Check if assignment is valid
    let needsAssignment = false;
    
    if (request.assignedElevator === null || request.assignedElevator === undefined) {
      needsAssignment = true;
    } else {
      // Validate existing assignment
      const elevator = elevators[request.assignedElevator];
      if (!elevator || elevator.maintenanceMode) {
        needsAssignment = true;
        request.assignedElevator = null;
      } else {
        // Check if elevator actually has this request
        const hasInQueue = elevator.requestQueue && elevator.requestQueue.includes(request.originFloor);
        const isAtFloor = elevator.currentFloor === request.originFloor && elevator.state === 'loading';
        
        if (!hasInQueue && !isAtFloor) {
          console.log(`BROKEN ASSIGNMENT: Request ${request.id} thinks it's assigned to E${request.assignedElevator} but elevator doesn't have it`);
          needsAssignment = true;
          request.assignedElevator = null;
        }
      }
    }
    
    if (needsAssignment) {
      unassignedRequests.push(request);
    }
  });

  if (unassignedRequests.length === 0) {
    this.forceElevatorMovement(elevators);
    return;
  }

  console.log(`HybridScheduler: IMMEDIATE ASSIGNMENT of ${unassignedRequests.length} requests`);

  // CRITICAL: Immediate assignment with no delays
  this.assignRequestsImmediately(unassignedRequests, elevators);

  // Force elevators to start moving
  this.forceElevatorMovement(elevators);
}


  getUnassignedRequests(requests, elevators) {
    const unassigned = [];
    
    requests.forEach(request => {
      if (!request.isActive || request.isServed) return;
      
      const hasValidAssignment = this.validateAssignment(request, elevators);
      
      if (!hasValidAssignment) {
        // Clear bad assignment
        if (request.assignedElevator !== null) {
          console.log(`Clearing bad assignment for request ${request.id}`);
          request.assignedElevator = null;
        }
        unassigned.push(request);
      }
    });

    return unassigned;
  }

  validateAssignment(request, elevators) {
    if (request.assignedElevator === null || request.assignedElevator === undefined) {
      return false;
    }

    const elevator = elevators[request.assignedElevator];
    if (!elevator || elevator.maintenanceMode) {
      return false;
    }

    // Check if elevator actually has this request
    const hasOriginFloor = elevator.requestQueue && elevator.requestQueue.includes(request.originFloor);
    const isAtOriginFloor = elevator.currentFloor === request.originFloor && elevator.state === 'loading';
    
    return hasOriginFloor || isAtOriginFloor;
  }

  assignRequestsImmediately(requests, elevators) {
    const availableElevators = elevators.filter(e => !e.maintenanceMode);
    
    if (availableElevators.length === 0) {
      console.error('No available elevators!');
      return;
    }

    // Sort requests by urgency (wait time)
    requests.sort((a, b) => b.waitTime - a.waitTime);

    requests.forEach(request => {
      const bestElevator = this.findBestElevatorSimple(request, availableElevators);
      
      if (bestElevator) {
        this.performImmediateAssignment(request, bestElevator);
      } else {
        console.warn(`No elevator available for request ${request.id}`);
      }
    });
  }

  assignRequestsImmediately(requests, elevators) {
  const availableElevators = elevators.filter(e => !e.maintenanceMode);
  
  if (availableElevators.length === 0) return;

  // Sort by urgency (wait time) - most urgent first
  requests.sort((a, b) => b.waitTime - a.waitTime);

  requests.forEach(request => {
    const elevator = this.findBestElevatorSimple(request, availableElevators);
    
    if (elevator) {
      console.log(`IMMEDIATE: Assigning ${request.originFloor}â†’${request.destinationFloor} to E${elevator.id} (waited ${(request.waitTime/1000).toFixed(1)}s)`);
      
      // CRITICAL: Immediate assignment
      request.assignedElevator = elevator.id;
      request.assign(elevator.id);
      
      // Add floors to elevator queue
      if (!elevator.requestQueue.includes(request.originFloor)) {
        elevator.requestQueue.push(request.originFloor);
      }
      if (request.destinationFloor && !elevator.requestQueue.includes(request.destinationFloor)) {
        elevator.requestQueue.push(request.destinationFloor);
      }
      
      // Simple queue optimization
      this.optimizeElevatorQueueSimple(elevator);
    } else {
      console.error(`NO ELEVATOR AVAILABLE for request ${request.id}`);
    }
  });
}

findBestElevatorSimple(request, elevators) {
  let bestElevator = null;
  let bestScore = Infinity;

  elevators.forEach(elevator => {
    if (elevator.isFull()) return;

    // Simple scoring: distance + queue penalty
    const distance = Math.abs(elevator.currentFloor - request.originFloor);
    const queuePenalty = (elevator.requestQueue?.length || 0) * 3;
    const passengerPenalty = (elevator.passengers?.length || 0) * 2;
    
    // Prefer idle elevators
    const idleBonus = elevator.state === 'idle' ? -20 : 0;
    
    // Emergency bonus for starving requests
    const emergencyBonus = request.waitTime > 60000 ? -50 : 0;
    
    const score = distance + queuePenalty + passengerPenalty + idleBonus + emergencyBonus;
    
    if (score < bestScore) {
      bestScore = score;
      bestElevator = elevator;
    }
  });

  return bestElevator;
}

// ADD this new method to hybridScheduler.js:
optimizeElevatorQueueSimple(elevator) {
  if (!elevator.requestQueue || elevator.requestQueue.length <= 1) return;

  const currentFloor = elevator.currentFloor;
  
  // Simple optimization: sort by distance if idle, by direction if moving
  if (elevator.state === 'idle') {
    elevator.requestQueue.sort((a, b) => 
      Math.abs(a - currentFloor) - Math.abs(b - currentFloor)
    );
  } else if (elevator.direction === 'up') {
    elevator.requestQueue.sort((a, b) => a - b);
  } else if (elevator.direction === 'down') {
    elevator.requestQueue.sort((a, b) => b - a);
  }
}

// ADD this new method to hybridScheduler.js:
forceElevatorMovement(elevators) {
  elevators.forEach(elevator => {
    if (elevator.maintenanceMode) return;

    // If idle with requests, start moving immediately
    if (elevator.state === 'idle' && elevator.requestQueue.length > 0) {
      const nextFloor = elevator.requestQueue[0];
      if (nextFloor !== elevator.currentFloor) {
        console.log(`FORCE START: E${elevator.id} moving to floor ${nextFloor}`);
        elevator.moveTo(nextFloor);
      }
    }
  });
}



  findBestElevatorSimple(request, elevators) {
    let bestElevator = null;
    let bestScore = Infinity;

    elevators.forEach(elevator => {
      if (elevator.isFull()) return;

      const score = this.calculateSimpleScore(request, elevator);
      
      if (score < bestScore) {
        bestScore = score;
        bestElevator = elevator;
      }
    });

    return bestElevator;
  }

  calculateSimpleScore(request, elevator) {
    const distance = Math.abs(elevator.currentFloor - request.originFloor);
    const queuePenalty = (elevator.requestQueue?.length || 0) * 2;
    const passengerPenalty = (elevator.passengers?.length || 0) * 3;
    
    // Heavy penalty for wait time - prioritize starving requests
    const urgencyBonus = Math.max(0, 50 - (request.waitTime / 1000));
    
    // Direction bonus - prefer elevators going in the right direction
    let directionBonus = 0;
    if (elevator.state === 'idle') {
      directionBonus = -10; // Prefer idle elevators
    } else {
      const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down';
      if (elevator.direction === requestDirection) {
        directionBonus = -5;
      }
    }

    return distance + queuePenalty + passengerPenalty - urgencyBonus + directionBonus;
  }

  performImmediateAssignment(request, elevator) {
    console.log(`IMMEDIATE ASSIGNMENT: Request ${request.originFloor}â†’${request.destinationFloor} to E${elevator.id}`);
    
    // Assign the request
    request.assignedElevator = elevator.id;
    request.assign(elevator.id);
    
    // Add to elevator queue immediately
    if (!elevator.requestQueue.includes(request.originFloor)) {
      elevator.requestQueue.push(request.originFloor);
    }
    
    if (request.destinationFloor && !elevator.requestQueue.includes(request.destinationFloor)) {
      elevator.requestQueue.push(request.destinationFloor);
    }

    // Optimize elevator queue
    this.optimizeElevatorQueue(elevator);
    
    // Track assignment
    this.assignmentMap.set(request.id, {
      elevatorId: elevator.id,
      timestamp: Date.now()
    });
    
    this.lastAssignmentTime.set(elevator.id, Date.now());
    
    console.log(`E${elevator.id} queue after assignment: [${elevator.requestQueue.join(', ')}]`);
  }

  optimizeElevatorQueue(elevator) {
    if (!elevator.requestQueue || elevator.requestQueue.length <= 1) return;

    const currentFloor = elevator.currentFloor;
    const direction = elevator.direction || 'idle';

    // Simple optimization: sort by floor number based on direction
    if (direction === 'up' || elevator.state === 'idle') {
      // Sort ascending - serve lower floors first when going up
      elevator.requestQueue.sort((a, b) => a - b);
    } else if (direction === 'down') {
      // Sort descending - serve higher floors first when going down
      elevator.requestQueue.sort((a, b) => b - a);
    } else {
      // No clear direction - sort by distance from current floor
      elevator.requestQueue.sort((a, b) => 
        Math.abs(a - currentFloor) - Math.abs(b - currentFloor)
      );
    }

    console.log(`E${elevator.id} queue optimized for ${direction}: [${elevator.requestQueue.join(', ')}]`);
  }

  forceElevatorMovement(elevators, requests) {
    elevators.forEach(elevator => {
      if (elevator.maintenanceMode) return;

      // If elevator is idle and has requests in queue, start moving
      if (elevator.state === 'idle' && elevator.requestQueue.length > 0) {
        const nextFloor = elevator.requestQueue[0];
        if (nextFloor !== elevator.currentFloor) {
          console.log(`FORCE MOVEMENT: E${elevator.id} moving from ${elevator.currentFloor} to ${nextFloor}`);
          elevator.moveTo(nextFloor);
        }
      }

      // If elevator has passengers but no queue, check for destination floors
      if (elevator.passengers.length > 0 && elevator.requestQueue.length === 0) {
        elevator.passengers.forEach(passenger => {
          if (!elevator.requestQueue.includes(passenger.destinationFloor)) {
            elevator.requestQueue.push(passenger.destinationFloor);
          }
        });
        this.optimizeElevatorQueue(elevator);
      }
    });
  }

  // Handle critical starvation - assign immediately to any available elevator
  handleCriticalStarvation(requests, elevators) {
    const starvingRequests = requests.filter(r => 
      r.isActive && !r.isServed && r.waitTime > 30000 // 30 seconds
    );

    if (starvingRequests.length === 0) return;

    console.log(`ðŸš¨ CRITICAL STARVATION: ${starvingRequests.length} requests waiting > 30s`);

    starvingRequests.forEach(request => {
      if (request.assignedElevator !== null) return; // Already assigned

      // Find any available elevator, even if not optimal
      const availableElevator = elevators.find(e => 
        !e.maintenanceMode && !e.isFull()
      );

      if (availableElevator) {
        console.log(`ðŸš‘ EMERGENCY ASSIGNMENT: Request ${request.id} to E${availableElevator.id} after ${(request.waitTime/1000).toFixed(1)}s`);
        this.performImmediateAssignment(request, availableElevator);
      }
    });
  }

  assignOptimalElevator(request, elevators) {
  return this.findBestElevatorSimple(request, elevators.filter(e => !e.maintenanceMode));
}


  getMetrics() {
    return {
      algorithm: this.name,
      activeAssignments: this.assignmentMap.size,
      lastAssignments: Array.from(this.lastAssignmentTime.entries())
    };
  }
}

module.exports = FixedHybridScheduler;