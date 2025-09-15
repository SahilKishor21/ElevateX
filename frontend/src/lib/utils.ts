import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function calculateDistance(floor1: number, floor2: number): number {
  return Math.abs(floor1 - floor2)
}

export function getElevatorColor(id: number): string {
  const colors = [
    '#3b82f6', '#8b5cf6', '#10b981', '#f97316',
    '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  ]
  return colors[id % colors.length]
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}