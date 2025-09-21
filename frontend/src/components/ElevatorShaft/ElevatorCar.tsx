import React from 'react'
import { ArrowUp, ArrowDown, Users, Wrench, AlertCircle, AlertTriangle } from 'lucide-react'
import { Elevator } from '@/types/elevator'
import StatusBadge from '../Common/StatusBadge'
import { cn } from '@/lib/utils'

interface ElevatorCarProps {
  elevator: Elevator
  totalFloors: number
  floorHeight?: number
  elevatorWidth?: number
  isSelected?: boolean
  onClick?: () => void
  animate?: boolean
}

const ElevatorCar: React.FC<ElevatorCarProps> = ({
  elevator,
  totalFloors,
  floorHeight,
  elevatorWidth,
  isSelected = false,
  onClick,
  animate = true
}) => {
  const getDirectionIcon = () => {
    switch (elevator.direction) {
      case 'up':
        return <ArrowUp className="h-3 w-3" />
      case 'down':
        return <ArrowDown className="h-3 w-3" />
      default:
        return null
    }
  }

  const getStatusIcon = () => {
    switch (elevator.state) {
      case 'maintenance':
        return <Wrench className="h-4 w-4" />
      case 'loading':
        return <Users className="h-4 w-4" />
      default:
        return null
    }
  }

  const calculatePosition = () => {
    const position = (totalFloors - elevator.currentFloor) * (floorHeight || 70);
    const carHeight = (floorHeight || 70) - 5; // Updated car height
    return position + ((floorHeight || 70) - carHeight);
  }

  const passengerCount = elevator.passengers?.length || 0
  const elevatorCapacity = elevator.capacity || 8
  const requestQueueLength = elevator.requestQueue?.length || 0
  
  const occupancyPercentage = elevatorCapacity > 0 ? (passengerCount / elevatorCapacity) * 100 : 0
  const isNearCapacity = occupancyPercentage >= 80
  const isAtCapacity = occupancyPercentage >= 95
  const isOverCapacity = passengerCount > elevatorCapacity

  return (
    <div
      className={cn(
        'absolute z-10 cursor-pointer transition-all duration-300 group',
        animate && 'animate-elevator-move',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{
        top: `${calculatePosition()}px`,
        left: `0px`,
        width: `${elevatorWidth}px`,
        height: `${(floorHeight || 70) - 5}px`, // Updated car height
      }}
      onClick={onClick}
    >
      <div
        className={cn(
          'h-full w-full rounded-lg border-2 flex flex-col relative overflow-hidden shadow-lg transition-all duration-200 hover:shadow-xl',
          elevator.doorOpen ? 'border-dashed' : 'border-solid',
          elevator.state === 'maintenance' && 'opacity-75',
          isSelected && 'scale-105',
          isOverCapacity && 'border-red-500',
          isAtCapacity && !isOverCapacity && 'border-orange-500',
          isNearCapacity && !isAtCapacity && 'border-yellow-500'
        )}
        style={{
          backgroundColor: isOverCapacity ? '#ef444420' : 
                           isAtCapacity ? '#f9731620' : 
                           isNearCapacity ? '#f59e0b20' : 
                           (elevator.color || '#3b82f6') + '20',
          borderColor: isOverCapacity ? '#ef4444' : 
                      isAtCapacity ? '#f97316' : 
                      isNearCapacity ? '#f59e0b' : 
                      elevator.color || '#3b82f6',
        }}
      >
        {/* Capacity Warning Indicator */}
        {(isNearCapacity || isAtCapacity || isOverCapacity) && (
          <div className="absolute -top-2 -right-2 z-20">
            <div className={cn(
              "rounded-full p-1 animate-pulse",
              isOverCapacity ? "bg-red-500" : 
              isAtCapacity ? "bg-orange-500" : 
              "bg-yellow-500"
            )}>
              <AlertTriangle className="h-3 w-3 text-white" />
            </div>
          </div>
        )}

        {/* Elevator Header */}
        <div className="flex items-center justify-between p-2 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold">E{elevator.id + 1}</span>
            {getDirectionIcon()}
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <span className="text-xs font-medium">{elevator.currentFloor}</span>
          </div>
        </div>

        {/* Elevator Body with Capacity Display */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-1">
          {/* Capacity Text Display */}
          <div className="text-center mb-1">
            <div className={cn(
              "text-xs font-bold",
              isOverCapacity ? "text-red-600" :
              isAtCapacity ? "text-orange-600" :
              isNearCapacity ? "text-yellow-600" :
              "text-current"
            )}>
              {passengerCount}/{elevatorCapacity}
            </div>
          </div>

          {/* Occupancy Visualization */}
          <div className="flex flex-wrap gap-1 max-w-full justify-center mb-1">
            {Array.from({ length: Math.min(passengerCount, 12) }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  i >= elevatorCapacity ? "bg-red-500 animate-pulse" : "bg-current opacity-70"
                )}
                style={{ 
                  color: i >= elevatorCapacity ? '#ef4444' : elevator.color || '#3b82f6'
                }}
              />
            ))}
            {passengerCount > 12 && (
              <span className="text-xs text-muted-foreground">+{passengerCount - 12}</span>
            )}
          </div>

          {/* Load Percentage */}
          <div className="text-xs text-center">
            <span className={cn(
              "font-medium",
              isOverCapacity ? "text-red-600" :
              isAtCapacity ? "text-orange-600" :
              isNearCapacity ? "text-yellow-600" :
              "text-muted-foreground"
            )}>
              {Math.round(occupancyPercentage)}%
            </span>
          </div>

          {/* Door Animation */}
          {elevator.doorOpen && (
            <div className="absolute inset-0 flex">
              <div className="w-1/2 bg-background/90 border-r animate-slide-right" />
              <div className="w-1/2 bg-background/90 border-l animate-slide-left" />
            </div>
          )}

          {/* Overcapacity Warning Overlay */}
          {isOverCapacity && (
            <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-4 w-4 text-red-600 animate-pulse mx-auto" />
                <div className="text-xs font-bold text-red-600">OVER</div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Footer with Capacity Bar */}
        <div className="p-1 bg-background/60 backdrop-blur-sm">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                isOverCapacity ? "bg-red-600" :
                isAtCapacity ? "bg-orange-500" :
                isNearCapacity ? "bg-yellow-500" :
                "bg-current"
              )}
              style={{
                width: `${Math.min(100, occupancyPercentage)}%`,
                backgroundColor: isOverCapacity ? '#dc2626' :
                                isAtCapacity ? '#ea580c' :
                                isNearCapacity ? '#d97706' :
                                elevator.color || '#3b82f6',
              }}
            />
          </div>
        </div>

        {/* Movement Indicator */}
        {(elevator.state === 'moving_up' || elevator.state === 'moving_down') && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
            <div className={cn(
              "w-1 h-6 rounded-full animate-pulse",
              elevator.direction === 'up' ? 'bg-green-500' : 'bg-blue-500'
            )} />
          </div>
        )}

        {/* Request Queue Indicator */}
        {requestQueueLength > 0 && (
          <div className="absolute -left-1 top-2">
            <div className="relative">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" />
              <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
                {requestQueueLength}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Hover Tooltip with Full Details */}
      <div className="absolute -right-32 top-0 hidden group-hover:block bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg z-50">
        <div className="text-xs space-y-2 min-w-28">
          <div className="font-semibold border-b pb-1">
            Elevator {elevator.id + 1}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Floor:</span>
              <span className="font-medium ml-1">{elevator.currentFloor}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Target:</span>
              <span className="font-medium ml-1">{elevator.targetFloor || 'None'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="font-medium">{passengerCount}/{elevatorCapacity} passengers</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{Math.round(occupancyPercentage)}% capacity</div>
            </div>
          </div>

          <div>
            <span className="text-muted-foreground">Status:</span>
            <StatusBadge status={elevator.state} size="sm" className="ml-1" />
          </div>

          {requestQueueLength > 0 && (
            <div>
              <span className="text-muted-foreground">Queue:</span>
              <div className="font-mono text-xs mt-1">
                [{(elevator.requestQueue || []).slice(0, 5).join(', ')}
                {requestQueueLength > 5 && '...'}]
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1 border-t">
            <div><span className="text-muted-foreground">Trips:</span> {elevator.totalTrips || 0}</div>
            <div><span className="text-muted-foreground">Distance:</span> {elevator.totalDistance || 0} floors</div>
          </div>

          {/* Capacity Status Warnings */}
          {isOverCapacity && (
            <div className="text-red-600 font-bold text-center">
              ⚠️ OVERCAPACITY!
            </div>
          )}
          {isAtCapacity && !isOverCapacity && (
            <div className="text-orange-600 font-medium text-center">
              AT CAPACITY
            </div>
          )}
          {isNearCapacity && !isAtCapacity && (
            <div className="text-yellow-600 font-medium text-center">
              NEAR CAPACITY
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ElevatorCar