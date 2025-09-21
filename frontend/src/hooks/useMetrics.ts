import { useMemo, useEffect } from 'react'
import { useMetricsStore } from '@/store/metricsStore'
import { useElevatorStore } from '@/store/elevatorStore'
import { formatNumber, formatTime, formatPercentage, sanitizeMetrics, debugMetrics } from '@/lib/utils'
import { PERFORMANCE_THRESHOLDS } from '@/lib/constants'

export const useMetrics = () => {
  const {
    performanceMetrics,
    realTimeMetrics,
    historicalData,
    alerts,
    chartData,
    assignmentMetrics,
    assignmentCompliance,
  } = useMetricsStore()

  const { elevators, activeRequests } = useElevatorStore()

  // Debug logging for performance metrics
  useEffect(() => {
    if (performanceMetrics?.averageWaitTime !== undefined) {
      debugMetrics('useMetrics - Raw Performance Metrics', {
        averageWaitTime: performanceMetrics.averageWaitTime,
        starvationCount: performanceMetrics.starvationCount,
        throughput: performanceMetrics.throughput
      })
    }
  }, [performanceMetrics?.averageWaitTime, performanceMetrics?.starvationCount])

  const formattedMetrics = useMemo(() => {
    // Sanitize incoming metrics data
    const sanitizedMetrics = sanitizeMetrics(performanceMetrics)
    
    debugMetrics('useMetrics - Sanitized Metrics', sanitizedMetrics)

    const formatted = {
      averageWaitTime: formatTime(sanitizedMetrics.averageWaitTime * 1000), // Convert to milliseconds
      maxWaitTime: formatTime(sanitizedMetrics.maxWaitTime * 1000),
      averageTravelTime: formatTime((sanitizedMetrics.averageTravelTime || 0) * 1000),
      utilization: formatPercentage(
        sanitizedMetrics.elevatorUtilization.length > 0 ?
        sanitizedMetrics.elevatorUtilization.reduce((a: number, b: number) => a + b, 0) / 
        sanitizedMetrics.elevatorUtilization.length : 0
      ),
      throughput: formatNumber(sanitizedMetrics.throughput, 1),
      satisfactionScore: formatNumber(sanitizedMetrics.userSatisfactionScore, 1),
      energyEfficiency: formatPercentage(sanitizedMetrics.energyEfficiency / 100),
      systemReliability: formatPercentage(sanitizedMetrics.systemReliability / 100),
      assignmentCompliance: formatPercentage((sanitizedMetrics.assignmentCompliance || 100) / 100),
      peakHourEfficiency: formatPercentage((sanitizedMetrics.peakHourEfficiency || 100) / 100),
    }

    debugMetrics('useMetrics - Formatted Metrics', formatted)

    return formatted
  }, [performanceMetrics])

  const performanceGrade = useMemo(() => {
    const sanitizedMetrics = sanitizeMetrics(performanceMetrics)
    const { averageWaitTime, starvationCount, userSatisfactionScore } = sanitizedMetrics
    
    // ASSIGNMENT: Include assignment compliance in grading
    const assignmentScore = sanitizedMetrics.assignmentCompliance || 100
    const adjustedSatisfaction = (userSatisfactionScore + assignmentScore) / 2
    
    debugMetrics('useMetrics - Performance Grade Calculation', {
      averageWaitTime,
      starvationCount,
      userSatisfactionScore,
      assignmentScore,
      adjustedSatisfaction
    })
    
    if (starvationCount > 0 || averageWaitTime > (PERFORMANCE_THRESHOLDS?.POOR_WAIT_TIME || 120)) {
      return { grade: 'Poor', color: 'red', score: Math.min(adjustedSatisfaction, 60) }
    }
    
    if (averageWaitTime > (PERFORMANCE_THRESHOLDS?.GOOD_WAIT_TIME || 60)) {
      return { grade: 'Good', color: 'yellow', score: Math.min(adjustedSatisfaction, 80) }
    }
    
    if (averageWaitTime <= (PERFORMANCE_THRESHOLDS?.EXCELLENT_WAIT_TIME || 30)) {
      return { grade: 'Excellent', color: 'green', score: adjustedSatisfaction }
    }
    
    return { grade: 'Fair', color: 'blue', score: Math.min(adjustedSatisfaction, 75) }
  }, [performanceMetrics])

  const systemHealth = useMemo(() => {
    const sanitizedMetrics = sanitizeMetrics(performanceMetrics)
    const activeElevators = elevators.filter(e => e.state !== 'idle').length
    const utilizationRate = elevators.length > 0 ? activeElevators / elevators.length : 0
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length
    
    // ASSIGNMENT: Include assignment compliance in health calculation
    const complianceScore = assignmentCompliance?.complianceScore || 100
    
    const healthScore = Math.max(0, 100 - 
      (sanitizedMetrics.starvationCount * 10) - 
      (unacknowledgedAlerts * 5) - 
      (Math.max(0, utilizationRate - (PERFORMANCE_THRESHOLDS?.UTILIZATION_TARGET || 0.8)) * 50) -
      (Math.max(0, 100 - complianceScore) * 0.5)
    )

    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (healthScore < 50) status = 'critical'
    else if (healthScore < 80) status = 'warning'

    debugMetrics('useMetrics - System Health', {
      activeElevators,
      utilizationRate,
      unacknowledgedAlerts,
      complianceScore,
      healthScore,
      status
    })

    return {
      score: Math.round(healthScore),
      status,
      issues: [
        ...(sanitizedMetrics.starvationCount > 0 ? [`${sanitizedMetrics.starvationCount} starved requests`] : []),
        ...(unacknowledgedAlerts > 0 ? [`${unacknowledgedAlerts} unacknowledged alerts`] : []),
        ...(utilizationRate > 0.9 ? ['High system load'] : []),
        ...(complianceScore < 80 ? ['Assignment requirements not fully met'] : []),
      ]
    }
  }, [elevators, performanceMetrics, alerts, assignmentCompliance])

  const trendData = useMemo(() => {
    const recent = historicalData.slice(-20)
    if (recent.length < 2) return { waitTime: 'stable', utilization: 'stable' }

    const current = recent[recent.length - 1]?.metrics
    const previous = recent[0]?.metrics
    
    if (!current || !previous) return { waitTime: 'stable', utilization: 'stable' }

    const waitTimeChange = current.averageWaitTime - previous.averageWaitTime
    const currentUtilization = current.elevatorUtilization?.length > 0 ? 
      current.elevatorUtilization.reduce((a, b) => a + b, 0) / current.elevatorUtilization.length : 0
    const previousUtilization = previous.elevatorUtilization?.length > 0 ?
      previous.elevatorUtilization.reduce((a, b) => a + b, 0) / previous.elevatorUtilization.length : 0
    const utilizationChange = currentUtilization - previousUtilization

    return {
      waitTime: waitTimeChange > 5 ? 'up' : waitTimeChange < -5 ? 'down' : 'stable',
      utilization: utilizationChange > 0.1 ? 'up' : utilizationChange < -0.1 ? 'down' : 'stable'
    }
  }, [historicalData])

  // Enhanced debugging for the complete metrics flow
  useEffect(() => {
    debugMetrics('useMetrics - Complete State', {
      rawPerformanceMetrics: performanceMetrics,
      formattedMetrics,
      systemHealth,
      activeRequestsCount: activeRequests.length,
      elevatorsCount: elevators.length
    })
  }, [performanceMetrics, formattedMetrics, systemHealth, activeRequests.length, elevators.length])

  return {
    raw: sanitizeMetrics(performanceMetrics),
    realTime: realTimeMetrics,
    formatted: formattedMetrics,
    grade: performanceGrade,
    health: systemHealth,
    trends: trendData,
    charts: chartData,
    alerts: alerts.filter(a => !a.acknowledged).slice(0, 5),
    assignment: {
      metrics: assignmentMetrics,
      compliance: assignmentCompliance,
      isPeakHour: realTimeMetrics.peakHourStatus === 'ACTIVE',
      lobbyTrafficPercentage: assignmentCompliance?.lobbyTrafficPercentage || 0,
      starvationEvents: assignmentMetrics?.starvationEvents || 0
    },
    summary: {
      totalRequests: activeRequests.length + historicalData.reduce((acc, h) => acc + (h.requests || 0), 0),
      avgResponseTime: performanceMetrics.responseTime || 0,
      systemUptime: realTimeMetrics.currentTime,
      efficiency: (performanceMetrics.energyEfficiency + performanceMetrics.userSatisfactionScore) / 2,
      assignmentCompliance: performanceMetrics.assignmentCompliance || 100
    }
  }
}