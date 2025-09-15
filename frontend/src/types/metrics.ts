export interface PerformanceMetrics {
  averageWaitTime: number;
  maxWaitTime: number;
  averageTravelTime: number;
  elevatorUtilization: number[];
  throughput: number;
  starvationCount: number;
  userSatisfactionScore: number;
  energyEfficiency: number;
  responseTime: number;
  systemReliability: number;
}

export interface RealTimeMetrics {
  currentTime: number;
  activeRequests: number;
  elevatorsInMotion: number;
  averageLoadFactor: number;
  peakFloorTraffic: { floor: number; requests: number }[];
  systemLoad: number;
  alertsCount: number;
}

export interface HistoricalData {
  timestamp: number;
  metrics: PerformanceMetrics;
  requests: number;
  elevatorStates: string[];
}

export interface Benchmark {
  scenario: string;
  duration: number;
  totalRequests: number;
  metrics: PerformanceMetrics;
  algorithm: string;
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  elevator?: number;
  floor?: number;
  acknowledged: boolean;
}

export interface ChartDataPoint {
  time: string;
  value: number;
  category?: string;
  color?: string;
}

export interface MetricsSummary {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: string;
  unit?: string;
}