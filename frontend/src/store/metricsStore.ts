import { create } from 'zustand'
import { PerformanceMetrics, RealTimeMetrics, HistoricalData, Alert, ChartDataPoint, AssignmentMetrics, AssignmentCompliance } from '@/types/metrics'
import { debugMetrics, sanitizeMetrics } from '@/lib/utils'

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
  assignmentMetrics?: AssignmentMetrics
  assignmentCompliance?: AssignmentCompliance
  
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void
  updateRealTimeMetrics: (metrics: Partial<RealTimeMetrics>) => void
  addHistoricalData: (data: HistoricalData) => void
  addAlert: (alert: Alert) => void
  acknowledgeAlert: (id: string) => void
  clearAlerts: () => void
  updateChartData: (type: keyof MetricsStore['chartData'], data: ChartDataPoint[]) => void
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
  starvationAlerts: 0,
  peakHourStatus: 'NORMAL',
  complianceScore: 100
}

const initialAssignmentMetrics: AssignmentMetrics = {
  lobbyToUpperRequests: 0,
  upperToLobbyRequests: 0,
  peakHourRequests: 0,
  starvationEvents: 0,
  thirtySecondEscalations: 0
}

const initialAssignmentCompliance: AssignmentCompliance = {
  lobbyTrafficPercentage: 0,
  peakHourRequests: 0,
  starvationEvents: 0,
  thirtySecondEscalations: 0,
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
  assignmentMetrics: initialAssignmentMetrics,
  assignmentCompliance: initialAssignmentCompliance,

  updatePerformanceMetrics: (metrics) => {
    // CRITICAL: Sanitize and validate incoming metrics
    const sanitizedMetrics = sanitizeMetrics(metrics)
    
    debugMetrics('MetricsStore - Updating Performance Metrics', {
      incoming: metrics,
      sanitized: sanitizedMetrics,
      current: get().performanceMetrics.averageWaitTime
    })

    set((state) => {
      const updatedMetrics = { ...state.performanceMetrics, ...sanitizedMetrics }
      
      // Additional validation to ensure critical fields are never undefined/null
      if (typeof updatedMetrics.averageWaitTime !== 'number' || isNaN(updatedMetrics.averageWaitTime)) {
        updatedMetrics.averageWaitTime = 0
      }
      if (typeof updatedMetrics.starvationCount !== 'number' || isNaN(updatedMetrics.starvationCount)) {
        updatedMetrics.starvationCount = 0
      }

      debugMetrics('MetricsStore - Performance Metrics Updated', {
        averageWaitTime: updatedMetrics.averageWaitTime,
        starvationCount: updatedMetrics.starvationCount,
        throughput: updatedMetrics.throughput
      })

      return { performanceMetrics: updatedMetrics }
    })
  },

  updateRealTimeMetrics: (metrics) => {
    debugMetrics('MetricsStore - Updating Real-time Metrics', metrics)

    set((state) => {
      const updatedMetrics = { ...state.realTimeMetrics, ...metrics }
      
      // Ensure critical fields are valid numbers
      if (typeof updatedMetrics.activeRequests !== 'number' || isNaN(updatedMetrics.activeRequests)) {
        updatedMetrics.activeRequests = 0
      }
      if (typeof updatedMetrics.starvationAlerts !== 'number' || isNaN(updatedMetrics.starvationAlerts)) {
        updatedMetrics.starvationAlerts = updatedMetrics.alertsCount || 0
      }

      return { realTimeMetrics: updatedMetrics }
    })
  },

  addHistoricalData: (data) => {
    set((state) => {
      // Validate historical data
      if (!data || typeof data !== 'object') {
        console.warn('Invalid historical data received:', data)
        return state
      }

      const newHistoricalData = [...state.historicalData, data]
      if (newHistoricalData.length > 100) {
        newHistoricalData.shift()
      }

      debugMetrics('MetricsStore - Added Historical Data', {
        dataPoints: newHistoricalData.length,
        latest: data
      })

      return { historicalData: newHistoricalData }
    })
  },

  addAlert: (alert) => {
    // Validate alert object
    if (!alert || typeof alert !== 'object' || !alert.id) {
      console.warn('Invalid alert received:', alert)
      return
    }

    set((state) => {
      // Check if alert already exists
      const existingAlert = state.alerts.find(a => a.id === alert.id)
      if (existingAlert) {
        debugMetrics('MetricsStore - Alert already exists', { id: alert.id })
        return state
      }

      const newAlerts = [alert, ...state.alerts].slice(0, 50)
      
      debugMetrics('MetricsStore - Added Alert', {
        id: alert.id,
        type: alert.type || 'unknown',
        totalAlerts: newAlerts.length
      })

      return { alerts: newAlerts }
    })
  },

  acknowledgeAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert
      ),
    }))
  },

  clearAlerts: () => {
    debugMetrics('MetricsStore - Clearing All Alerts', {})
    set({ alerts: [] })
  },

  updateChartData: (type, data) => {
    if (!Array.isArray(data)) {
      console.warn('Invalid chart data received:', { type, data })
      return
    }

    set((state) => {
      const updatedChartData = {
        ...state.chartData,
        [type]: data.slice(-50), // Keep last 50 data points
      }

      debugMetrics('MetricsStore - Updated Chart Data', {
        type,
        dataPoints: data.length,
        kept: updatedChartData[type].length
      })

      return { chartData: updatedChartData }
    })
  },

  updateAssignmentMetrics: (assignmentMetrics) => {
    if (!assignmentMetrics || typeof assignmentMetrics !== 'object') {
      console.warn('Invalid assignment metrics received:', assignmentMetrics)
      return
    }

    debugMetrics('MetricsStore - Updating Assignment Metrics', assignmentMetrics)

    set((state) => {
      const updatedMetrics = {
        ...state.assignmentMetrics,
        ...assignmentMetrics,
        // Ensure all required fields are present and valid
        lobbyToUpperRequests: typeof assignmentMetrics.lobbyToUpperRequests === 'number' ? assignmentMetrics.lobbyToUpperRequests : state.assignmentMetrics?.lobbyToUpperRequests || 0,
        upperToLobbyRequests: typeof assignmentMetrics.upperToLobbyRequests === 'number' ? assignmentMetrics.upperToLobbyRequests : state.assignmentMetrics?.upperToLobbyRequests || 0,
        peakHourRequests: typeof assignmentMetrics.peakHourRequests === 'number' ? assignmentMetrics.peakHourRequests : state.assignmentMetrics?.peakHourRequests || 0,
        starvationEvents: typeof assignmentMetrics.starvationEvents === 'number' ? assignmentMetrics.starvationEvents : state.assignmentMetrics?.starvationEvents || 0,
        thirtySecondEscalations: typeof assignmentMetrics.thirtySecondEscalations === 'number' ? assignmentMetrics.thirtySecondEscalations : state.assignmentMetrics?.thirtySecondEscalations || 0
      }

      return { assignmentMetrics: updatedMetrics }
    })
  },

  updateAssignmentCompliance: (assignmentCompliance) => {
    if (!assignmentCompliance || typeof assignmentCompliance !== 'object') {
      console.warn('Invalid assignment compliance received:', assignmentCompliance)
      return
    }

    debugMetrics('MetricsStore - Updating Assignment Compliance', assignmentCompliance)

    set((state) => {
      const updatedCompliance = {
        ...state.assignmentCompliance,
        ...assignmentCompliance,
        // Ensure all required fields are present and valid
        lobbyTrafficPercentage: typeof assignmentCompliance.lobbyTrafficPercentage === 'number' ? assignmentCompliance.lobbyTrafficPercentage : state.assignmentCompliance?.lobbyTrafficPercentage || 0,
        peakHourRequests: typeof assignmentCompliance.peakHourRequests === 'number' ? assignmentCompliance.peakHourRequests : state.assignmentCompliance?.peakHourRequests || 0,
        starvationEvents: typeof assignmentCompliance.starvationEvents === 'number' ? assignmentCompliance.starvationEvents : state.assignmentCompliance?.starvationEvents || 0,
        thirtySecondEscalations: typeof assignmentCompliance.thirtySecondEscalations === 'number' ? assignmentCompliance.thirtySecondEscalations : state.assignmentCompliance?.thirtySecondEscalations || 0,
        complianceScore: typeof assignmentCompliance.complianceScore === 'number' ? assignmentCompliance.complianceScore : state.assignmentCompliance?.complianceScore || 100
      }

      return { assignmentCompliance: updatedCompliance }
    })
  },

  resetMetrics: () => {
    debugMetrics('MetricsStore - Resetting All Metrics', {})
    
    set({
      performanceMetrics: { ...initialPerformanceMetrics },
      realTimeMetrics: { ...initialRealTimeMetrics },
      historicalData: [],
      alerts: [],
      chartData: {
        waitTime: [],
        utilization: [],
        throughput: [],
      },
      assignmentMetrics: { ...initialAssignmentMetrics },
      assignmentCompliance: { ...initialAssignmentCompliance }
    })
  },
}))

// CRITICAL: Enhanced selectors with validation
export const selectAverageWaitTime = (state: MetricsStore) => {
  const waitTime = state.performanceMetrics.averageWaitTime
  return typeof waitTime === 'number' && !isNaN(waitTime) ? waitTime : 0
}

export const selectActiveRequests = (state: MetricsStore) => {
  const count = state.realTimeMetrics.activeRequests
  return typeof count === 'number' && !isNaN(count) ? count : 0
}

export const selectSystemLoad = (state: MetricsStore) => {
  const load = state.realTimeMetrics.systemLoad
  return typeof load === 'number' && !isNaN(load) ? load : 0
}

export const selectUnacknowledgedAlerts = (state: MetricsStore) => 
  state.alerts.filter(alert => !alert.acknowledged).length

export const selectAssignmentCompliance = (state: MetricsStore) => {
  const compliance = state.performanceMetrics.assignmentCompliance
  return typeof compliance === 'number' && !isNaN(compliance) ? compliance : 100
}

export const selectPeakHourStatus = (state: MetricsStore) => 
  state.realTimeMetrics.peakHourStatus || 'NORMAL'

export const selectStarvationCount = (state: MetricsStore) => {
  const count = state.performanceMetrics.starvationCount
  return typeof count === 'number' && !isNaN(count) ? count : 0
}

export const selectThroughput = (state: MetricsStore) => {
  const throughput = state.performanceMetrics.throughput
  return typeof throughput === 'number' && !isNaN(throughput) ? throughput : 0
}

// Debug helper to log current store state
export const logCurrentMetricsState = () => {
  const state = useMetricsStore.getState()
  debugMetrics('MetricsStore - Current State', {
    averageWaitTime: state.performanceMetrics.averageWaitTime,
    starvationCount: state.performanceMetrics.starvationCount,
    activeRequests: state.realTimeMetrics.activeRequests,
    assignmentCompliance: state.assignmentCompliance?.complianceScore
  })
}