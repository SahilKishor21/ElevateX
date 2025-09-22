class OptimizedElevator {
  constructor(id, capacity = 8, color = '#3b82f6') {
    this.id = id;
    this.currentFloor = 1;
    this.targetFloor = null;
    this.state = 'idle';
    this.direction = 'idle';
    this.passengers = [];
    this.capacity = capacity;
    this.doorOpen = false;
    this.requestQueue = [];
    this.lastMoveTime = Date.now();
    this.totalDistance = 0;
    this.totalTrips = 0;
    this.maintenanceMode = false;
    this.color = color;
    this.speed = 1;
    
    // Performance optimizations
    this.movementQueue = []; // Pre-calculated movement path
    this.isMoving = false;
    this.doorTimer = null;
    this.utilizationCache = { value: 0, lastCalculated: 0 };
  }

  setSpeed(speed) {
    this.speed = speed || 1;
  }

  moveTo(floor) {
    if (this.maintenanceMode || this.state === 'loading' || floor === this.currentFloor) {
      return floor === this.currentFloor;
    }
    
    this.targetFloor = floor;
    
    if (floor > this.currentFloor) {
      this.direction = 'up';
      this.state = 'moving_up';
    } else {
      this.direction = 'down';
      this.state = 'moving_down';
    }
    
    this.isMoving = true;
    return true;
  }

  update(deltaTime) {
  const now = Date.now()
  
 
  const moveInterval = Math.max(500, 1000 / (this.speed || 1)) 
  const loadingInterval = Math.max(1000, 2000 / (this.speed || 1)) 
  
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
        
        console.log(`E${this.id}: Moved to floor ${this.currentFloor}`)
        
        if (this.currentFloor === this.targetFloor || this.requestQueue.includes(this.currentFloor)) {
          this.state = 'loading'
          this.doorOpen = true
          this.loadingStartTime = now
          this.totalTrips = (this.totalTrips || 0) + 1
          this.requestQueue = this.requestQueue.filter(f => f !== this.currentFloor)
          console.log(`E${this.id}: Arrived at floor ${this.currentFloor}, queue: [${this.requestQueue.join(', ')}]`)
        }
      }
      break
      
    case 'loading':
      if (now - this.loadingStartTime >= loadingInterval) {
        this.state = 'idle'
        this.doorOpen = false
        this.loadingStartTime = null
        this.targetFloor = null
        
        console.log(`E${this.id}: Finished loading at floor ${this.currentFloor}`)
        if (this.requestQueue.length > 0) {
          this.processNextDestination()
        } else {
          this.direction = 'idle'
        }
      }
      break
      
    case 'idle':
      this.processNextDestination()
      break
  }
}

  updateMovement(now, moveInterval) {
    if (now - this.lastMoveTime >= moveInterval) {
      const previousFloor = this.currentFloor;
      this.currentFloor += this.direction === 'up' ? 1 : -1;
      this.totalDistance += 1;
      this.lastMoveTime = now;
      
      console.log(`E${this.id}: Moved from ${previousFloor} to ${this.currentFloor}`);
      if (this.shouldStopAtCurrentFloor()) {
        this.arriveAtFloor();
      }
    }
  }

  shouldStopAtCurrentFloor() {
    return this.currentFloor === this.targetFloor || 
           this.requestQueue.includes(this.currentFloor);
  }

  arriveAtFloor() {
    console.log(`E${this.id}: Arriving at floor ${this.currentFloor}`);
    
    this.state = 'loading';
    this.doorOpen = true;
    this.isMoving = false;
    this.totalTrips += 1;
    
    this.requestQueue = this.requestQueue.filter(floor => floor !== this.currentFloor);
  }

  updateLoading(now, loadingInterval) {
    if (!this.doorTimer) {
      this.doorTimer = now;
    }
    
    if (now - this.doorTimer >= loadingInterval) {
      this.finishLoading();
    }
  }

  finishLoading() {
    this.state = 'idle';
    this.doorOpen = false;
    this.doorTimer = null;
    this.targetFloor = null;
  
    if (this.requestQueue.length === 0) {
      this.direction = 'idle';
    }
    
    console.log(`E${this.id}: Finished loading at floor ${this.currentFloor}`);
  }

processNextDestination() {
  if (this.requestQueue.length === 0) {
    this.direction = 'idle'
    return
  }
  
  const nextFloor = this.requestQueue[0]
  
  if (nextFloor && nextFloor !== this.currentFloor) {
    console.log(`E${this.id}: Moving to next destination: ${nextFloor}`)
    this.moveTo(nextFloor)
  } else if (nextFloor === this.currentFloor) {
    this.requestQueue.shift()
    this.processNextDestination()
  }
}

  getNextOptimalFloor() {
    if (this.requestQueue.length === 0) return null;
    
    const currentFloor = this.currentFloor;
    
    if (this.direction === 'up' || this.direction === 'idle') {
      const floorsAbove = this.requestQueue.filter(f => f > currentFloor).sort((a, b) => a - b);
      if (floorsAbove.length > 0) {
        this.direction = 'up';
        return floorsAbove[0];
      }
      const floorsBelow = this.requestQueue.filter(f => f < currentFloor).sort((a, b) => b - a);
      if (floorsBelow.length > 0) {
        this.direction = 'down';
        return floorsBelow[0];
      }
    } else if (this.direction === 'down') {
      const floorsBelow = this.requestQueue.filter(f => f < currentFloor).sort((a, b) => b - a);
      if (floorsBelow.length > 0) {
        return floorsBelow[0];
      }
      const floorsAbove = this.requestQueue.filter(f => f > currentFloor).sort((a, b) => a - b);
      if (floorsAbove.length > 0) {
        this.direction = 'up';
        return floorsAbove[0];
      }
    }

    return this.requestQueue.sort((a, b) => 
      Math.abs(a - currentFloor) - Math.abs(b - currentFloor)
    )[0];
  }

  addRequest(floor) {
  if (typeof floor !== 'number' || floor < 1 || this.maintenanceMode) {
    return false
  }
  
  if (floor === this.currentFloor) {
    console.log(`E${this.id}: Already at floor ${floor}`)
    return true
  }
  
  if (!this.requestQueue.includes(floor)) {
    this.requestQueue.push(floor)
    console.log(`E${this.id}: Added floor ${floor}. Queue: [${this.requestQueue.join(', ')}]`)
    if (this.state === 'idle') {
      this.processNextDestination()
    }
    
    return true
  }
  
  return false
}

  addPassenger(passenger) {
    if (this.passengers.length < this.capacity) {
      this.passengers.push(passenger);
      this.addRequest(passenger.destinationFloor);
      return true;
    }
    return false;
  }

  removePassenger(passengerId) {
    const index = this.passengers.findIndex(p => p.id === passengerId);
    if (index !== -1) {
      return this.passengers.splice(index, 1)[0];
    }
    return null;
  }

  getPassengersForFloor(floor) {
    return this.passengers.filter(p => p.destinationFloor === floor);
  }

  isIdle() {
    return this.state === 'idle' && this.requestQueue.length === 0;
  }

  isFull() {
    return this.passengers.length >= this.capacity;
  }

  getLoad() {
    return this.passengers.length / this.capacity;
  }

  getUtilization() {
    const now = Date.now();
    if (now - this.utilizationCache.lastCalculated < 1000) {
      return this.utilizationCache.value;
    }
    
    const isActive = this.state !== 'idle' || 
                    this.requestQueue.length > 0 || 
                    this.passengers.length > 0 ||
                    this.maintenanceMode;
    
    this.utilizationCache = {
      value: isActive ? 1 : 0,
      lastCalculated: now
    };
    
    return this.utilizationCache.value;
  }

  getDetailedUtilization() {
    const capacityUtilization = (this.passengers.length / this.capacity) * 100;
    const workloadUtilization = Math.min(100, (this.requestQueue.length / 10) * 100);
    const currentStateUtilization = this.getUtilization() * 100;
    
    return {
      capacityUtilization,
      workloadUtilization,
      currentStateUtilization,
      combinedUtilization: (capacityUtilization + workloadUtilization + currentStateUtilization) / 3
    };
  }

  setMaintenance(maintenance) {
    this.maintenanceMode = maintenance;
    if (maintenance) {
      this.state = 'maintenance';
      this.requestQueue = [];
      this.passengers = [];
      this.direction = 'idle';
      this.isMoving = false;
    }
  }

  getStatus() {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      targetFloor: this.targetFloor,
      state: this.state,
      direction: this.direction,
      passengers: [...this.passengers], 
      capacity: this.capacity,
      doorOpen: this.doorOpen,
      requestQueue: [...this.requestQueue], 
      totalDistance: this.totalDistance,
      totalTrips: this.totalTrips,
      maintenanceMode: this.maintenanceMode,
      color: this.color,
      load: this.getLoad(),
      utilization: this.getUtilization(),
      passengerCount: this.passengers.length,
      queueLength: this.requestQueue.length,
      isMoving: this.isMoving,
      isIdle: this.isIdle()
    };
  }

  addMultipleRequests(floors) {
    const added = [];
    floors.forEach(floor => {
      if (this.addRequest(floor)) {
        added.push(floor);
      }
    });
    return added;
  }
  clearCompletedRequests() {
    const beforeLength = this.requestQueue.length;
    this.requestQueue = this.requestQueue.filter(floor => floor !== this.currentFloor);
    const cleared = beforeLength - this.requestQueue.length;
    
    if (cleared > 0) {
      console.log(`E${this.id}: Cleared ${cleared} completed requests`);
    }
    
    return cleared;
  }
}

module.exports = OptimizedElevator;