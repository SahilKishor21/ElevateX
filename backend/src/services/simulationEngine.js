const Request = require("../models/Request");
const ScanAlgorithm = require("../algorithms/scanAlgorithm");
const MetricsService = require("./metricsService");
const HybridScheduler = require("../algorithms/hybridScheduler");
const Elevator = require("../models/Elevator");
const { DEFAULT_CONFIG } = require("../utils/constants");

class SimulationEngine {
  constructor() {
    this.elevators = [];
    this.activeRequests = [];
    this.servedRequestsHistory = [];
    this.floorRequests = [];
    this.config = { ...DEFAULT_CONFIG };
    this.isRunning = false;
    this.currentTime = 0;
    this.startTime = null;
    this.intervalId = null;
    this.hybridScheduler = new HybridScheduler();
    this.scanAlgorithm = new ScanAlgorithm();
    this.currentAlgorithm = "hybrid";
    this.scheduler = this.hybridScheduler;
    this.metricsService = new MetricsService();
    this.requestIdCounter = 0;
    this.requestBuffer = [];
    this.lastOptimizationTime = 0;
    this.algorithmMetrics = {
      hybrid: { totalRequests: 0, servedRequests: 0, totalDistance: 0 },
      scan: { totalRequests: 0, servedRequests: 0, totalDistance: 0 },
    };
    this.SPEED_OPTIONS = [
      { value: 1, label: "1x Normal" },
      { value: 2, label: "2x Fast" },
      { value: 5, label: "5x Very Fast" },
      { value: 10, label: "10x Ultra Fast" },
    ];
    this.assignmentMetrics = {
      lobbyToUpperRequests: 0,
      upperToLobbyRequests: 0,
      peakHourRequests: 0,
      starvationEvents: 0,
      thirtySecondEscalations: 0,
    };
    this.debug = process.env.NODE_ENV === 'development';
  }

  switchAlgorithm(algorithm) {
    if (!["hybrid", "scan"].includes(algorithm)) {
      throw new Error('Invalid algorithm. Must be "hybrid" or "scan"');
    }
    if (this.debug) {
      console.log(`Switching from ${this.currentAlgorithm} to ${algorithm}`);
    }
    this.currentAlgorithm = algorithm;
    this.scheduler =
      algorithm === "hybrid" ? this.hybridScheduler : this.scanAlgorithm;
    if (algorithm === "scan") {
      this.scanAlgorithm.resetScanDirections();
      if (this.debug) {
        console.log("SCAN algorithm initialized with fresh scan directions");
      }
    }
    this.activeRequests.forEach((request) => {
      if (request.isActive && !request.isServed) {
        request.assignedElevator = null;
        if (this.debug) {
          console.log(
            `Cleared assignment for request ${request.id} to allow ${algorithm} reassignment`
          );
        }
      }
    });
    if (this.debug) {
      console.log(`Algorithm switched to: ${algorithm}`);
    }
    return {
      success: true,
      algorithm: this.currentAlgorithm,
      schedulerClass: this.scheduler.constructor.name,
    };
  }

  getCurrentAlgorithm() {
    return this.currentAlgorithm;
  }

  getAllRequests() {
    return [...this.activeRequests, ...this.servedRequestsHistory];
  }

  getHistoricalData() {
    return (
      this.metricsService.historicalData.slice(-1)[0] || {
        timestamp: Date.now(),
        metrics: this.getPerformanceMetrics(),
        requests: this.activeRequests.length,
      }
    );
  }

  getSystemLoad() {
    const activeRequestsCount = this.activeRequests.length;
    const bufferedRequestsCount = this.requestBuffer.length;
    const elevatorUtilization = this.elevators.map((e) => e.getUtilization());
    const averageLoad =
      this.elevators.length > 0
        ? this.elevators.reduce((sum, e) => sum + e.getLoad(), 0) /
          this.elevators.length
        : 0;
    const overCapacityElevators = this.elevators.filter(
      (e) => e.passengers.length > e.capacity
    ).length;
    const totalSystemCapacity =
      this.elevators.length * (this.config.capacity || 8);
    const currentOccupancy = this.elevators.reduce(
      (sum, e) => sum + (e.passengers?.length || 0),
      0
    );
    const systemUtilization =
      totalSystemCapacity > 0 ? currentOccupancy / totalSystemCapacity : 0;
    const performanceStatus = this.getPerformanceStatus(
      activeRequestsCount,
      systemUtilization,
      averageLoad
    );
    return {
      activeRequests: activeRequestsCount,
      bufferedRequests: bufferedRequestsCount,
      elevatorUtilization,
      averageLoad,
      overCapacityElevators,
      systemUtilization,
      currentOccupancy,
      totalSystemCapacity,
      performanceStatus,
      isHighLoad: activeRequestsCount > this.elevators.length * 15,
    };
  }

  getPerformanceStatus(activeRequests, systemUtilization, averageLoad) {
    if (
      activeRequests > this.elevators.length * 20 ||
      systemUtilization > 0.9
    ) {
      return {
        status: "overloaded",
        color: "red",
        message: "System at capacity - expect delays",
      };
    }
    if (
      activeRequests > this.elevators.length * 15 ||
      systemUtilization > 0.7
    ) {
      return {
        status: "high_load",
        color: "orange",
        message: "High system load",
      };
    }
    if (activeRequests > this.elevators.length * 8 || systemUtilization > 0.5) {
      return {
        status: "moderate_load",
        color: "yellow",
        message: "Moderate system load",
      };
    }
    return {
      status: "normal",
      color: "green",
      message: "System operating normally",
    };
  }

  emergencyStop() {
    if (this.debug) {
      console.log("Emergency stop initiated");
    }
    this.stop();
    this.activeRequests = [];
    this.requestBuffer = [];
    this.floorRequests = [];
    this.elevators.forEach((elevator) => {
      elevator.state = "idle";
      elevator.requestQueue = [];
      elevator.targetFloor = null;
      elevator.passengers = [];
      elevator.doorOpen = false;
    });
    if (this.debug) {
      console.log("Emergency stop completed - all systems cleared");
    }
  }

  initialize(config = {}) {
    this.config = { ...this.config, ...config };
    this.elevators = [];
    this.activeRequests = [];
    this.servedRequestsHistory = [];
    this.floorRequests = [];
    this.requestBuffer = [];
    this.currentTime = 0;
    this.algorithmMetrics = {
      hybrid: { totalRequests: 0, servedRequests: 0, totalDistance: 0 },
      scan: { totalRequests: 0, servedRequests: 0, totalDistance: 0 },
    };
    this.assignmentMetrics = {
      lobbyToUpperRequests: 0,
      upperToLobbyRequests: 0,
      peakHourRequests: 0,
      starvationEvents: 0,
      thirtySecondEscalations: 0,
    };
    for (let i = 0; i < this.config.numElevators; i++) {
      const colors = [
        "#3b82f6",
        "#8b5cf6",
        "#10b981",
        "#f97316",
        "#ef4444",
        "#06b6d4",
        "#ec4899",
        "#84cc16",
      ];
      const elevator = new Elevator(
        i,
        this.config.capacity,
        colors[i % colors.length]
      );
      if (typeof elevator.setSpeed === "function") {
        elevator.setSpeed(this.config.speed || 1);
      }
      this.elevators.push(elevator);
    }
    if (this.currentAlgorithm === "scan") {
      this.scanAlgorithm.resetScanDirections();
    }
    this.metricsService.reset();
    if (this.debug) {
      console.log(
        `Initialized ${this.config.numElevators} elevators with ${
          this.currentAlgorithm
        } algorithm, speed: ${this.config.speed || 1}x`
      );
    }
  }

  start() {
    if (this.isRunning) return false;
    this.isRunning = true;
    this.startTime = Date.now();
    if (this.debug) {
      console.log(
        `Starting simulation with ${this.currentAlgorithm} algorithm, request frequency: ${this.config.requestFrequency}/min`
      );
    }
    if (this.config.requestFrequency > 0) {
      this.positionElevatorsInitially();
      if (this.debug) {
        console.log("Initial elevator positioning enabled (request frequency > 0)");
      }
    } else {
      if (this.debug) {
        console.log("Initial elevator positioning disabled (request frequency = 0)");
      }
      this.activeRequests = [];
      this.floorRequests = [];
      this.requestBuffer = [];
    }
    this.intervalId = setInterval(() => {
      this.update();
    }, DEFAULT_CONFIG.SIMULATION_INTERVAL);
    if (this.config.requestFrequency > 0) {
      this.requestGeneratorInterval = setInterval(() => {
        if (Math.random() < this.config.requestFrequency / 600) {
          this.generateRandomRequest();
        }
      }, DEFAULT_CONFIG.SIMULATION_INTERVAL);
      if (this.debug) {
        console.log("Automatic request generation enabled");
      }
    } else {
      if (this.debug) {
        console.log("Automatic request generation disabled (frequency = 0)");
      }
      this.requestGeneratorInterval = null;
    }
    return true;
  }

  positionElevatorsInitially() {
    const hour = new Date().getHours();
    this.elevators.forEach((elevator, index) => {
      let targetFloor = 1;
      if (hour >= 8 && hour <= 10) {
        targetFloor =
          index % 2 === 0 ? 1 : Math.floor(this.config.numFloors * 0.3) + 1;
      } else if (hour >= 17 && hour <= 19) {
        targetFloor = Math.floor(this.config.numFloors * 0.7) + index;
        targetFloor = Math.min(targetFloor, this.config.numFloors);
      } else if (hour >= 12 && hour <= 14) {
        targetFloor =
          Math.floor(this.config.numFloors / 2) +
          (index - Math.floor(this.elevators.length / 2));
        targetFloor = Math.max(1, Math.min(this.config.numFloors, targetFloor));
      } else {
        targetFloor =
          Math.floor(
            ((index + 1) * this.config.numFloors) / (this.elevators.length + 1)
          ) + 1;
      }
      if (elevator.currentFloor !== targetFloor) {
        if (this.debug) {
          console.log(
            `Positioning E${elevator.id} to floor ${targetFloor} (${hour}:00 strategy)`
          );
        }
        elevator.addRequest(targetFloor);
      }
    });
  }

  stop() {
    if (!this.isRunning) return false;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.requestGeneratorInterval) {
      clearInterval(this.requestGeneratorInterval);
      this.requestGeneratorInterval = null;
    }
    if (this.debug) {
      console.log(`Simulation stopped. Algorithm: ${this.currentAlgorithm}`);
    }
    return true;
  }

  reset() {
    this.stop();
    this.floorRequests = [];
    this.activeRequests = [];
    this.servedRequestsHistory = [];
    this.requestBuffer = [];
    this.elevators.forEach((elevator) => {
      elevator.currentFloor = 1;
      elevator.targetFloor = null;
      elevator.state = "idle";
      elevator.direction = "idle";
      elevator.passengers = [];
      elevator.requestQueue = [];
      elevator.doorOpen = false;
      elevator.loadingStartTime = null;
      elevator.doorOpenTime = null;
    });
    if (this.debug) {
      console.log("System completely reset - all elevators at floor 1, idle state");
    }
    this.initialize(this.config);
  }

  removeFloorRequest(floor, direction) {
    this.floorRequests = this.floorRequests.filter(
      (req) =>
        !(req.floor === floor && req.direction === direction && req.active)
    );
  }

  update() {
    const updateStart = Date.now();
    this.currentTime = Date.now() - this.startTime;
    if (this.requestBuffer.length > 0) {
      this.processRequestBuffer();
    }
    this.activeRequests.forEach(request => {
      if (request.isActive && !request.isServed && typeof request.updateWaitTime === 'function') {
        request.updateWaitTime();
        if (request.waitTime > 30000 && !request.thirtySecondEscalated) {
          request.thirtySecondEscalated = true;
          this.assignmentMetrics.thirtySecondEscalations++;
          if (this.debug) {
            console.log(`Request escalated after 30 seconds: ${request.id}`);
          }
        }
      }
    });
    const stuckRequests = this.activeRequests.filter(r => {
      if (!r.isActive || r.isServed) return false;
      if (r.assignedElevator !== null && r.assignedElevator !== undefined) {
        const elevator = this.elevators[r.assignedElevator];
        if (elevator) {
          const hasInQueue = elevator.requestQueue && 
                            elevator.requestQueue.includes(r.originFloor);
          const isAtFloor = elevator.currentFloor === r.originFloor && 
                           elevator.state === 'loading';
          if (hasInQueue || isAtFloor) {
            return false;
          }
        }
        if (this.debug) {
          console.log(`STUCK REQUEST: ${r.id} assigned to E${r.assignedElevator} but not in queue`);
        }
        return true;
      }
      return r.waitTime > 5000 && !r.assignedElevator;
    });
    if (stuckRequests.length > 0) {
      if (this.debug) {
        console.log(`CRITICAL: ${stuckRequests.length} stuck requests detected, forcing reassignment`);
      }
      stuckRequests.forEach(request => {
        request.assignedElevator = null;
      });
    }
    const unassignedRequests = this.activeRequests.filter(r => 
      r.isActive && 
      !r.isServed && 
      (r.assignedElevator === null || r.assignedElevator === undefined)
    );
    const idleElevators = this.elevators.filter(e => 
      e.state === 'idle' && 
      (!e.requestQueue || e.requestQueue.length === 0) &&
      !e.maintenanceMode
    );
    const starvingRequests = this.activeRequests.filter(r => 
      r.isActive && !r.isServed && r.waitTime > 60000
    );
    if (idleElevators.length > 0 && starvingRequests.length > 0) {
      if (this.debug) {
        console.log(`EMERGENCY: ${idleElevators.length} idle elevators while ${starvingRequests.length} requests starving!`);
      }
      starvingRequests.forEach((request, index) => {
        if (index < idleElevators.length) {
          const elevator = idleElevators[index];
          if (this.debug) {
            console.log(`FORCE ASSIGNING: Starving request ${request.id} to idle E${elevator.id}`);
          }
          request.assignedElevator = elevator.id;
          request.assign(elevator.id);
          elevator.addRequest(request.originFloor);
          if (request.destinationFloor) {
            elevator.addRequest(request.destinationFloor);
          }
          if (elevator.state === 'idle' && elevator.currentFloor !== request.originFloor) {
            elevator.moveTo(request.originFloor);
          }
        }
      });
    }
    if (unassignedRequests.length > 0) {
      if (this.debug) {
        console.log(`Processing ${unassignedRequests.length} unassigned requests (${this.activeRequests.length} total active)`);
      }
      if (this.currentAlgorithm === 'hybrid') {
        if (typeof this.scheduler.optimizeRoutes === 'function') {
          this.scheduler.optimizeRoutes(this.elevators, this.activeRequests);
        } else {
          this.assignRequestsBasic(this.elevators, unassignedRequests);
        }
        if (this.config.requestFrequency > 0) {
          this.positionIdleElevators();
        }
      } else if (this.currentAlgorithm === 'scan') {
        if (typeof this.scheduler.assignRequests === 'function') {
          this.scheduler.assignRequests(this.elevators, this.activeRequests);
        } else {
          this.assignRequestsBasic(this.elevators, unassignedRequests);
        }
      }
      this.syncElevatorTargetsWithAssignments();
    }
    this.elevators.forEach(elevator => {
      if (this.currentAlgorithm === 'scan' && elevator.requestQueue.length > 1) {
        if (typeof this.scheduler.sortRequestQueue === 'function') {
          elevator.requestQueue = this.scheduler.sortRequestQueue(elevator, elevator.requestQueue);
        } else {
          elevator.requestQueue = this.sortRequestQueueScan(elevator, elevator.requestQueue);
        }
      }
      elevator.update();
      if (elevator.state === 'loading' && elevator.doorOpen) {
        this.handleElevatorAtFloor(elevator);
      }
    });
    if (unassignedRequests.length === 0 && this.config.requestFrequency > 0) {
      this.positionIdleElevators();
    }
    this.cleanup();
    this.algorithmMetrics[this.currentAlgorithm].totalDistance = this.elevators.reduce(
      (sum, e) => sum + (e.totalDistance || 0), 0
    );
    this.metricsService.update(this.elevators, this.activeRequests);
    this.updateAssignmentMetrics();
    if (this.debug && this.activeRequests.length > 50) {
      const processingTime = Date.now() - updateStart;
      console.log(`High-volume processing: ${this.activeRequests.length} requests, ${processingTime}ms`);
    }
  }

  syncElevatorTargetsWithAssignments() {
    if (this.debug) {
      console.log("Syncing elevator targets with assignments");
    }
    this.activeRequests.forEach((request) => {
      if (
        request.assignedElevator !== null &&
        request.isActive &&
        !request.isServed
      ) {
        const elevator = this.elevators[request.assignedElevator];
        if (elevator) {
          if (
            elevator.state === "idle" &&
            elevator.currentFloor !== request.originFloor
          ) {
            if (this.debug) {
              console.log(
                `E${elevator.id}: Starting movement to pickup floor ${request.originFloor}`
              );
            }
            elevator.addRequest(request.originFloor);
          }
          else if (
            !elevator.requestQueue.includes(request.originFloor) &&
            elevator.currentFloor !== request.originFloor
          ) {
            if (this.debug) {
              console.log(
                `E${elevator.id}: Adding pickup floor ${request.originFloor} to queue`
              );
            }
            elevator.addRequest(request.originFloor);
          }
        }
      }
    });
  }

  handleElevatorAtFloor(elevator) {
    if (this.debug) {
      console.log(`E${elevator.id} doors open at floor ${elevator.currentFloor}`);
    }
    const exitingPassengers = elevator.passengers.filter(
      (p) => p.destinationFloor === elevator.currentFloor
    );
    exitingPassengers.forEach((passenger) => {
      elevator.removePassenger(passenger.id);
      if (this.debug) {
        console.log(`Passenger ${passenger.id} exited at floor ${elevator.currentFloor}`);
      }
    });
    const boardingRequests = this.activeRequests.filter(
      (req) =>
        req.originFloor === elevator.currentFloor &&
        req.assignedElevator === elevator.id &&
        req.isActive &&
        !req.isServed
    );
    if (this.debug && boardingRequests.length > 0) {
      console.log(`${boardingRequests.length} passengers boarding E${elevator.id}`);
    }
    boardingRequests.forEach((request) => {
      if (elevator.passengers.length < elevator.capacity) {
        if (typeof request.updateWaitTime === "function") {
          request.updateWaitTime();
        }
        const finalWaitTime = request.waitTime;
        if (finalWaitTime > 60000) {
          this.assignmentMetrics.starvationEvents++;
          if (this.debug) {
            console.log(`STARVATION EVENT: Request ${request.id} waited ${Math.round(finalWaitTime/1000)}s`);
          }
        }
        const passenger = {
          id: request.id,
          originFloor: request.originFloor,
          destinationFloor: request.destinationFloor,
          boardTime: Date.now(),
          waitTime: finalWaitTime,
          priority: request.priority,
          isRealRequest: true,
        };
        elevator.passengers.push(passenger);
        elevator.addRequest(passenger.destinationFloor);
        this.algorithmMetrics[this.currentAlgorithm].servedRequests++;
        request.finalWaitTime = finalWaitTime;
        request.serve();
        this.metricsService.addRequestToHistory(request);
        if (request.direction) {
          this.removeFloorRequest(request.originFloor, request.direction);
        }
        if (this.debug) {
          console.log(
            `Request served: ${request.originFloor}→${
              request.destinationFloor
            }, wait: ${Math.round(finalWaitTime / 1000)}s`
          );
        }
      }
    });
  }

  positionIdleElevators() {
    if (this.config.requestFrequency === 0) {
      if (this.debug) {
        console.log("Idle elevator positioning disabled (request frequency = 0)");
      }
      return;
    }
    const hour = new Date().getHours();
    const isPeakHour = [8, 9, 12, 13, 17, 18].includes(hour);
    if (this.currentAlgorithm === "hybrid") {
      const idleElevators = this.elevators.filter(
        (e) =>
          e.state === "idle" &&
          e.requestQueue.length === 0 &&
          !e.targetFloor &&
          !this.activeRequests.some(
            (r) => r.assignedElevator === e.id && r.isActive && !r.isServed
          )
      );
      if (idleElevators.length > 0) {
        if (this.debug) {
          console.log(
            `Positioning ${idleElevators.length} idle elevators (${
              isPeakHour ? "PEAK" : "normal"
            })`
          );
        }
        idleElevators.forEach((elevator, index) => {
          let targetFloor = 1;
          if (isPeakHour) {
            if (hour >= 8 && hour <= 10) {
              targetFloor =
                index % 3 === 0
                  ? 1
                  : Math.floor(this.config.numFloors * 0.2) + index;
            } else if (hour >= 17 && hour <= 19) {
              targetFloor = Math.floor(this.config.numFloors * 0.8) - index;
            } else {
              targetFloor =
                Math.floor(this.config.numFloors / 2) +
                (index - Math.floor(idleElevators.length / 2));
            }
          } else {
            targetFloor =
              Math.floor(
                ((index + 1) * this.config.numFloors) /
                  (idleElevators.length + 1)
              ) + 1;
          }
          targetFloor = Math.max(
            1,
            Math.min(this.config.numFloors, targetFloor)
          );
          if (elevator.currentFloor !== targetFloor) {
            if (this.debug) {
              console.log(`Positioning idle E${elevator.id} to floor ${targetFloor}`);
            }
            elevator.addRequest(targetFloor);
          }
        });
      }
    }
  }

  cleanup() {
    const servedRequests = this.activeRequests.filter((req) => req.isServed);
    this.activeRequests = this.activeRequests.filter((req) => req.isActive);
    if (servedRequests.length > 0) {
      this.servedRequestsHistory.push(...servedRequests);
      if (this.servedRequestsHistory.length > 100) {
        this.servedRequestsHistory = this.servedRequestsHistory.slice(-100);
      }
      if (this.debug) {
        console.log(`Cleaned up ${servedRequests.length} served requests`);
      }
    }
    this.floorRequests = this.floorRequests.filter((req) => {
      const isExpired = Date.now() - req.timestamp > 120000;
      return !isExpired && req.active;
    });
  }

  addRequest(requestData) {
    if (this.activeRequests.length > this.elevators.length * 30) {
      if (this.debug) {
        console.warn("System overloaded - request buffered");
      }
      const request = new Request({
        ...requestData,
        id: `req_${++this.requestIdCounter}_${Date.now()}`,
      });
      this.requestBuffer.push(request);
      return request.id;
    }
    const request = new Request({
      ...requestData,
      id: `req_${++this.requestIdCounter}_${Date.now()}`,
    });
    this.algorithmMetrics[this.currentAlgorithm].totalRequests++;
    if (request.originFloor === 1 && request.destinationFloor > 5) {
      this.assignmentMetrics.lobbyToUpperRequests++;
      if (this.debug) {
        console.log(
          `Lobby-to-upper request added. Total: ${this.assignmentMetrics.lobbyToUpperRequests}`
        );
      }
    } else if (request.originFloor > 5 && request.destinationFloor === 1) {
      this.assignmentMetrics.upperToLobbyRequests++;
      if (this.debug) {
        console.log(
          `Upper-to-lobby request added. Total: ${this.assignmentMetrics.upperToLobbyRequests}`
        );
      }
    }
    const hour = new Date().getHours();
    if ([8, 9, 12, 13, 17, 18].includes(hour)) {
      this.assignmentMetrics.peakHourRequests++;
      if (this.debug) {
        console.log(
          `Peak hour request added. Total: ${this.assignmentMetrics.peakHourRequests}`
        );
      }
    }
    if (this.debug) {
      console.log(
        `Request ${request.originFloor} → ${request.destinationFloor} (${this.currentAlgorithm})`
      );
    }
    this.activeRequests.push(request);
    if (request.direction) {
      this.addFloorRequest(request.originFloor, request.direction);
    }
    this.updateAssignmentMetrics();
    return request.id;
  }

  processRequestBuffer() {
    const systemLoad =
      this.activeRequests.length / (this.elevators.length * 10);
    const batchSize = systemLoad > 0.8 ? 25 : systemLoad > 0.5 ? 15 : 10;
    const batch = this.requestBuffer.splice(0, batchSize);
    if (this.debug) {
      console.log(
        `Processing request buffer: ${batch.length} requests (batch size: ${batchSize})`
      );
    }
    batch.forEach((request) => {
      this.activeRequests.push(request);
      if (request.direction) {
        this.addFloorRequest(request.originFloor, request.direction);
      }
    });
    if (this.requestBuffer.length > 100) {
      if (this.debug) {
        console.warn(`Large request buffer: ${this.requestBuffer.length} requests pending`);
      }
    }
  }

  addFloorRequest(floor, direction) {
    const existing = this.floorRequests.find(
      (req) => req.floor === floor && req.direction === direction && req.active
    );
    if (!existing) {
      this.floorRequests.push({
        floor,
        direction,
        timestamp: Date.now(),
        active: true,
      });
    }
  }

  generateRandomRequest() {
    if (this.activeRequests.length > this.elevators.length * 25) {
      if (this.debug) {
        console.log("System at capacity - throttling random request generation");
      }
      return;
    }
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    let originFloor,
      destinationFloor,
      priority = 2;
    if (hour >= 8 && hour <= 10) {
      const peakIntensity = this.getMorningRushIntensity(hour, minute);
      if (Math.random() < peakIntensity) {
        originFloor = 1;
        destinationFloor = this.getWeightedUpperFloor();
        priority = 3;
        if (this.debug) {
          console.log(
            `Morning rush request ${originFloor}→${destinationFloor} (intensity: ${(
              peakIntensity * 100
            ).toFixed(0)}%)`
          );
        }
      } else {
        originFloor = Math.floor(Math.random() * this.config.numFloors) + 1;
        destinationFloor =
          Math.floor(Math.random() * this.config.numFloors) + 1;
        while (destinationFloor === originFloor) {
          destinationFloor =
            Math.floor(Math.random() * this.config.numFloors) + 1;
        }
      }
    }
    else if (hour >= 17 && hour <= 19) {
      const peakIntensity = this.getEveningRushIntensity(hour, minute);
      if (Math.random() < peakIntensity) {
        originFloor = this.getWeightedUpperFloor();
        destinationFloor = 1;
        priority = 3;
        if (this.debug) {
          console.log(
            `Evening rush request ${originFloor}→${destinationFloor} (intensity: ${(
              peakIntensity * 100
            ).toFixed(0)}%)`
          );
        }
      } else {
        originFloor = Math.floor(Math.random() * this.config.numFloors) + 1;
        destinationFloor =
          Math.floor(Math.random() * this.config.numFloors) + 1;
        while (destinationFloor === originFloor) {
          destinationFloor =
            Math.floor(Math.random() * this.config.numFloors) + 1;
        }
      }
    }
    else if (hour >= 12 && hour <= 14) {
      if (Math.random() < 0.4) {
        const midFloor = Math.floor(this.config.numFloors / 2);
        if (Math.random() < 0.5) {
          originFloor = 1;
          destinationFloor = midFloor + Math.floor(Math.random() * 3) - 1;
        } else {
          originFloor = midFloor + Math.floor(Math.random() * 3) - 1;
          destinationFloor = 1;
        }
      } else {
        originFloor = Math.floor(Math.random() * this.config.numFloors) + 1;
        destinationFloor =
          Math.floor(Math.random() * this.config.numFloors) + 1;
        while (destinationFloor === originFloor) {
          destinationFloor =
            Math.floor(Math.random() * this.config.numFloors) + 1;
        }
      }
    }
    else {
      originFloor = Math.floor(Math.random() * this.config.numFloors) + 1;
      destinationFloor = Math.floor(Math.random() * this.config.numFloors) + 1;
      while (destinationFloor === originFloor) {
        destinationFloor =
          Math.floor(Math.random() * this.config.numFloors) + 1;
      }
    }
    this.addRequest({
      type: "floor_call",
      originFloor,
      destinationFloor,
      direction: destinationFloor > originFloor ? "up" : "down",
      passengerCount: this.getRealisticPassengerCount(hour),
      priority,
      timestamp: Date.now(),
    });
  }

  getMorningRushIntensity(hour, minute) {
    if (hour === 9) {
      if (minute <= 15) return 0.75;
      if (minute <= 30) return 0.7;
      if (minute <= 45) return 0.65;
      return 0.55;
    }
    if (hour === 8) {
      if (minute >= 45) return 0.6;
      if (minute >= 30) return 0.5;
      return 0.4;
    }
    if (hour === 10 && minute <= 30) return 0.45;
    return 0.3;
  }

  getEveningRushIntensity(hour, minute) {
    if (hour === 18) {
      if (minute <= 15) return 0.7;
      if (minute <= 30) return 0.65;
      return 0.55;
    }
    if (hour === 17) {
      if (minute >= 30) return 0.6;
      return 0.5;
    }
    if (hour === 19 && minute <= 30) return 0.45;
    return 0.3;
  }

  getWeightedUpperFloor() {
    const floors = [];
    const totalFloors = this.config.numFloors;
    for (let floor = 2; floor <= totalFloors; floor++) {
      let weight = 1;
      if (
        floor >= Math.floor(totalFloors * 0.4) &&
        floor <= Math.floor(totalFloors * 0.8)
      ) {
        weight = 3;
      } else if (floor > Math.floor(totalFloors * 0.8)) {
        weight = 2;
      }
      for (let w = 0; w < weight; w++) {
        floors.push(floor);
      }
    }
    return floors[Math.floor(Math.random() * floors.length)];
  }

  getRealisticPassengerCount(hour) {
    if (hour >= 8 && hour <= 10) {
      return Math.random() < 0.8 ? 1 : 2;
    }
    if (hour >= 12 && hour <= 14) {
      const rand = Math.random();
      if (rand < 0.4) return 1;
      if (rand < 0.7) return 2;
      return 3;
    }
    if (hour >= 17 && hour <= 19) {
      return Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 2) + 2;
    }
    return Math.floor(Math.random() * 3) + 1;
  }

  updateAssignmentMetrics() {
    if (
      this.metricsService &&
      typeof this.metricsService.updateAssignmentMetrics === "function"
    ) {
      this.metricsService.updateAssignmentMetrics(this.assignmentMetrics);
      if (this.debug) {
        console.log(`Updated assignment metrics:`, this.assignmentMetrics);
      }
    }
  }

  getState() {
    const performanceMetrics = this.getPerformanceMetrics();
    const realTimeMetrics = this.getRealTimeMetrics();
    const assignmentCompliance = this.getAssignmentCompliance();
    return {
      elevators: this.elevators.map((e) => e.getStatus()),
      activeRequests: this.activeRequests.map((r) => r.getStatus()),
      floorRequests: this.floorRequests,
      isRunning: this.isRunning,
      currentTime: this.currentTime,
      config: this.config,
      currentAlgorithm: this.currentAlgorithm,
      algorithmMetrics: this.algorithmMetrics,
      assignmentMetrics: this.assignmentMetrics,
      performanceMetrics: performanceMetrics,
      realTimeMetrics: realTimeMetrics,
      assignmentCompliance: assignmentCompliance,
    };
  }

  getPerformanceMetrics() {
    const metrics = this.metricsService.getPerformanceMetrics();
    const assignmentMetrics = this.metricsService.getAssignmentMetrics();
    const assignmentCompliance = this.metricsService.getAssignmentCompliance();
    const result = {
      ...metrics,
      assignmentMetrics: assignmentMetrics,
      assignmentCompliance: assignmentCompliance.complianceScore,
      peakHourEfficiency: this.metricsService.calculatePeakHourEfficiency(),
      requestDistribution: this.metricsService.getRequestDistribution(),
    };
    if (this.debug && result.averageWaitTime > 0) {
      console.log(`Performance Metrics - Avg wait: ${result.averageWaitTime.toFixed(1)}s, Starvation: ${result.starvationCount}`);
    }
    return result;
  }

  getRealTimeMetrics() {
    const realTimeMetrics = this.metricsService.getRealTimeMetrics(
      this.elevators,
      this.activeRequests
    );
    return {
      ...realTimeMetrics,
      assignmentMetrics: this.assignmentMetrics,
      assignmentCompliance: this.getAssignmentCompliance(),
    };
  }

  updateConfig(newConfig) {
    if (this.isRunning) {
      const allowedRuntimeChanges = ["speed", "requestFrequency"];
      Object.keys(newConfig).forEach((key) => {
        if (allowedRuntimeChanges.includes(key)) {
          const oldValue = this.config[key];
          this.config[key] = newConfig[key];
          if (key === "speed") {
            if (this.debug) {
              console.log(`Updating simulation speed to ${newConfig[key]}x`);
            }
            this.elevators.forEach((elevator) => {
              if (typeof elevator.setSpeed === "function") {
                elevator.setSpeed(newConfig[key]);
              }
            });
          }
          if (key === "requestFrequency") {
            if (this.debug) {
              console.log(
                `Request frequency changed from ${oldValue} to ${newConfig[key]}`
              );
            }
            if (newConfig[key] === 0) {
              if (this.requestGeneratorInterval) {
                clearInterval(this.requestGeneratorInterval);
                this.requestGeneratorInterval = null;
              }
              if (this.debug) {
                console.log("Automatic request generation stopped");
              }
              this.activeRequests = this.activeRequests.filter(
                (r) => r.isServed || r.assignedElevator !== null
              );
              this.floorRequests = [];
              this.requestBuffer = [];
              if (this.debug) {
                console.log("Cleared pending automatic requests");
              }
            } else if (oldValue === 0 && newConfig[key] > 0) {
              this.requestGeneratorInterval = setInterval(() => {
                if (Math.random() < this.config.requestFrequency / 600) {
                  this.generateRandomRequest();
                }
              }, DEFAULT_CONFIG.SIMULATION_INTERVAL);
              if (this.debug) {
                console.log("Automatic request generation started");
              }
            }
          }
        }
      });
    } else {
      this.config = { ...this.config, ...newConfig };
      this.initialize(this.config);
    }
  }

  getSpeedOptions() {
    return this.SPEED_OPTIONS;
  }

  getAssignmentCompliance() {
    const totalRequests =
      this.assignmentMetrics.lobbyToUpperRequests +
      this.assignmentMetrics.upperToLobbyRequests;
    const lobbyTrafficPercentage =
      totalRequests > 0
        ? (this.assignmentMetrics.lobbyToUpperRequests / totalRequests) * 100
        : 0;
    return {
      lobbyTrafficPercentage,
      peakHourRequests: this.assignmentMetrics.peakHourRequests,
      starvationEvents: this.assignmentMetrics.starvationEvents,
      thirtySecondEscalations: this.assignmentMetrics.thirtySecondEscalations,
      complianceScore: this.calculateComplianceScore(),
    };
  }

  assignRequestsBasic(elevators, requests) {
    if (this.debug) {
      console.log(`Using basic assignment fallback for ${requests.length} requests`);
    }
    requests.forEach(request => {
      if (request.assignedElevator === null || request.assignedElevator === undefined) {
        let bestElevator = null;
        let bestScore = Infinity;
        elevators.forEach(elevator => {
          if (elevator.state === 'maintenance') return;
          const distance = Math.abs(elevator.currentFloor - request.originFloor);
          const load = elevator.requestQueue ? elevator.requestQueue.length : 0;
          const passengers = elevator.passengers ? elevator.passengers.length : 0;
          const score = distance + (load * 2) + (passengers * 0.5);
          if (score < bestScore) {
            bestScore = score;
            bestElevator = elevator;
          }
        });
        if (bestElevator) {
          request.assignedElevator = bestElevator.id;
          request.assign(bestElevator.id);
          if (this.debug) {
            console.log(`Basic assignment: Request ${request.id} assigned to E${bestElevator.id} (score: ${bestScore.toFixed(1)})`);
          }
        }
      }
    });
  }

  sortRequestQueueScan(elevator, requestQueue) {
    if (!requestQueue || requestQueue.length <= 1) return requestQueue;
    const currentFloor = elevator.currentFloor;
    const direction = elevator.direction || 'up';
    if (this.debug) {
      console.log(`SCAN sorting E${elevator.id} queue from floor ${currentFloor}, direction: ${direction}`);
    }
    const sortedQueue = [...requestQueue].sort((a, b) => {
      if (direction === 'up') {
        if (a >= currentFloor && b >= currentFloor) {
          return a - b;
        } else if (a < currentFloor && b < currentFloor) {
          return b - a;
        } else {
          return (a >= currentFloor) ? -1 : 1;
        }
      } else {
        if (a <= currentFloor && b <= currentFloor) {
          return b - a;
        } else if (a > currentFloor && b > currentFloor) {
          return a - b;
        } else {
          return (a <= currentFloor) ? -1 : 1;
        }
      }
    });
    if (this.debug && sortedQueue.toString() !== requestQueue.toString()) {
      console.log(`SCAN reordered E${elevator.id}: [${requestQueue.join(',')}] → [${sortedQueue.join(',')}]`);
    }
    return sortedQueue;
  }

  validateSchedulerMethods() {
    const requiredMethods = {
      hybrid: ['optimizeRoutes'],
      scan: ['assignRequests', 'sortRequestQueue']
    };
    const currentMethods = requiredMethods[this.currentAlgorithm] || [];
    const missingMethods = currentMethods.filter(method => 
      typeof this.scheduler[method] !== 'function'
    );
    if (missingMethods.length > 0 && this.debug) {
      console.warn(`${this.currentAlgorithm} scheduler missing methods:`, missingMethods);
      console.warn('Using fallback implementations');
    }
    return missingMethods.length === 0;
  }

  calculateComplianceScore() {
    let score = 100;
    score -= this.assignmentMetrics.starvationEvents * 10;
    if (this.assignmentMetrics.thirtySecondEscalations > 0) {
      score += Math.min(10, this.assignmentMetrics.thirtySecondEscalations * 2);
    }
    const totalDirectionalRequests =
      this.assignmentMetrics.lobbyToUpperRequests +
      this.assignmentMetrics.upperToLobbyRequests;
    if (totalDirectionalRequests > 10) {
      const lobbyPercentage =
        (this.assignmentMetrics.lobbyToUpperRequests /
          totalDirectionalRequests) *
        100;
      const hour = new Date().getHours();
      if (hour === 9 && lobbyPercentage > 50) {
        score += 15;
      }
    }
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = SimulationEngine;
