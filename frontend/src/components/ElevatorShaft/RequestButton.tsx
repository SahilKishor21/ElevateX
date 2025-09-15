import React from 'react'
import { ArrowUp, ArrowDown, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/utils'

interface RequestButtonProps {
  floor: number
  direction: 'up' | 'down'
  isActive: boolean
  waitTime?: number
  onClick: () => void
  className?: string
}

const RequestButton: React.FC<RequestButtonProps> = ({
  floor,
  direction,
  isActive,
  waitTime = 0,
  onClick,
  className
}) => {
  const DirectionIcon = direction === 'up' ? ArrowUp : ArrowDown
  
  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      size="sm"
      className={cn(
        'relative h-10 w-10 p-0 transition-all duration-200',
        isActive && 'animate-pulse-glow',
        direction === 'up' && isActive && 'bg-green-500 hover:bg-green-600 border-green-500',
        direction === 'down' && isActive && 'bg-blue-500 hover:bg-blue-600 border-blue-500',
        className
      )}
      onClick={onClick}
    >
      <DirectionIcon className="h-4 w-4" />
      
      {/* Wait Time Indicator */}
      {isActive && waitTime > 0 && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-1 text-xs text-muted-foreground bg-background/80 backdrop-blur rounded px-1">
          <Clock className="h-3 w-3" />
          <span>{formatTime(waitTime)}</span>
        </div>
      )}
      
      {/* Priority Indicator */}
      {isActive && waitTime > 30 && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </Button>
  )
}

export default RequestButton