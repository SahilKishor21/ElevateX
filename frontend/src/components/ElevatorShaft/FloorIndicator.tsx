'use client'

import React from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FloorIndicatorProps {
  floor: number
  totalFloors: number
  floorHeight: number
  requests: any[]
  onFloorRequest: (floor: number, direction: 'up' | 'down') => void
  isSelected?: boolean
  onClick?: () => void
  position: number
}

const FloorIndicator: React.FC<FloorIndicatorProps> = ({
  floor,
  totalFloors,
  floorHeight,
  requests,
  onFloorRequest,
  isSelected = false,
  onClick,
  position
}) => {
  const floorRequests = requests.filter(req => req.floor === floor)
  const hasUpRequest = floorRequests.some(req => req.direction === 'up')
  const hasDownRequest = floorRequests.some(req => req.direction === 'down')
  
  const canGoUp = floor < totalFloors
  const canGoDown = floor > 1

  // Intelligent sizing based on available space
  const containerHeight = Math.max(40, floorHeight - 4)
  const buttonSize = Math.max(20, Math.min(32, containerHeight * 0.35))
  const floorNumberSize = Math.max(28, Math.min(40, containerHeight * 0.7))
  const fontSize = Math.max(10, Math.min(14, containerHeight * 0.25))

  const getFloorLabel = () => {
    if (floor === 1) return { main: 'Ground', sub: 'Lobby' }
    if (floor === totalFloors) return { main: `${floor}`, sub: 'Top Floor' }
    return { main: `${floor}`, sub: `Floor ${floor}` }
  }

  const floorLabel = getFloorLabel()

  return (
    <div
      className="absolute right-0 flex items-center w-full"
      style={{
        top: `${position + (floorHeight - containerHeight) / 2}px`,
        height: `${containerHeight}px`,
      }}
    >
      {/* Floor Number */}
      <div
        className={cn(
          "flex items-center justify-center font-bold text-white rounded-lg border-2 cursor-pointer transition-all duration-200 shadow-lg shrink-0",
          isSelected 
            ? 'bg-blue-600 border-blue-400 scale-105 shadow-blue-500/50 ring-2 ring-blue-400/30' 
            : 'bg-slate-700 border-slate-600 hover:border-blue-400 hover:bg-slate-600 hover:scale-105'
        )}
        style={{
          width: `${floorNumberSize}px`,
          height: `${floorNumberSize}px`,
          fontSize: `${Math.max(11, floorNumberSize * 0.35)}px`
        }}
        onClick={onClick}
      >
        {floor === 1 ? 'G' : floor}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col gap-1 ml-2 shrink-0">
        {canGoUp && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "p-0 border-2 transition-all duration-200 shadow-md hover:scale-110",
              hasUpRequest 
                ? 'bg-green-600 border-green-400 text-white  shadow-green-500/50 hover:bg-green-500' 
                : 'bg-slate-700/80 border-slate-600 text-slate-300 hover:border-green-400 hover:bg-slate-600 hover:text-green-400'
            )}
            style={{
              width: `${buttonSize}px`,
              height: `${buttonSize}px`,
              minHeight: 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation()
              onFloorRequest(floor, 'up')
            }}
          >
            <ArrowUp style={{ width: buttonSize * 0.5, height: buttonSize * 0.5 }} />
          </Button>
        )}
        
        {canGoDown && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "p-0 border-2 transition-all duration-200 shadow-md hover:scale-110",
              hasDownRequest 
                ? 'bg-blue-600 border-blue-400 text-white  shadow-blue-500/50 hover:bg-blue-500' 
                : 'bg-slate-700/80 border-slate-600 text-slate-300 hover:border-blue-400 hover:bg-slate-600 hover:text-blue-400'
            )}
            style={{
              width: `${buttonSize}px`,
              height: `${buttonSize}px`,
              minHeight: 'auto'
            }}
            onClick={(e) => {
              e.stopPropagation()
              onFloorRequest(floor, 'down')
            }}
          >
            <ArrowDown style={{ width: buttonSize * 0.5, height: buttonSize * 0.5 }} />
          </Button>
        )}
      </div>

      {/* Floor Label */}
      <div className="flex-1 ml-3 min-w-0">
        <div 
          className="text-white font-semibold truncate"
          style={{ fontSize: `${fontSize}px` }}
        >
          {floorLabel.main}
        </div>
        {containerHeight > 50 && (
          <div 
            className="text-slate-400 text-xs truncate -mt-0.5"
            style={{ fontSize: `${Math.max(8, fontSize * 0.75)}px` }}
          >
            {floorLabel.sub}
          </div>
        )}
      </div>

      {/* Request Counter */}
      {floorRequests.length > 0 && (
        <div className="shrink-0 ml-2">
          <div 
            className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full font-bold flex items-center justify-center animate-bounce shadow-lg border-2 border-red-400/50"
            style={{
              width: `${Math.max(18, buttonSize * 0.8)}px`,
              height: `${Math.max(18, buttonSize * 0.8)}px`,
              fontSize: `${Math.max(9, buttonSize * 0.35)}px`
            }}
          >
            {floorRequests.length}
          </div>
        </div>
      )}

      {/* Activity Indicator */}
      {(hasUpRequest || hasDownRequest) && (
        <div className="absolute -left-1 top-1/2 transform -translate-y-1/2">
          <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-blue-500 rounded-full  opacity-80" />
        </div>
      )}
    </div>
  )
}

export default FloorIndicator