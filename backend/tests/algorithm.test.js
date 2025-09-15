const HybridScheduler = require('../src/algorithms/hybridScheduler')
const ScanAlgorithm = require('../src/algorithms/scanAlgorithm')
const Elevator = require('../src/models/Elevator')
const Request = require('../src/models/Request')

describe('Elevator Scheduling Algorithms', () => {
  let elevators
  let requests
  let hybridScheduler
  let scanAlgorithm

  beforeEach(() => {
    hybridScheduler = new HybridScheduler()
    scanAlgorithm = new ScanAlgorithm()
    
    // Create test elevators
    elevators = [
      new Elevator(0, 8, '#3b82f6'),
      new Elevator(1, 8, '#8b5cf6'),
      new Elevator(2, 8, '#10b981')
    ]
    
    // Create test requests
    requests = [
      new Request({
        id: 'req1',
        originFloor: 1,
        destinationFloor: 10,
        direction: 'up',
        priority: 2
      }),
      new Request({
        id: 'req2',
        originFloor: 15,
        destinationFloor: 5,
        direction: 'down',
        priority: 2
      }),
      new Request({
        id: 'req3',
        originFloor: 8,
        destinationFloor: 12,
        direction: 'up',
        priority: 1
      })
    ]
  })

  describe('Hybrid Scheduler', () => {
    test('should assign requests to optimal elevators', () => {
      hybridScheduler.optimizeRoutes(elevators, requests)
      
      const assignedRequests = requests.filter(r => r.assignedElevator !== null)
      expect(assignedRequests.length).toBeGreaterThan(0)
    })

    test('should handle starvation prevention', () => {
      // Simulate old request
      requests[0].timestamp = Date.now() - 70000 // 70 seconds ago
      
      hybridScheduler.preventStarvation(requests, elevators)
      
      expect(requests[0].assignedElevator).not.toBeNull()
      expect(requests[0].priority).toBe(5)
    })

    test('should position idle elevators optimally', () => {
      const initialPositions = elevators.map(e => e.currentFloor)
      
      hybridScheduler.positionIdleElevators(elevators, 15)
      
      // Check if at least one elevator moved
      const finalPositions = elevators.map(e => e.targetFloor || e.currentFloor)
      expect(finalPositions).not.toEqual(initialPositions)
    })
  })

  describe('SCAN Algorithm', () => {
    test('should assign requests using SCAN logic', () => {
      scanAlgorithm.assignRequests(elevators, requests)
      
      const assignedRequests = requests.filter(r => r.assignedElevator !== null)
      expect(assignedRequests.length).toBeGreaterThan(0)
    })

    test('should prefer elevators moving in same direction', () => {
      elevators[0].direction = 'up'
      elevators[0].currentFloor = 5
      elevators[1].direction = 'down'
      elevators[1].currentFloor = 12
      
      const upRequest = new Request({
        originFloor: 7,
        destinationFloor: 10,
        direction: 'up'
      })
      
      const bestElevator = scanAlgorithm.findBestElevatorSCAN(upRequest, elevators)
      expect(bestElevator.id).toBe(0) // Should prefer elevator moving up
    })
  })

  describe('Performance Comparison', () => {
    test('should generate performance metrics', () => {
      hybridScheduler.optimizeRoutes(elevators, requests)
      const hybridMetrics = hybridScheduler.getSchedulingMetrics(elevators, requests)
      
      scanAlgorithm.assignRequests(elevators, requests)
      const scanMetrics = scanAlgorithm.getMetrics(elevators, requests)
      
      expect(hybridMetrics).toHaveProperty('algorithm')
      expect(hybridMetrics).toHaveProperty('averageWaitTime')
      expect(scanMetrics).toHaveProperty('algorithm')
      expect(scanMetrics).toHaveProperty('averageWaitTime')
    })
  })
})