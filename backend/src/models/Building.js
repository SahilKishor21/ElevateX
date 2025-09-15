class Building {
  constructor(numFloors = 15) {
    this.numFloors = numFloors
    this.floors = Array.from({ length: numFloors }, (_, i) => ({
      number: i + 1,
      upRequests: [],
      downRequests: [],
      waitingPassengers: []
    }))
  }

  addFloorRequest(floor, direction) {
    if (floor < 1 || floor > this.numFloors) return false

    const floorData = this.floors[floor - 1]
    const requests = direction === 'up' ? floorData.upRequests : floorData.downRequests

    if (!requests.some(req => req.active)) {
      requests.push({
        floor,
        direction,
        timestamp: Date.now(),
        active: true
      })
      return true
    }
    return false
  }

  removeFloorRequest(floor, direction) {
    if (floor < 1 || floor > this.numFloors) return false

    const floorData = this.floors[floor - 1]
    if (direction === 'up') {
      floorData.upRequests = []
    } else {
      floorData.downRequests = []
    }
    return true
  }

  getFloorRequests() {
    const allRequests = []
    this.floors.forEach((floor, index) => {
      floor.upRequests.forEach(req => allRequests.push(req))
      floor.downRequests.forEach(req => allRequests.push(req))
    })
    return allRequests
  }

  getTrafficPattern() {
    const hour = new Date().getHours()
    
    if (hour >= 8 && hour <= 10) {
      return {
        type: 'morning_rush',
        primaryDirection: 'up',
        hotspotFloors: [1],
        intensity: 0.8
      }
    }
    
    if (hour >= 12 && hour <= 14) {
      return {
        type: 'lunch_time',
        primaryDirection: 'mixed',
        hotspotFloors: [1, Math.floor(this.numFloors / 2)],
        intensity: 0.5
      }
    }
    
    if (hour >= 17 && hour <= 19) {
      return {
        type: 'evening_rush',
        primaryDirection: 'down',
        hotspotFloors: [this.numFloors],
        intensity: 0.8
      }
    }
    
    return {
      type: 'normal',
      primaryDirection: 'mixed',
      hotspotFloors: [],
      intensity: 0.3
    }
  }
}

module.exports = Building