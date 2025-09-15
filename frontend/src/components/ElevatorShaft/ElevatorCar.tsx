'use client'

import React from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

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
  const calculatePosition = () => {
    return (totalFloors - elevator.currentFloor) * floorHeight
  }

  const carHeight = Math.max(24, floorHeight - 8)
  const fontSize = Math.max(8, Math.min(12, elevatorWidth / 10))

  return (
    <div
      className="absolute inset-x-0 transition-all duration-1000 ease-out cursor-pointer z-10"
      style={{
        top: `${calculatePosition() + 4}px`,
        height: `${carHeight}px`,
      }}
      onClick={onClick}
    >
      <div
        className={`h-full w-full rounded border-2 transition-all duration-200 flex flex-col ${
          isSelected 
            ? 'border-white bg-blue-500/30 shadow-lg' 
            : 'border-slate-500 bg-slate-700/80 hover:border-blue-400'
        }`}
        style={{ borderColor: isSelected ? '#ffffff' : elevator.color }}
      >
        {/* Elevator Header */}
        <div 
          className="flex items-center justify-between px-1 py-0.5 bg-black/20 text-white"
          style={{ fontSize: `${fontSize}px`, minHeight: '14px' }}
        >
          <span className="font-bold">E{elevator.id + 1}</span>
          <div className="flex items-center gap-0.5">
            {elevator.direction === 'up' && <ArrowUp style={{ width: fontSize, height: fontSize }} />}
            {elevator.direction === 'down' && <ArrowDown style={{ width: fontSize, height: fontSize }} />}
            <span>{elevator.currentFloor}</span>
          </div>
        </div>

        {/* Elevator Body */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Passenger Indicators */}
          <div className="flex flex-wrap justify-center gap-0.5 max-w-full">
            {Array.from({ length: Math.min(elevator.passengers.length, 8) }, (_, i) => (
              <div
                key={i}
                className="rounded-full bg-white/60"
                style={{
                  width: Math.max(2, elevatorWidth / 16),
                  height: Math.max(2, elevatorWidth / 16)
                }}
              />
            ))}
          </div>

          {/* State Indicator */}
          <div 
            className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: 
                elevator.state === 'moving_up' || elevator.state === 'moving_down' ? '#3b82f6' :
                elevator.state === 'loading' ? '#f59e0b' :
                elevator.state === 'maintenance' ? '#ef4444' : '#6b7280'
            }}
          />
        </div>

        {/* Load Indicator */}
        <div 
          className="h-0.5 bg-gray-600 mx-1 mb-1 rounded-full overflow-hidden"
          style={{ minHeight: '2px' }}
        >
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${(elevator.passengers.length / elevator.capacity) * 100}%`,
              backgroundColor: elevator.color
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default ElevatorCar