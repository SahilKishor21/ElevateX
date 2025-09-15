import { useMemo } from 'react'
import { useMetricsStore } from '@/store/metricsStore'
import { useElevatorStore } from '@/store/elevatorStore'
import { formatNumber, formatTime, formatPercentage } from '@/lib/utils'
import { PERFORMANCE_THRESHOLDS } from '@/lib/constants'

export const useMetrics = () => {
  const {
    performanceMetrics,
    realTimeMetrics,
    historicalData,
    alerts,
    chartData,
  } = useMetricsStore()

  const { elevators, activeRequests } = useElevatorStore()

  const formattedMetrics = useMemo(() => ({
    averageWaitTime: formatTime(performanceMetrics.averageWaitTime),
    maxWaitTime: formatTime(performanceMetrics.maxWaitTime),
    averageTravelTime: formatTime(performanceMetrics.averageTravelTime),
    utilization: formatPercentage(
      performanceMetrics.elevatorUtilization.reduce((a, b) => a + b, 0) / 
      Math.max(performanceMetrics.elevatorUtilization.length, 1)
    ),
    throughput: formatNumber(performanceMetrics.throughput, 1),
    satisfactionScore: formatNumber(performanceMetrics.userSatisfactionScore, 1),
    energyEfficiency: formatPercentage(performanceMetrics.energyEfficiency / 100),
    systemReliability: formatPercentage(performanceMetrics.systemReliability / 100),
  }), [performanceMetrics])

  const performanceGrade = useMemo(() => {
    const { averageWaitTime, starvationCount, userSatisfactionScore } = performanceMetrics
    
    if (starvationCount > 0 || averageWaitTime > PERFORMANCE_THRESHOLDS.POOR_WAIT_TIME) {
      return { grade: 'Poor', color: 'red', score: Math.min(userSatisfactionScore, 60) }
    }
    
    if (averageWaitTime > PERFORMANCE_THRESHOLDS.GOOD_WAIT_TIME) {
      return { grade: 'Good', color: 'yellow', score: Math.min(userSatisfactionScore, 80) }
    }
    
    if (averageWaitTime <= PERFORMANCE_THRESHOLDS.EXCELLENT_WAIT_TIME) {
      return { grade: 'Excellent', color: 'green', score: userSatisfactionScore }
    }
    
    return { grade: 'Fair', color: 'blue', score: Math.min(userSatisfactionScore, 75) }
  }, [performanceMetrics])

  const systemHealth = useMemo(() => {
    const activeElevators = elevators.filter(e => e.state !== 'idle').length
    const utilizationRate = elevators.length > 0 ? activeElevators / elevators.length : 0
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length
    
    const healthScore = Math.max(0, 100 - 
      (performanceMetrics.starvationCount * 10) - 
      (unacknowledgedAlerts * 5) - 
      (Math.max(0, utilizationRate - PERFORMANCE_THRESHOLDS.UTILIZATION_TARGET) * 50)
    )

    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (healthScore < 50) status = 'critical'
    else if (healthScore < 80) status = 'warning'

    return {
      score: Math.round(healthScore),
      status,
      issues: [
        ...(performanceMetrics.starvationCount > 0 ? [`${performanceMetrics.starvationCount} starved requests`] : []),
        ...(unacknowledgedAlerts > 0 ? [`${unacknowledgedAlerts} unacknowledged alerts`] : []),
        ...(utilizationRate > 0.9 ? ['High system load'] : []),
      ]
    }
  }, [elevators, performanceMetrics, alerts])

  const trendData = useMemo(() => {
    const recent = historicalData.slice(-20)
    if (recent.length < 2) return { waitTime: 'stable', utilization: 'stable' }

    const waitTimeChange = recent[recent.length - 1]?.metrics.averageWaitTime - recent[0]?.metrics.averageWaitTime
    const utilizationChange = recent[recent.length - 1]?.metrics.elevatorUtilization.reduce((a, b) => a + b, 0) / recent[recent.length - 1]?.metrics.elevatorUtilization.length -
      recent[0]?.metrics.elevatorUtilization.reduce((a, b) => a + b, 0) / recent[0]?.metrics.elevatorUtilization.length

    return {
      waitTime: waitTimeChange > 5 ? 'up' : waitTimeChange < -5 ? 'down' : 'stable',
      utilization: utilizationChange > 0.1 ? 'up' : utilizationChange < -0.1 ? 'down' : 'stable'
    }
  }, [historicalData])

  return {
    raw: performanceMetrics,
    realTime: realTimeMetrics,
    formatted: formattedMetrics,
    grade: performanceGrade,
    health: systemHealth,
    trends: trendData,
    charts: chartData,
    alerts: alerts.filter(a => !a.acknowledged).slice(0, 5),
    summary: {
      totalRequests: activeRequests.length + historicalData.reduce((acc, h) => acc + h.requests, 0),
      avgResponseTime: performanceMetrics.responseTime,
      systemUptime: realTimeMetrics.currentTime,
      efficiency: (performanceMetrics.energyEfficiency + performanceMetrics.userSatisfactionScore) / 2
    }
  }
}