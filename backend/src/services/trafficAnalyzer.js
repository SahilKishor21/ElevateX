class TrafficAnalyzer {
  constructor() {
    this.trafficHistory = []
    this.patterns = new Map()
  }

  analyzeTrafficPattern(requests = [], timeWindow = 3600000) {
    const now = Date.now()
    const recentRequests = (requests || []).filter(r => {
      const ts = (r && r.timestamp) ? Number(r.timestamp) : NaN
      return !Number.isNaN(ts) && (now - ts < timeWindow)
    })

    const analysis = {
      totalRequests: recentRequests.length,
      requestsPerMinute: recentRequests.length / (timeWindow / 60000),
      floorDistribution: this.analyzeFloorDistribution(recentRequests),
      directionDistribution: this.analyzeDirectionDistribution(recentRequests),
      timeDistribution: this.analyzeTimeDistribution(recentRequests),
      predictedPattern: this.predictTrafficPattern(recentRequests)
    }

    this.updatePatternHistory(analysis)
    return analysis
  }

  analyzeFloorDistribution(requests = []) {
    const floorCount = {}
    const floorPairs = {}

    requests.forEach(request => {
      const origin = Number(request.originFloor)
      if (!Number.isNaN(origin)) {
        floorCount[origin] = (floorCount[origin] || 0) + 1
      }

      if (typeof request.destinationFloor !== 'undefined' && !Number.isNaN(Number(request.destinationFloor))) {
        const pair = `${request.originFloor}-${request.destinationFloor}`
        floorPairs[pair] = (floorPairs[pair] || 0) + 1
      }
    })

    const sortedFloors = Object.entries(floorCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    const sortedPairs = Object.entries(floorPairs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    return {
      hotspotFloors: sortedFloors,
      popularRoutes: sortedPairs,
      totalUniqueFloors: Object.keys(floorCount).length
    }
  }

  analyzeDirectionDistribution(requests = []) {
    const directions = { up: 0, down: 0, unknown: 0 }

    requests.forEach(request => {
      const dir = typeof request.direction === 'string' ? request.direction.toLowerCase() : null
      if (dir === 'up') {
        directions.up++
      } else if (dir === 'down') {
        directions.down++
      } else {
        directions.unknown++
      }
    })

    const total = requests.length || 0
    return {
      upPercentage: total > 0 ? (directions.up / total) * 100 : 0,
      downPercentage: total > 0 ? (directions.down / total) * 100 : 0,
      unknownPercentage: total > 0 ? (directions.unknown / total) * 100 : 0
    }
  }

  analyzeTimeDistribution(requests = []) {
    const hourlyDistribution = {}

    requests.forEach(request => {
      const ts = request.timestamp ? Number(request.timestamp) : NaN
      if (!Number.isNaN(ts)) {
        const hour = new Date(ts).getHours()
        hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
      }
    })

    const peakHour = Object.entries(hourlyDistribution)
      .reduce((peak, [hour, count]) => count > peak.count ? { hour: parseInt(hour), count } : peak, { hour: 0, count: 0 })

    return {
      hourlyDistribution,
      peakHour: peakHour.hour,
      peakHourRequests: peakHour.count
    }
  }

  predictTrafficPattern(recentRequests = []) {
    const currentHour = new Date().getHours()
    const dayOfWeek = new Date().getDay()

    // If we have recentRequests data, bias predictions by observed patterns:
    const floorDist = this.analyzeFloorDistribution(recentRequests)
    const hotFloors = (floorDist.hotspotFloors || []).map(([floor]) => Number(floor))

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        type: 'weekend',
        expectedIntensity: 0.3,
        primaryDirection: 'mixed',
        peakTimes: [10, 14, 19],
        recommendedPositioning: hotFloors.slice(0, 3)
      }
    }

    if (currentHour >= 7 && currentHour <= 10) {
      return {
        type: 'morning_rush',
        expectedIntensity: 0.9,
        primaryDirection: 'up',
        peakTimes: [8, 9],
        recommendedPositioning: hotFloors.length ? hotFloors.slice(0, 3) : [1, Math.max(2, Math.floor(3))]
      }
    }

    if (currentHour >= 11 && currentHour <= 14) {
      return {
        type: 'lunch_period',
        expectedIntensity: 0.6,
        primaryDirection: 'mixed',
        peakTimes: [12, 13],
        recommendedPositioning: hotFloors.length ? hotFloors.slice(0, 3) : [1, 8, 15]
      }
    }

    if (currentHour >= 16 && currentHour <= 19) {
      return {
        type: 'evening_rush',
        expectedIntensity: 0.8,
        primaryDirection: 'down',
        peakTimes: [17, 18],
        recommendedPositioning: hotFloors.length ? hotFloors.slice(0, 3) : [10, 15, 15]
      }
    }

    return {
      type: 'normal',
      expectedIntensity: 0.4,
      primaryDirection: 'mixed',
      peakTimes: [],
      recommendedPositioning: hotFloors.length ? hotFloors.slice(0, 3) : [1, 8, 15]
    }
  }

  updatePatternHistory(analysis) {
    const timestamp = Date.now()
    this.trafficHistory.push({
      timestamp,
      ...analysis
    })

    const oneDayAgo = timestamp - 86400000
    this.trafficHistory = this.trafficHistory.filter(h => h.timestamp > oneDayAgo)
  }

  getOptimalElevatorPositioning(numElevators, numFloors) {
    const pattern = this.predictTrafficPattern()
    const rec = (pattern.recommendedPositioning || []).map(f => {
      const fNum = Number(f)
      if (Number.isNaN(fNum)) return 1
      return Math.max(1, Math.min(numFloors, fNum))
    })
    if (rec.length >= numElevators) return rec.slice(0, numElevators)
    const positions = []
    for (let i = 0; i < numElevators; i++) {
      positions.push(Math.floor((i + 1) * numFloors / (numElevators + 1)))
    }
    return positions
  }

  shouldTriggerPreemptiveMovement(elevators = [], pattern) {
    const idleElevators = (elevators || []).filter(e => typeof e.isIdle === 'function' ? e.isIdle() : (e.state === 'idle'))

    if (idleElevators.length === 0) return false

    const recommendations = []

    if (pattern && pattern.type === 'morning_rush' && pattern.expectedIntensity > 0.7) {
      idleElevators.forEach((elevator, index) => {
        if (elevator && elevator.currentFloor !== 1 && index < 2) {
          recommendations.push({
            elevatorId: elevator.id,
            targetFloor: 1,
            reason: 'Preparing for morning rush - lobby positioning'
          })
        }
      })
    }

    if (pattern && pattern.type === 'evening_rush' && pattern.expectedIntensity > 0.6) {
      idleElevators.forEach((elevator, index) => {
        const upperFloor = Math.floor(Math.random() * 5) + 10
        if (elevator && elevator.currentFloor < 8 && index < 2) {
          recommendations.push({
            elevatorId: elevator.id,
            targetFloor: upperFloor,
            reason: 'Preparing for evening rush - upper floor positioning'
          })
        }
      })
    }

    return recommendations
  }
}

module.exports = TrafficAnalyzer