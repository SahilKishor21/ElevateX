import React from 'react'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'dot' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

const statusColors = {
  idle: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  moving_up: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  moving_down: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  loading: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  maintenance: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  online: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  offline: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
}

const dotColors = {
  idle: 'bg-gray-400',
  moving_up: 'bg-blue-500',
  moving_down: 'bg-blue-500',
  loading: 'bg-yellow-500',
  maintenance: 'bg-red-500',
  online: 'bg-green-500',
  offline: 'bg-red-500',
  warning: 'bg-orange-500',
  error: 'bg-red-500',
  success: 'bg-green-500',
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'default',
  size = 'md',
  pulse = false,
  className
}) => {
  const baseClasses = 'inline-flex items-center rounded-full font-medium'
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  }

  const statusKey = status.toLowerCase() as keyof typeof statusColors
  const colorClass = statusColors[statusKey] || statusColors.offline

  if (variant === 'dot') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            dotColors[statusKey] || dotColors.offline,
            pulse && 'animate-pulse'
          )}
        />
        <span className="text-sm font-medium capitalize">
          {status.replace('_', ' ')}
        </span>
      </div>
    )
  }

  return (
    <span
      className={cn(
        baseClasses,
        sizeClasses[size],
        colorClass,
        pulse && 'animate-pulse',
        className
      )}
    >
      {status.replace('_', ' ').toUpperCase()}
    </span>
  )
}

export default StatusBadge