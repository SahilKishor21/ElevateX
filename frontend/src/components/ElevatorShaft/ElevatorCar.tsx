'use client'

import React from 'react'
import { ArrowUp, ArrowDown, Clock, Wrench, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  floorHeight,
  elevatorWidth,
  isSelected = false,
  onClick
}) => {
  // Precise position calculation - elevator sits exactly on floor line
  const calculatePosition = () => {
    const floorFromTop = totalFloors - elevator.currentFloor
    return floorFromTop * floorHeight + 2 // Small offset to sit on floor line
  }

  // Get passenger load
  const currentLoad = elevator.passengers?.length || Math.floor(Math.random() * (elevator.capacity + 1))
  const occupancyPercentage = (currentLoad / elevator.capacity) * 100

  // Dynamic styling based on state
  const getElevatorStyle = () => {
    const baseStyle = {
      borderColor: elevator.color || '#6b7280',
      backgroundColor: 'rgba(30, 41, 59, 0.95)'
    }

    switch (elevator.state) {
      case 'moving_up':
        return { ...baseStyle, borderColor: '#22c55e', boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }
      case 'moving_down':
        return { ...baseStyle, borderColor: '#3b82f6', boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }
      case 'maintenance':
        return { ...baseStyle, borderColor: '#ef4444', boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }
      case 'loading':
        return { ...baseStyle, borderColor: '#f59e0b', boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }
      default:
        return baseStyle
    }
  }

  const getDirectionIcon = () => {
    switch (elevator.direction) {
      case 'up':
        return <ArrowUp className="h-3 w-3 text-green-400" />
      case 'down':
        return <ArrowDown className="h-3 w-3 text-blue-400" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  const getLoadColor = () => {
    if (occupancyPercentage > 80) return 'text-red-400'
    if (occupancyPercentage > 60) return 'text-yellow-400'
    return 'text-green-400'
  }

  // Calculate responsive sizes
  const elevatorHeight = Math.max(35, floorHeight - 8)
  const headerHeight = Math.max(18, elevatorHeight * 0.25)
  const passengerIconSize = Math.max(8, Math.min(12, elevatorWidth / 10))

  return (
    <div
      className={cn(
        'absolute z-20 cursor-pointer transition-all duration-500 group',
        isSelected && 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900/50'
      )}
      style={{
        top: `${calculatePosition()}px`,
        left: '2px',
        width: `${elevatorWidth - 4}px`,
        height: `${elevatorHeight}px`,
      }}
      onClick={onClick}
    >
      <div
        className={cn(
          'h-full w-full rounded-lg border-2 backdrop-blur-sm flex flex-col relative overflow-hidden shadow-xl transition-all duration-300 hover:scale-105',
          elevator.doorOpen && 'animate-pulse'
        )}
        style={getElevatorStyle()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-2 text-white border-b border-slate-600/50"
          style={{ 
            height: `${headerHeight}px`,
            fontSize: `${Math.max(10, headerHeight * 0.6)}px`,
            backgroundColor: 'rgba(51, 65, 85, 0.8)'
          }}
        >
          <div className="flex items-center gap-1">
            <span className="font-bold">E{elevator.id + 1}</span>
            {getDirectionIcon()}
          </div>
          <span className="font-bold text-blue-300">{elevator.currentFloor}</span>
        </div>

        {/* Body */}
        <div className="flex-1 p-1.5 flex flex-col justify-between">
          {/* Passenger visualization */}
          <div className="flex-1 flex items-center justify-center">
            {elevatorHeight > 40 ? (
              // Grid layout for larger elevators
              <div 
                className="grid gap-0.5 w-full"
                style={{ 
                  gridTemplateColumns: `repeat(${Math.min(4, Math.ceil(Math.sqrt(elevator.capacity)))}, 1fr)`,
                  gridTemplateRows: `repeat(${Math.ceil(elevator.capacity / Math.min(4, Math.ceil(Math.sqrt(elevator.capacity))))}, 1fr)`
                }}
              >
                {Array.from({ length: elevator.capacity }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-full border transition-all duration-300 flex items-center justify-center",
                      i < currentLoad
                        ? "bg-blue-500 border-blue-300"
                        : "bg-slate-600/50 border-slate-500/50"
                    )}
                    style={{
                      width: `${passengerIconSize}px`,
                      height: `${passengerIconSize}px`
                    }}
                  >
                    {i < currentLoad && (
                      <Users style={{ width: `${passengerIconSize * 0.6}px`, height: `${passengerIconSize * 0.6}px` }} className="text-white" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Compact layout for smaller elevators
              <div className="flex items-center justify-center gap-1">
                <Users className="h-3 w-3 text-blue-400" />
                <span className={cn("text-xs font-medium", getLoadColor())}>
                  {currentLoad}/{elevator.capacity}
                </span>
              </div>
            )}
          </div>

          {/* Load indicator */}
          {elevatorHeight > 40 && (
            <div className="mt-1">
              <div className="text-center mb-1">
                <span className={cn("text-xs font-medium", getLoadColor())}>
                  {currentLoad}/{elevator.capacity}
                </span>
              </div>
              <div className="h-1 bg-slate-600/50 rounded-full overflow-hidden">
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
          )}
        </div>

        {/* Door animation */}
        {elevator.doorOpen && (
          <div className="absolute inset-0 flex z-30">
            <div className="w-1/2 bg-yellow-400/20 border-r-2 border-yellow-400 transform transition-transform duration-700 -translate-x-2/3" />
            <div className="w-1/2 bg-yellow-400/20 border-l-2 border-yellow-400 transform transition-transform duration-700 translate-x-2/3" />
          </div>
        )}

        {/* Maintenance overlay */}
        {elevator.state === 'maintenance' && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-40">
            <Wrench className="h-4 w-4 text-red-400" />
          </div>
        )}

        {/* Request queue indicator */}
        {elevator.requestQueue?.length > 0 && (
          <div className="absolute -top-1 -right-1 z-50">
            <div className="w-4 h-4 bg-yellow-500 border border-yellow-300 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-xs font-bold text-black">{elevator.requestQueue.length}</span>
            </div>
          </div>
        )}

        {/* Movement indicator */}
        {(elevator.state === 'moving_up' || elevator.state === 'moving_down') && (
          <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 z-30">
            <div className={cn(
              "w-1.5 h-6 rounded-full animate-pulse",
              elevator.direction === 'up' ? 'bg-green-500' : 'bg-blue-500'
            )} />
          </div>
        )}
      </div>

      {/* Enhanced tooltip */}
      <div className="absolute -right-40 top-0 hidden group-hover:block bg-slate-800/95 backdrop-blur-md border border-slate-600 rounded-lg p-3 shadow-2xl z-50 min-w-36">
        <div className="space-y-1.5 text-xs">
          <div className="font-bold text-white border-b border-slate-600 pb-1.5 mb-1.5">
            Elevator {elevator.id + 1}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <span>Floor:</span>
            <span className="text-blue-300 font-medium">{elevator.currentFloor}</span>
            
            <span>Load:</span>
            <span className={getLoadColor()}>{currentLoad}/{elevator.capacity}</span>
            
            <span>State:</span>
            <span className="text-white capitalize">{elevator.state.replace('_', ' ')}</span>
            
            {elevator.direction && elevator.direction !== 'idle' && (
              <>
                <span>Direction:</span>
                <span className="text-white capitalize">{elevator.direction}</span>
              </>
            )}
          </div>
          
          {elevator.requestQueue?.length > 0 && (
            <div className="pt-1.5 border-t border-slate-600">
              <div className="text-slate-400">Queue:</div>
              <div className="text-yellow-400 text-xs">{elevator.requestQueue.join(', ')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ElevatorCar