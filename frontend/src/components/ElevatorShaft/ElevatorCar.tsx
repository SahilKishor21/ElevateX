'use client'

import React from 'react'
import { ArrowUp, ArrowDown, Users, Wrench, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEFAULT_CONFIG } from '@/lib/constants'

interface ElevatorCarProps {
  elevator: any
  totalFloors: number
  floorHeight: number
  elevatorWidth: number
  isSelected?: boolean
  onClick?: () => void
}

const ElevatorCar: React.FC<ElevatorCarProps> = ({
  elevator,
  totalFloors,
  isSelected = false,
  onClick
}) => {
  const getDirectionIcon = () => {
    switch (elevator.direction) {
      case 'up':
        return <ArrowUp className="h-3 w-3 text-green-400" />
      case 'down':
        return <ArrowDown className="h-3 w-3 text-blue-400" />
      default:
        return null
    }
  }

  const calculatePosition = () => {
    const floorHeight = DEFAULT_CONFIG.FLOOR_HEIGHT
    return (totalFloors - elevator.currentFloor) * floorHeight
  }

  // Simulate passenger load (0-8 passengers)
  const currentLoad = Math.floor(Math.random() * (elevator.capacity + 1))
  const occupancyPercentage = (currentLoad / elevator.capacity) * 100

  const getLoadColor = () => {
    if (occupancyPercentage > 80) return 'text-red-400'
    if (occupancyPercentage > 60) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div
      className={cn(
        'absolute left-2 z-10 cursor-pointer transition-all duration-300 group',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900'
      )}
      style={{
        top: `${calculatePosition()}px`,
        width: `${DEFAULT_CONFIG.ELEVATOR_WIDTH}px`,
        height: `${DEFAULT_CONFIG.FLOOR_HEIGHT - 10}px`,
      }}
      onClick={onClick}
    >
      <div
        className={cn(
          'h-full w-full rounded-lg border-2 bg-slate-800/90 backdrop-blur-sm flex flex-col relative overflow-hidden shadow-lg transition-all duration-200 hover:shadow-xl',
          elevator.doorOpen ? 'border-dashed border-yellow-400' : 'border-solid',
          elevator.state === 'maintenance' && 'opacity-75'
        )}
        style={{
          borderColor: elevator.color,
        }}
      >
        {/* Elevator Header */}
        <div 
          className="flex items-center justify-between p-2 text-white text-xs border-b border-slate-600"
          style={{ backgroundColor: elevator.color + '40' }}
        >
          <div className="flex items-center gap-1">
            <span className="font-bold">E{elevator.id + 1}</span>
            {getDirectionIcon()}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">{elevator.currentFloor}</span>
          </div>
        </div>

        {/* Elevator Body - Passenger Visualization */}
        <div className="flex-1 p-2 flex flex-col justify-between">
          {/* Passenger Icons Grid */}
          <div className="grid grid-cols-4 gap-1 flex-1">
            {Array.from({ length: elevator.capacity }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center",
                  i < currentLoad
                    ? "bg-blue-400 border-blue-300"
                    : "bg-slate-600 border-slate-500"
                )}
              >
                {i < currentLoad && <Users className="h-2 w-2 text-white" />}
              </div>
            ))}
          </div>

          {/* Load Information */}
          <div className="mt-2 text-center">
            <div className={cn("text-xs font-medium", getLoadColor())}>
              {currentLoad}/{elevator.capacity}
            </div>
            <div className="text-[10px] text-slate-400">
              {Math.round(occupancyPercentage)}% Load
            </div>
          </div>
        </div>

        {/* Load Bar */}
        <div className="px-2 pb-2">
          <div className="h-1 bg-slate-600 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                occupancyPercentage > 80 ? "bg-red-500" :
                occupancyPercentage > 60 ? "bg-yellow-500" : "bg-green-500"
              )}
              style={{ width: `${occupancyPercentage}%` }}
            />
          </div>
        </div>

        {/* Door Animation */}
        {elevator.doorOpen && (
          <>
            <div className="absolute inset-0 flex">
              <div className="w-1/2 bg-slate-900/80 border-r border-yellow-400 transform transition-transform duration-300 -translate-x-full opacity-80" />
              <div className="w-1/2 bg-slate-900/80 border-l border-yellow-400 transform transition-transform duration-300 translate-x-full opacity-80" />
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-yellow-400 text-xs font-medium">
              DOORS OPEN
            </div>
          </>
        )}

        {/* Status Overlays */}
        {elevator.state === 'maintenance' && (
          <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center border-2 border-red-500">
            <div className="text-center text-white">
              <Wrench className="h-6 w-6 mx-auto mb-1" />
              <div className="text-xs font-medium">MAINTENANCE</div>
            </div>
          </div>
        )}

        {/* Movement Indicator */}
        {(elevator.state === 'moving_up' || elevator.state === 'moving_down') && (
          <div className="absolute -right-3 top-1/2 transform -translate-y-1/2">
            <div className={cn(
              "w-2 h-8 rounded-full animate-pulse",
              elevator.direction === 'up' ? 'bg-green-500' : 'bg-blue-500'
            )} />
          </div>
        )}

        {/* Request Queue Indicator */}
        {elevator.requestQueue.length > 0 && (
          <div className="absolute -left-2 top-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-xs font-bold text-black">{elevator.requestQueue.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Hover Tooltip */}
      <div className="absolute -right-32 top-0 hidden group-hover:block bg-slate-800/95 backdrop-blur border border-slate-600 rounded-lg p-3 shadow-xl z-50 min-w-28">
        <div className="text-xs space-y-1">
          <div className="font-semibold text-white">Elevator {elevator.id + 1}</div>
          <div className="text-slate-300">Floor: <span className="text-white">{elevator.currentFloor}</span></div>
          <div className="text-slate-300">Load: <span className={getLoadColor()}>{currentLoad}/{elevator.capacity}</span></div>
          <div className="text-slate-300">State: <span className="text-white capitalize">{elevator.state.replace('_', ' ')}</span></div>
          {elevator.requestQueue.length > 0 && (
            <div className="text-slate-300">Queue: <span className="text-yellow-400">{elevator.requestQueue.join(', ')}</span></div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ElevatorCar