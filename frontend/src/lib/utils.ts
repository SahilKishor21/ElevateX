import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// FIXED: Format time from milliseconds to human readable format with proper zero handling
export function formatTime(ms: number | undefined | null): string {
  if (ms === undefined || ms === null || isNaN(ms)) {
    return '0s'
  }

  // CRITICAL FIX: Handle zero explicitly
  if (ms === 0) {
    return '0s'
  }

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    const remainingSeconds = seconds % 60
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  } else {
    return `${seconds}s`
  }
}

// FIXED: Format numbers with specified decimal places
export function formatNumber(value: number | undefined | null, decimals: number = 0): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0'
  }

  if (decimals === 0) {
    return Math.round(value).toString()
  }

  return value.toFixed(decimals)
}

// FIXED: Format percentage values
export function formatPercentage(value: number | undefined | null, decimals: number = 1): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%'
  }

  // Handle both decimal (0.75) and percentage (75) formats
  let percentage = value
  if (value > 1) {
    percentage = value / 100
  }

  return `${(percentage * 100).toFixed(decimals)}%`
}

// NEW: Debug helper for metrics
export function debugMetrics(label: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[METRICS DEBUG] ${label}:`, data)
  }
}

// NEW: Validate and sanitize metrics data
export function sanitizeMetrics(metrics: any): any {
  if (!metrics || typeof metrics !== 'object') {
    console.warn('Invalid metrics data received:', metrics)
    return {
      averageWaitTime: 0,
      maxWaitTime: 0,
      elevatorUtilization: [],
      throughput: 0,
      starvationCount: 0,
      userSatisfactionScore: 100,
      energyEfficiency: 85,
      responseTime: 0,
      systemReliability: 100
    }
  }
  
  return {
    averageWaitTime: typeof metrics.averageWaitTime === 'number' ? metrics.averageWaitTime : 0,
    maxWaitTime: typeof metrics.maxWaitTime === 'number' ? metrics.maxWaitTime : 0,
    elevatorUtilization: Array.isArray(metrics.elevatorUtilization) ? metrics.elevatorUtilization : [],
    throughput: typeof metrics.throughput === 'number' ? metrics.throughput : 0,
    starvationCount: typeof metrics.starvationCount === 'number' ? metrics.starvationCount : 0,
    userSatisfactionScore: typeof metrics.userSatisfactionScore === 'number' ? metrics.userSatisfactionScore : 100,
    energyEfficiency: typeof metrics.energyEfficiency === 'number' ? metrics.energyEfficiency : 85,
    responseTime: typeof metrics.responseTime === 'number' ? metrics.responseTime : 0,
    systemReliability: typeof metrics.systemReliability === 'number' ? metrics.systemReliability : 100,
    assignmentCompliance: typeof metrics.assignmentCompliance === 'number' ? metrics.assignmentCompliance : 100,
    peakHourEfficiency: typeof metrics.peakHourEfficiency === 'number' ? metrics.peakHourEfficiency : 100,
    requestDistribution: metrics.requestDistribution || {
      lobbyToUpper: 0,
      upperToLobby: 0,
      interFloor: 0,
      total: 0
    }
  }
}