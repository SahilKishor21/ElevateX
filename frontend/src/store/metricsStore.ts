import { create } from 'zustand'
import { PerformanceMetrics, RealTimeMetrics, HistoricalData, Alert, ChartDataPoint, AssignmentMetrics, AssignmentCompliance } from '@/types/metrics'

interface MetricsStore {
  performanceMetrics: PerformanceMetrics
  realTimeMetrics: RealTimeMetrics
  historicalData: HistoricalData[]
  alerts: Alert[]
  chartData: {
    waitTime: ChartDataPoint[]
    utilization: ChartDataPoint[]
    throughput: ChartDataPoint[]
  }
  // ASSIGNMENT: Add assignment metrics to store
  assignmentMetrics?: AssignmentMetrics
  assignmentCompliance?: AssignmentCompliance
  
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void
  updateRealTimeMetrics: (metrics: Partial<RealTimeMetrics>) => void
  addHistoricalData: (data: HistoricalData) => void
  addAlert: (alert: Alert) => void
  acknowledgeAlert: (id: string) => void
  clearAlerts: () => void
  updateChartData: (type: keyof MetricsStore['chartData'], data: ChartDataPoint[]) => void
  // ASSIGNMENT: Add assignment metrics methods
  updateAssignmentMetrics: (metrics: AssignmentMetrics) => void
  updateAssignmentCompliance: (compliance: AssignmentCompliance) => void
  resetMetrics: () => void
}

const initialPerformanceMetrics: PerformanceMetrics = {
  averageWaitTime: 0,
  maxWaitTime: 0,
  averageTravelTime: 0,
  elevatorUtilization: [],
  throughput: 0,
  starvationCount: 0,
  userSatisfactionScore: 100,
  energyEfficiency: 85,
  responseTime: 0,
  systemReliability: 100,
  // ASSIGNMENT: Initialize new fields
  assignmentCompliance: 100,
  peakHourEfficiency: 100,
  requestDistribution: {
    lobbyToUpper: 0,
    upperToLobby: 0,
    interFloor: 0,
    total: 0
  }
}

const initialRealTimeMetrics: RealTimeMetrics = {
  currentTime: 0,
  activeRequests: 0,
  elevatorsInMotion: 0,
  averageLoadFactor: 0,
  peakFloorTraffic: [],
  systemLoad: 0,
  alertsCount: 0,
  // ASSIGNMENT: Initialize new fields
  starvationAlerts: 0,
  peakHourStatus: 'NORMAL',
  complianceScore: 100
}

export const useMetricsStore = create<MetricsStore>((set, get) => ({
  performanceMetrics: initialPerformanceMetrics,
  realTimeMetrics: initialRealTimeMetrics,
  historicalData: [],
  alerts: [],
  chartData: {
    waitTime: [],
    utilization: [],
    throughput: [],
  },
  // ASSIGNMENT: Initialize assignment metrics
  assignmentMetrics: {
    lobbyToUpperRequests: 0,
    upperToLobbyRequests: 0,
    peakHourRequests: 0,
    starvationEvents: 0,
    thirtySecondEscalations: 0
  },
  assignmentCompliance: {
    lobbyTrafficPercentage: 0,
    peakHourRequests: 0,
    starvationEvents: 0,
    thirtySecondEscalations: 0,
    complianceScore: 100
  },

  updatePerformanceMetrics: (metrics) =>
    set((state) => ({
      performanceMetrics: { ...state.performanceMetrics, ...metrics },
    })),

  updateRealTimeMetrics: (metrics) =>
    set((state) => ({
      realTimeMetrics: { ...state.realTimeMetrics, ...metrics },
    })),

  addHistoricalData: (data) =>
    set((state) => {
      const newHistoricalData = [...state.historicalData, data]
      if (newHistoricalData.length > 100) {
        newHistoricalData.shift()
      }
      return { historicalData: newHistoricalData }
    }),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 50),
    })),

  acknowledgeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert
      ),
    })),

  clearAlerts: () => set({ alerts: [] }),

  updateChartData: (type, data) =>
    set((state) => ({
      chartData: {
        ...state.chartData,
        [type]: data.slice(-50),
      },
    })),

  // ASSIGNMENT: Assignment metrics methods
  updateAssignmentMetrics: (assignmentMetrics) =>
    set({ assignmentMetrics }),

  updateAssignmentCompliance: (assignmentCompliance) =>
    set({ assignmentCompliance }),

  resetMetrics: () =>
    set({
      performanceMetrics: initialPerformanceMetrics,
      realTimeMetrics: initialRealTimeMetrics,
      historicalData: [],
      alerts: [],
      chartData: {
        waitTime: [],
        utilization: [],
        throughput: [],
      },
      // ASSIGNMENT: Reset assignment metrics
      assignmentMetrics: {
        lobbyToUpperRequests: 0,
        upperToLobbyRequests: 0,
        peakHourRequests: 0,
        starvationEvents: 0,
        thirtySecondEscalations: 0
      },
      assignmentCompliance: {
        lobbyTrafficPercentage: 0,
        peakHourRequests: 0,
        starvationEvents: 0,
        thirtySecondEscalations: 0,
        complianceScore: 100
      }
    }),
}))

export const selectAverageWaitTime = (state: MetricsStore) => state.performanceMetrics.averageWaitTime
export const selectActiveRequests = (state: MetricsStore) => state.realTimeMetrics.activeRequests
export const selectSystemLoad = (state: MetricsStore) => state.realTimeMetrics.systemLoad
export const selectUnacknowledgedAlerts = (state: MetricsStore) => 
  state.alerts.filter(alert => !alert.acknowledged).length
// ASSIGNMENT: New selectors
export const selectAssignmentCompliance = (state: MetricsStore) => 
  state.performanceMetrics.assignmentCompliance || 100
export const selectPeakHourStatus = (state: MetricsStore) => 
  state.realTimeMetrics.peakHourStatus || 'NORMAL'
