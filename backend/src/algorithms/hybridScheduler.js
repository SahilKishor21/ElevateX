const PriorityCalculator = require("./priorityCalculator");

class HybridScheduler {
  constructor() {
    this.priorityCalculator = new PriorityCalculator();
    this.lastOptimization = 0;
    this.elevatorLastAssignment = new Map();
    this.elevatorLoadPrediction = new Map();
    this.systemLoadThreshold = 0.8;
    this.highVolumeMode = false;
    // STARVATION FIX: Track starving requests more aggressively
    this.starvingRequestsHistory = new Map();
  }

  optimizeRoutes(elevators, requests) {
    const now = Date.now();

    // Reduce throttle for faster response
    const throttleInterval = this.highVolumeMode ? 100 : 200;
    if (now - this.lastOptimization < throttleInterval) return;
    this.lastOptimization = now;

    // Update wait times for ALL requests
    requests.forEach((request) => {
      if (typeof request.updateWaitTime === "function") {
        request.updateWaitTime();
      }
    });

    this.detectHighVolumeMode(requests, elevators);

    // Get ALL unserved requests
    const unservedRequests = requests.filter((r) => r.isActive && !r.isServed);

    // CRITICAL: Force reassignment for requests waiting > 20 seconds
    const waitingRequests = unservedRequests.filter((r) => r.waitTime > 20000);
    if (waitingRequests.length > 0) {
      console.log(
        `⚠️ ${waitingRequests.length} requests waiting >20s, forcing reassignment`
      );

      // Find all idle elevators
      const idleElevators = elevators.filter(
        (e) =>
          e.state === "idle" &&
          (!e.requestQueue || e.requestQueue.length === 0) &&
          !e.maintenanceMode
      );

      waitingRequests.forEach((request, idx) => {
        // Clear any stuck assignment
        if (request.assignedElevator !== null) {
          const oldElevator = elevators[request.assignedElevator];
          if (
            oldElevator &&
            (!oldElevator.requestQueue ||
              !oldElevator.requestQueue.includes(request.originFloor))
          ) {
            request.assignedElevator = null;
          }
        }

        // Assign to idle elevator if available
        if (idleElevators.length > idx) {
          const elevator = idleElevators[idx];
          console.log(`Assigning waiting request to idle E${elevator.id}`);
          request.assignedElevator = null;
          request.assign(elevator.id);
          elevator.addRequest(request.originFloor);
          if (request.destinationFloor) {
            elevator.addRequest(request.destinationFloor);
          }
          this.elevatorLastAssignment.set(elevator.id, now);
          this.updateLoadPrediction(elevator.id, request);

          // Force movement
          if (elevator.currentFloor !== request.originFloor) {
            elevator.moveTo(request.originFloor);
          }
        }
      });
    }

    // STARVATION FIX: Process starving requests FIRST with highest priority
    const starvingRequests = this.identifyStarvingRequests(requests);
    if (starvingRequests.length > 0) {
      console.log(
        `🚨 STARVATION ALERT: ${starvingRequests.length} starving requests detected`
      );
      this.handleStarvingRequests(starvingRequests, elevators);
    }

    // Process remaining unassigned requests
    const pendingRequests = requests
      .filter(
        (r) =>
          r.isActive &&
          !r.isServed &&
          (r.assignedElevator === null || r.assignedElevator === undefined)
      )
      .filter((r) => !starvingRequests.includes(r))
      .sort((a, b) => {
        // Prioritize by wait time first
        const waitDiff = b.waitTime - a.waitTime;
        if (Math.abs(waitDiff) > 5000) return waitDiff > 0 ? 1 : -1;

        // Then by priority
        const priorityA = this.priorityCalculator.calculateRequestPriority(a);
        const priorityB = this.priorityCalculator.calculateRequestPriority(b);
        return priorityB - priorityA;
      });

    console.log(
      `HybridScheduler: Processing ${pendingRequests.length} normal requests + ${starvingRequests.length} starving requests`
    );

    if (this.highVolumeMode && pendingRequests.length > 20) {
      this.processBatchAssignment(pendingRequests, elevators);
    } else {
      pendingRequests.forEach((request) => {
        const elevator = this.assignOptimalElevator(request, elevators);
        if (elevator) {
          console.log(
            `HybridScheduler: Assigning request ${request.originFloor}→${request.destinationFloor} to E${elevator.id}`
          );
          request.assign(elevator.id);
          elevator.addRequest(request.originFloor);
          if (request.destinationFloor) {
            elevator.addRequest(request.destinationFloor);
          }
          this.elevatorLastAssignment.set(elevator.id, now);
          this.updateLoadPrediction(elevator.id, request);
        } else {
          console.warn(
            `Could not find elevator for request ${request.originFloor}→${request.destinationFloor}`
          );
        }
      });
    }

    // Optimize routes for elevators with requests
    this.optimizeExistingRoutes(elevators);

    // IMPORTANT: Don't position idle elevators if there are unserved requests
    if (unservedRequests.length === 0) {
      // Only position when truly no work to do
      const idleElevators = elevators.filter(
        (e) =>
          e.state === "idle" && (!e.requestQueue || e.requestQueue.length === 0)
      );

      // Keep idle elevators at strategic positions, not ground floor
      idleElevators.forEach((elevator, idx) => {
        // Don't move if already at a good position
        const strategicFloors = [
          1,
          Math.ceil(this.config.numFloors / 3),
          Math.ceil((2 * this.config.numFloors) / 3),
          this.config.numFloors,
        ];
        const nearStrategicFloor = strategicFloors.some(
          (f) => Math.abs(elevator.currentFloor - f) <= 2
        );

        if (nearStrategicFloor) {
          console.log(
            `E${elevator.id} already at strategic position (floor ${elevator.currentFloor})`
          );
        }
        // Don't add automatic positioning moves
      });
    }
  }

  // STARVATION FIX: Identify starving requests with multiple thresholds
  identifyStarvingRequests(requests) {
    const now = Date.now();
    const starvingRequests = [];

    requests.forEach((request) => {
      if (
        !request.isActive ||
        request.isServed ||
        request.assignedElevator !== null
      )
        return;

      const waitTime = request.waitTime || 0;
      const waitSeconds = waitTime / 1000;

      // ASSIGNMENT REQUIREMENT: Escalate after 30 seconds, prevent starvation at 60 seconds
      let isStarving = false;
      let starvationLevel = "none";

      if (waitSeconds > 90) {
        isStarving = true;
        starvationLevel = "critical"; // 1.5 minutes - immediate action required
      } else if (waitSeconds > 60) {
        isStarving = true;
        starvationLevel = "severe"; // 1 minute - assignment requirement violated
      } else if (waitSeconds > 45) {
        isStarving = true;
        starvationLevel = "moderate"; // 45 seconds - preventive action
      } else if (waitSeconds > 30) {
        isStarving = true;
        starvationLevel = "early"; // 30 seconds - assignment escalation point
      }

      if (isStarving) {
        // Track starvation history
        if (!this.starvingRequestsHistory.has(request.id)) {
          this.starvingRequestsHistory.set(request.id, {
            firstStarved: now,
            level: starvationLevel,
            attempts: 0,
          });
        } else {
          const history = this.starvingRequestsHistory.get(request.id);
          history.level = starvationLevel;
          history.attempts += 1;
        }

        request.starvationLevel = starvationLevel;
        starvingRequests.push(request);

        console.log(
          `🚨 STARVING REQUEST: ${request.id} (${request.originFloor}→${
            request.destinationFloor
          }) - ${waitSeconds.toFixed(1)}s (${starvationLevel})`
        );
      }
    });

    return starvingRequests.sort((a, b) => b.waitTime - a.waitTime); // Most starved first
  }

  // STARVATION FIX: Handle starving requests with emergency assignment
  handleStarvingRequests(starvingRequests, elevators) {
    console.log(
      `🚨 EMERGENCY STARVATION HANDLING: Processing ${starvingRequests.length} starving requests`
    );

    starvingRequests.forEach((request) => {
      // Find the best available elevator for emergency assignment
      let bestElevator = this.findEmergencyElevator(request, elevators);

      if (!bestElevator) {
        // If no elevator available, force assignment by clearing low-priority requests
        bestElevator = this.forceElevatorAssignment(request, elevators);
      }

      if (bestElevator) {
        // Set maximum priority for starving requests
        const originalPriority = request.priority;
        request.priority = 10; // Emergency priority

        console.log(
          `🚑 EMERGENCY ASSIGNMENT: ${request.originFloor}→${
            request.destinationFloor
          } to E${bestElevator.id} (was starving ${(
            request.waitTime / 1000
          ).toFixed(1)}s)`
        );

        request.assign(bestElevator.id);

        // Add to front of queue for immediate service
        if (
          bestElevator.requestQueue &&
          Array.isArray(bestElevator.requestQueue)
        ) {
          // Remove if already in queue
          const existingIndex = bestElevator.requestQueue.indexOf(
            request.originFloor
          );
          if (existingIndex !== -1) {
            bestElevator.requestQueue.splice(existingIndex, 1);
          }
          // Add to front of queue
          bestElevator.requestQueue.unshift(request.originFloor);
        } else {
          bestElevator.addRequest(request.originFloor);
        }

        if (request.destinationFloor) {
          bestElevator.addRequest(request.destinationFloor);
        }

        this.elevatorLastAssignment.set(bestElevator.id, Date.now());

        // Track successful starvation resolution
        const history = this.starvingRequestsHistory.get(request.id);
        if (history) {
          history.resolvedAt = Date.now();
          history.resolutionTime = Date.now() - history.firstStarved;
        }
      } else {
        console.error(
          `🚨 CRITICAL: Cannot assign starving request ${request.id} - no elevators available!`
        );
      }
    });
  }

  // STARVATION FIX: Find elevator for emergency assignment
  findEmergencyElevator(request, elevators) {
    const availableElevators = elevators.filter((e) => !e.maintenanceMode);

    if (availableElevators.length === 0) return null;

    // CRITICAL FIX: Aggressively prioritize idle elevators for starving requests
    const idleElevators = availableElevators.filter(
      (e) =>
        e.state === "idle" && (!e.requestQueue || e.requestQueue.length === 0)
    );

    if (idleElevators.length > 0) {
      // Take the closest idle elevator immediately
      const closest = this.findClosestElevator(
        idleElevators,
        request.originFloor
      );
      console.log(
        `🚑 EMERGENCY: Assigning starving request to idle E${closest.id}`
      );
      return closest;
    }

    // Priority 2: Elevators that are idle but have some queue
    const semiIdleElevators = availableElevators.filter(
      (e) => e.state === "idle" && e.requestQueue && e.requestQueue.length < 3
    );

    if (semiIdleElevators.length > 0) {
      const closest = this.findClosestElevator(
        semiIdleElevators,
        request.originFloor
      );
      console.log(
        `🚑 EMERGENCY: Assigning to semi-idle E${closest.id} with small queue`
      );
      return closest;
    }

    // Priority 3: Elevators with minimal load
    const lightLoadElevators = availableElevators.filter(
      (e) => !e.isFull() && (e.requestQueue?.length || 0) < 5
    );

    if (lightLoadElevators.length > 0) {
      const closest = this.findClosestElevator(
        lightLoadElevators,
        request.originFloor
      );
      console.log(`🚑 EMERGENCY: Assigning to lightly loaded E${closest.id}`);
      return closest;
    }

    // Priority 4: Elevators moving in the right direction
    const sameDirectionElevators = availableElevators.filter((e) => {
      if (e.state === "idle") return true;
      const requestDirection =
        request.destinationFloor > request.originFloor ? "up" : "down";
      return e.direction === requestDirection;
    });

    if (sameDirectionElevators.length > 0) {
      const closest = this.findClosestElevator(
        sameDirectionElevators,
        request.originFloor
      );
      console.log(`🚑 EMERGENCY: Assigning to same-direction E${closest.id}`);
      return closest;
    }

    // Priority 5: Any elevator with space
    const anyWithSpace = availableElevators.filter((e) => !e.isFull());
    if (anyWithSpace.length > 0) {
      const closest = this.findClosestElevator(
        anyWithSpace,
        request.originFloor
      );
      console.log(`🚑 EMERGENCY: Assigning to any available E${closest.id}`);
      return closest;
    }

    // Last resort: Force clear the closest elevator's least important request
    console.log(
      `🚨 CRITICAL: All elevators full, forcing space in closest elevator`
    );
    const closestElevator = this.findClosestElevator(
      availableElevators,
      request.originFloor
    );

    if (
      closestElevator &&
      closestElevator.requestQueue &&
      closestElevator.requestQueue.length > 0
    ) {
      // Remove the furthest request from queue
      const furthestIndex = closestElevator.requestQueue.reduce(
        (maxIdx, floor, idx, arr) => {
          const maxDist = Math.abs(arr[maxIdx] - closestElevator.currentFloor);
          const currDist = Math.abs(floor - closestElevator.currentFloor);
          return currDist > maxDist ? idx : maxIdx;
        },
        0
      );

      const removed = closestElevator.requestQueue.splice(furthestIndex, 1)[0];
      console.log(
        `🚑 FORCE CLEAR: Removed floor ${removed} from E${closestElevator.id} for starving request`
      );
    }

    return closestElevator;
  }

  // STARVATION FIX: Force assignment by clearing low-priority requests
  forceElevatorAssignment(starvingRequest, elevators) {
    const availableElevators = elevators.filter((e) => !e.maintenanceMode);

    for (const elevator of availableElevators) {
      if (
        elevator.isFull() &&
        elevator.requestQueue &&
        elevator.requestQueue.length > 0
      ) {
        // Remove the last (least urgent) request from queue to make space
        const removedFloor = elevator.requestQueue.pop();
        console.log(
          `🚑 FORCE CLEAR: Removed floor ${removedFloor} from E${elevator.id} for starving request`
        );
        return elevator;
      }
    }

    // If still no space, use the closest elevator anyway
    return this.findClosestElevator(
      availableElevators,
      starvingRequest.originFloor
    );
  }

  // STARVATION FIX: Find closest elevator to a floor
  findClosestElevator(elevators, floor) {
    if (elevators.length === 0) return null;

    return elevators.reduce((closest, current) => {
      const closestDistance = Math.abs(closest.currentFloor - floor);
      const currentDistance = Math.abs(current.currentFloor - floor);
      return currentDistance < closestDistance ? current : closest;
    });
  }

  detectHighVolumeMode(requests, elevators) {
    const activeRequests = requests.filter(
      (r) => r.isActive && !r.isServed
    ).length;
    const elevatorUtilization =
      elevators.filter((e) => e.state !== "idle").length / elevators.length;
    const avgWaitTime = this.calculateAverageWaitTime(requests);

    const shouldEnterHighVolumeMode =
      activeRequests > elevators.length * 10 ||
      elevatorUtilization > this.systemLoadThreshold ||
      avgWaitTime > 45;

    if (shouldEnterHighVolumeMode && !this.highVolumeMode) {
      console.log(
        "🚨 HybridScheduler: Entering HIGH VOLUME MODE - Optimizing for throughput"
      );
      this.highVolumeMode = true;
    } else if (!shouldEnterHighVolumeMode && this.highVolumeMode) {
      console.log(
        "✅ HybridScheduler: Exiting high volume mode - Returning to optimal assignments"
      );
      this.highVolumeMode = false;
    }
  }

  processBatchAssignment(requests, elevators) {
    console.log(`Processing ${requests.length} requests in batch mode`);

    const requestsByFloor = new Map();
    requests.forEach((request) => {
      const floor = request.originFloor;
      if (!requestsByFloor.has(floor)) {
        requestsByFloor.set(floor, []);
      }
      requestsByFloor.get(floor).push(request);
    });

    const availableElevators = [...elevators].filter((e) => !e.maintenanceMode);
    let elevatorIndex = 0;

    requestsByFloor.forEach((floorRequests, floor) => {
      const elevator =
        availableElevators[elevatorIndex % availableElevators.length];

      floorRequests.forEach((request) => {
        if (!elevator.isFull()) {
          request.assign(elevator.id);
          elevator.addRequest(request.originFloor);
          if (request.destinationFloor) {
            elevator.addRequest(request.destinationFloor);
          }
          this.updateLoadPrediction(elevator.id, request);
        }
      });

      elevatorIndex++;
    });
  }

 assignOptimalElevator(request, elevators) {
  const candidates = []
  
  elevators.forEach(elevator => {
    if (elevator.maintenanceMode || elevator.isFull()) return
    
    // CHECK: Can elevator pick up on the way?
    if (elevator.state === 'moving_up' || elevator.state === 'moving_down') {
      const movingUp = elevator.direction === 'up'
      const requestUp = request.destinationFloor > request.originFloor
      
      // Same direction check
      if (movingUp === requestUp) {
        // Check if elevator will pass the floor
        if (movingUp && elevator.currentFloor < request.originFloor && 
            (!elevator.targetFloor || elevator.targetFloor >= request.originFloor)) {
          // Can pick up on the way up!
          candidates.push({
            elevator,
            score: 1000 - Math.abs(elevator.currentFloor - request.originFloor),
            reason: 'on-the-way'
          })
          return
        } else if (!movingUp && elevator.currentFloor > request.originFloor &&
                   (!elevator.targetFloor || elevator.targetFloor <= request.originFloor)) {
          // Can pick up on the way down!
          candidates.push({
            elevator,
            score: 1000 - Math.abs(elevator.currentFloor - request.originFloor),
            reason: 'on-the-way'
          })
          return
        }
      }
    }
    
    // Rest of normal scoring...
    const distance = Math.abs(elevator.currentFloor - request.originFloor)
    const queuePenalty = (elevator.requestQueue?.length || 0) * 5
    
    candidates.push({
      elevator,
      score: 100 - distance - queuePenalty,
      reason: 'normal'
    })
  })
  
  // Sort by score and return best
  candidates.sort((a, b) => b.score - a.score)
  
  if (candidates.length > 0) {
    console.log(`Best elevator for ${request.originFloor}: E${candidates[0].elevator.id} (${candidates[0].reason})`)
    return candidates[0].elevator
  }
  
  return null
}

  getEnhancedDirectionAlignment(elevator, request) {
    if (elevator.state === "idle") return 10;

    const requestDirection =
      request.destinationFloor > request.originFloor ? "up" : "down";

    if (elevator.direction === requestDirection) {
      if (
        requestDirection === "up" &&
        elevator.currentFloor <= request.originFloor
      ) {
        return 15;
      }
      if (
        requestDirection === "down" &&
        elevator.currentFloor >= request.originFloor
      ) {
        return 15;
      }
      return 5;
    }

    return 0;
  }

  calculateAssignmentScore(elevator, request) {
    const distance = Math.abs(elevator.currentFloor - request.originFloor);
    const waitTimeMultiplier = Math.max(1, request.waitTime / 30000);
    const directionAlignment = this.getDirectionAlignment(elevator, request);
    const capacityPenalty = (elevator.passengers?.length || 0) * 4;
    const trafficBonus = this.priorityCalculator.getTrafficBonus(request);

    const baseScore = distance + capacityPenalty;
    const modifiedScore = baseScore * waitTimeMultiplier * directionAlignment;
    const finalScore = Math.max(0.1, modifiedScore - trafficBonus);

    return finalScore;
  }

  getDirectionAlignment(elevator, request) {
    if (elevator.state === "idle") return 0.7;

    const requestDirection =
      request.destinationFloor > request.originFloor ? "up" : "down";

    if (elevator.direction === requestDirection) {
      if (
        requestDirection === "up" &&
        elevator.currentFloor <= request.originFloor
      ) {
        return 0.4;
      }
      if (
        requestDirection === "down" &&
        elevator.currentFloor >= request.originFloor
      ) {
        return 0.4;
      }
      return 1.5;
    }

    return 2.0;
  }

  optimizeExistingRoutes(elevators) {
    elevators.forEach((elevator) => {
      if (elevator.requestQueue.length > 1) {
        elevator.requestQueue = this.optimizeMultiStopRoute(
          elevator,
          elevator.requestQueue
        );
      }
    });
  }

  optimizeMultiStopRoute(elevator, queue) {
    if (queue.length <= 1) return queue;

    const currentFloor = elevator.currentFloor;
    const direction = elevator.direction;

    if (direction === "up") {
      const above = queue
        .filter((floor) => floor > currentFloor)
        .sort((a, b) => a - b);
      const atCurrent = queue.filter((floor) => floor === currentFloor);
      const below = queue
        .filter((floor) => floor < currentFloor)
        .sort((a, b) => b - a);
      return [...atCurrent, ...above, ...below];
    } else if (direction === "down") {
      const below = queue
        .filter((floor) => floor < currentFloor)
        .sort((a, b) => b - a);
      const atCurrent = queue.filter((floor) => floor === currentFloor);
      const above = queue
        .filter((floor) => floor > currentFloor)
        .sort((a, b) => a - b);
      return [...atCurrent, ...below, ...above];
    } else {
      return queue.sort(
        (a, b) => Math.abs(a - currentFloor) - Math.abs(b - currentFloor)
      );
    }
  }

  // STARVATION FIX: Enhanced starvation prevention with immediate action
  preventStarvation(requests, elevators) {
    const starvingThreshold = this.highVolumeMode ? 30000 : 45000; // More aggressive threshold
    const starvingRequests = requests.filter((r) => {
      return (
        r.isActive &&
        r.waitTime > starvingThreshold &&
        (r.assignedElevator === null || r.assignedElevator === undefined)
      );
    });

    if (starvingRequests.length === 0) return;

    console.log(
      `🚨 STARVATION PREVENTION: Found ${starvingRequests.length} requests exceeding threshold`
    );

    // Immediate emergency assignment for all starving requests
    this.handleStarvingRequests(starvingRequests, elevators);
  }

  findNearestAvailableElevator(floor, elevators) {
    const availableElevators = elevators.filter((e) => !e.maintenanceMode);

    if (availableElevators.length === 0) return null;

    return availableElevators.reduce((nearest, current) => {
      const currentDistance = Math.abs(current.currentFloor - floor);
      const nearestDistance = Math.abs(nearest.currentFloor - floor);

      if (Math.abs(currentDistance - nearestDistance) <= 2) {
        const currentLoad = current.passengers?.length || 0;
        const nearestLoad = nearest.passengers?.length || 0;
        return currentLoad < nearestLoad ? current : nearest;
      }

      return currentDistance < nearestDistance ? current : nearest;
    });
  }

  clearLowPriorityRequests(elevator, allRequests) {
    const elevatorRequests = allRequests.filter(
      (r) => r.assignedElevator === elevator.id && r.isActive
    );
    const lowPriorityRequests = elevatorRequests
      .filter((r) => r.priority <= 2 && r.waitTime < 30000)
      .sort((a, b) => a.priority - b.priority);

    if (lowPriorityRequests.length > 0) {
      const requestToRemove = lowPriorityRequests[0];
      requestToRemove.assignedElevator = null;

      const floorIndex = elevator.requestQueue.indexOf(
        requestToRemove.originFloor
      );
      if (floorIndex !== -1) {
        elevator.requestQueue.splice(floorIndex, 1);
      }

      console.log(
        `Cleared low-priority request ${requestToRemove.originFloor}→${requestToRemove.destinationFloor} to make room`
      );
    }
  }

  positionIdleElevators(elevators, numFloors) {
    const idleElevators = elevators.filter((e) => e.isIdle());

    if (idleElevators.length === 0) return;

    const hour = new Date().getHours();
    const positions = this.calculateOptimalPositions(
      hour,
      numFloors,
      idleElevators.length
    );

    idleElevators.forEach((elevator, index) => {
      if (index < positions.length) {
        const targetFloor = positions[index];
        const hasBeenIdle =
          elevator.state === "idle" && elevator.requestQueue.length === 0;

        const shouldReposition =
          hasBeenIdle &&
          elevator.currentFloor !== targetFloor &&
          !this.highVolumeMode;

        if (shouldReposition) {
          const adjustedTarget =
            targetFloor + Math.floor(Math.random() * 3) - 1;
          const finalTarget = Math.max(1, Math.min(numFloors, adjustedTarget));
          elevator.moveTo(finalTarget);
          console.log(
            `Positioning idle E${elevator.id} to floor ${finalTarget} (traffic-optimized)`
          );
        }
      }
    });
  }

  calculateOptimalPositions(hour, numFloors, elevatorCount) {
    const positions = [];

    if (hour >= 8 && hour <= 10) {
      positions.push(1);
      if (elevatorCount > 1) positions.push(Math.floor(numFloors * 0.2));
      if (elevatorCount > 2) positions.push(Math.floor(numFloors * 0.4));
      if (elevatorCount > 3) positions.push(Math.floor(numFloors * 0.6));
    } else if (hour >= 17 && hour <= 19) {
      const upperStart = Math.floor(numFloors * 0.7);
      for (let i = 0; i < elevatorCount; i++) {
        positions.push(Math.min(numFloors, upperStart + i * 2));
      }
    } else if (hour >= 12 && hour <= 14) {
      const midFloor = Math.floor(numFloors / 2);
      for (let i = 0; i < elevatorCount; i++) {
        positions.push(
          Math.max(1, midFloor + (i - Math.floor(elevatorCount / 2)) * 3)
        );
      }
    } else {
      for (let i = 0; i < elevatorCount; i++) {
        const position = Math.floor(
          ((i + 1) * numFloors) / (elevatorCount + 1)
        );
        positions.push(Math.max(1, position));
      }
    }

    while (positions.length < elevatorCount) {
      const randomFloor = Math.floor(Math.random() * numFloors) + 1;
      if (!positions.includes(randomFloor)) {
        positions.push(randomFloor);
      }
    }

    return positions.slice(0, elevatorCount);
  }

  updateLoadPrediction(elevatorId, request) {
    const currentLoad = this.elevatorLoadPrediction.get(elevatorId) || 0;
    const requestLoad = this.calculateRequestLoad(request);
    this.elevatorLoadPrediction.set(elevatorId, currentLoad + requestLoad);

    setTimeout(() => {
      const load = this.elevatorLoadPrediction.get(elevatorId) || 0;
      this.elevatorLoadPrediction.set(
        elevatorId,
        Math.max(0, load - requestLoad)
      );
    }, 60000);
  }

  calculateRequestLoad(request) {
    const distance = Math.abs(request.destinationFloor - request.originFloor);
    const priority = request.priority || 1;
    return distance * 0.1 + priority * 0.05;
  }

  calculateAverageWaitTime(requests) {
    const activeRequests = requests.filter((r) => r.isActive && !r.isServed);
    if (activeRequests.length === 0) return 0;

    const totalWaitTime = activeRequests.reduce(
      (sum, r) => sum + (r.waitTime || 0),
      0
    );
    return totalWaitTime / activeRequests.length / 1000;
  }

  getSchedulingMetrics(elevators, requests) {
    const activeRequests = requests.filter((r) => r.isActive);
    const servedRequests = requests.filter((r) => r.isServed);
    const starvingRequests = activeRequests.filter((r) => r.waitTime > 60000);

    const waitTimes = servedRequests
      .map((r) => r.waitTime)
      .filter((t) => t > 0);
    const utilizationRates = elevators.map((e) => e.getUtilization());

    return {
      algorithm: "Hybrid Dynamic Scheduler",
      totalRequests: requests.length,
      activeRequests: activeRequests.length,
      servedRequests: servedRequests.length,
      starvingRequests: starvingRequests.length,
      averageWaitTime:
        waitTimes.length > 0
          ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
          : 0,
      maxWaitTime: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      averageUtilization:
        utilizationRates.reduce((a, b) => a + b, 0) / utilizationRates.length,
      efficiency: this.calculateOverallEfficiency(elevators, servedRequests),
      lastOptimization: new Date(this.lastOptimization).toISOString(),
      highVolumeMode: this.highVolumeMode,
      // STARVATION FIX: Include starvation metrics
      starvationHistory: Array.from(this.starvingRequestsHistory.entries()).map(
        ([id, data]) => ({
          requestId: id,
          ...data,
        })
      ),
    };
  }

  calculateOverallEfficiency(elevators, servedRequests) {
    const totalDistance = elevators.reduce(
      (sum, e) => sum + (e.totalDistance || 0),
      0
    );

    if (totalDistance === 0 || servedRequests.length === 0) return 0;

    return (servedRequests.length / totalDistance) * 100;
  }
}

module.exports = HybridScheduler;
