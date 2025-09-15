import React from 'react'
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricsCardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'stable'
  icon?: LucideIcon
  color?: string
  unit?: string
  description?: string
  className?: string
  isLive?: boolean
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  trend = 'stable',
  icon: Icon,
  color = 'blue',
  unit,
  description,
  className,
  isLive = false
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return TrendingUp
      case 'down':
        return TrendingDown
      default:
        return Minus
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-500'
      case 'down':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getColorClasses = () => {
    const colors = {
      blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
      purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
      green: 'from-green-500/10 to-green-600/5 border-green-500/20',
      orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
      red: 'from-red-500/10 to-red-600/5 border-red-500/20',
      cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const TrendIcon = getTrendIcon()

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg',
      `bg-gradient-to-br ${getColorClasses()}`,
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
          {isLive && (
            <span className="ml-2 inline-flex items-center">
              <span className="animate-pulse h-2 w-2 bg-green-500 rounded-full" />
              <span className="ml-1 text-xs text-green-500">Live</span>
            </span>
          )}
        </CardTitle>
        {Icon && (
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            color === 'blue' && 'bg-blue-500/20 text-blue-600',
            color === 'purple' && 'bg-purple-500/20 text-purple-600',
            color === 'green' && 'bg-green-500/20 text-green-600',
            color === 'orange' && 'bg-orange-500/20 text-orange-600',
            color === 'red' && 'bg-red-500/20 text-red-600',
            color === 'cyan' && 'bg-cyan-500/20 text-cyan-600'
          )}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-bold">
              {value}
              {unit && <span className="text-lg text-muted-foreground ml-1">{unit}</span>}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {change !== undefined && (
            <div className={cn('flex items-center text-sm', getTrendColor())}>
              <TrendIcon className="h-4 w-4 mr-1" />
              <span className="font-medium">
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
      {isLive && (
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50 animate-pulse" />
      )}
    </Card>
  )
}

export default MetricsCard