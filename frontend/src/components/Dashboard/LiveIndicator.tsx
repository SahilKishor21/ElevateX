import React from 'react'
import { cn } from '@/lib/utils'

interface LiveIndicatorProps {
  isLive?: boolean
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  isLive = true,
  size = 'md',
  showText = true,
  className
}) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full',
          sizeClasses[size],
          isLive 
            ? 'bg-green-500 animate-pulse' 
            : 'bg-gray-400'
        )}
      />
      {showText && (
        <span className={cn(
          'font-medium',
          textSizeClasses[size],
          isLive ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
        )}>
          {isLive ? 'Live' : 'Offline'}
        </span>
      )}
    </div>
  )
}

export default LiveIndicator