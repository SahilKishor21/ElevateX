class FixedHybridScheduler {
  constructor() {
    this.name = 'Fixed Hybrid Scheduler';
    this.assignmentMap = new Map();
    this.lastAssignmentTime = new Map();
  }

  optimizeRoutes(elevators, requests) {
    const now = Date.now();

    console.log(`HybridScheduler: Processing ${requests.length} total requests`);

    requests.forEach((request) => {
      if (typeof request.updateWaitTime === "function") {
        request.updateWaitTime();
      }
    });

    const unassignedRequests = [];
    requests.forEach(request => {
      if (!request.isActive || request.isServed) return;

      let needsAssignment = false;

      if (request.assignedElevator === null || request.assignedElevator === undefined) {
        needsAssignment = true;
      } else {
        const elevator = elevators[request.assignedElevator];
        if (!elevator || elevator.maintenanceMode) {
          needsAssignment = true;
          request.assignedElevator = null;
        } else {
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

    this.assignRequestsImmediately(unassignedRequests, elevators);

    this.forceElevatorMovement(elevators);
  }

  getUnassignedRequests(requests, elevators) {
    const unassigned = [];

    requests.forEach(request => {
      if (!request.isActive || request.isServed) return;

      const hasValidAssignment = this.validateAssignment(request, elevators);

      if (!hasValidAssignment) {
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

    const hasOriginFloor = elevator.requestQueue && elevator.requestQueue.includes(request.originFloor);
    const isAtOriginFloor = elevator.currentFloor === request.originFloor && elevator.state === 'loading';

    return hasOriginFloor || isAtOriginFloor;
  }

  assignRequestsImmediately(requests, elevators) {
    const availableElevators = elevators.filter(e => !e.maintenanceMode);

    if (availableElevators.length === 0) return;

    requests.sort((a, b) => b.waitTime - a.waitTime);

    requests.forEach(request => {
      const elevator = this.findBestElevatorSimple(request, availableElevators);

      if (elevator) {
        console.log(`IMMEDIATE: Assigning ${request.originFloor}→${request.destinationFloor} to E${elevator.id} (waited ${(request.waitTime/1000).toFixed(1)}s)`);

        request.assignedElevator = elevator.id;
        request.assign(elevator.id);

        if (!elevator.requestQueue.includes(request.originFloor)) {
          elevator.requestQueue.push(request.originFloor);
        }
        if (request.destinationFloor && !elevator.requestQueue.includes(request.destinationFloor)) {
          elevator.requestQueue.push(request.destinationFloor);
        }

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

    const urgencyBonus = Math.max(0, 50 - (request.waitTime / 1000));

    let directionBonus = 0;
    if (elevator.state === 'idle') {
      directionBonus = -10;
    } else {
      const requestDirection = request.destinationFloor > request.originFloor ? 'up' : 'down';
      if (elevator.direction === requestDirection) {
        directionBonus = -5;
      }
    }

    return distance + queuePenalty + passengerPenalty - urgencyBonus + directionBonus;
  }

  performImmediateAssignment(request, elevator) {
    console.log(`IMMEDIATE ASSIGNMENT: Request ${request.originFloor}→${request.destinationFloor} to E${elevator.id}`);

    request.assignedElevator = elevator.id;
    request.assign(elevator.id);

    if (!elevator.requestQueue.includes(request.originFloor)) {
      elevator.requestQueue.push(request.originFloor);
    }

    if (request.destinationFloor && !elevator.requestQueue.includes(request.destinationFloor)) {
      elevator.requestQueue.push(request.destinationFloor);
    }

    this.optimizeElevatorQueue(elevator);

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

    if (direction === 'up' || elevator.state === 'idle') {
      elevator.requestQueue.sort((a, b) => a - b);
    } else if (direction === 'down') {
      elevator.requestQueue.sort((a, b) => b - a);
    } else {
      elevator.requestQueue.sort((a, b) =>
        Math.abs(a - currentFloor) - Math.abs(b - currentFloor)
      );
    }

    console.log(`E${elevator.id} queue optimized for ${direction}: [${elevator.requestQueue.join(', ')}]`);
  }

  optimizeElevatorQueueSimple(elevator) {
    if (!elevator.requestQueue || elevator.requestQueue.length <= 1) return;

    const currentFloor = elevator.currentFloor;

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

  forceElevatorMovement(elevators) {
    elevators.forEach(elevator => {
      if (elevator.maintenanceMode) return;

      if (elevator.state === 'idle' && elevator.requestQueue.length > 0) {
        const nextFloor = elevator.requestQueue[0];
        if (nextFloor !== elevator.currentFloor) {
          console.log(`FORCE START: E${elevator.id} moving to floor ${nextFloor}`);
          elevator.moveTo(nextFloor);
        }
      }
    });
  }

  forceElevatorMovement(elevators, requests) {
    elevators.forEach(elevator => {
      if (elevator.maintenanceMode) return;

      if (elevator.state === 'idle' && elevator.requestQueue.length > 0) {
        const nextFloor = elevator.requestQueue[0];
        if (nextFloor !== elevator.currentFloor) {
          console.log(`FORCE MOVEMENT: E${elevator.id} moving from ${elevator.currentFloor} to ${nextFloor}`);
          elevator.moveTo(nextFloor);
        }
      }

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

  handleCriticalStarvation(requests, elevators) {
    const starvingRequests = requests.filter(r =>
      r.isActive && !r.isServed && r.waitTime > 30000
    );

    if (starvingRequests.length === 0) return;

    console.log(`🚨 CRITICAL STARVATION: ${starvingRequests.length} requests waiting > 30s`);

    starvingRequests.forEach(request => {
      if (request.assignedElevator !== null) return;

      const availableElevator = elevators.find(e =>
        !e.maintenanceMode && !e.isFull()
      );

      if (availableElevator) {
        console.log(`🚑 EMERGENCY ASSIGNMENT: Request ${request.id} to E${availableElevator.id} after ${(request.waitTime/1000).toFixed(1)}s`);
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
