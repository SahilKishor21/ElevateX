'use client'

import React from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

  // Responsive sizing
  const buttonSize = Math.max(16, Math.min(28, floorHeight * 0.3))
  const fontSize = Math.max(8, Math.min(12, floorHeight * 0.2))
  const floorNumberSize = Math.max(20, Math.min(32, floorHeight * 0.4))

  return (
    <div
      className="absolute right-0 flex items-center gap-2 w-full"
      style={{
        top: `${position + (floorHeight - floorNumberSize) / 2}px`,
        height: `${floorNumberSize}px`,
      }}
    >
      {/* Floor Number */}
      <div
        className={`flex items-center justify-center font-bold text-white rounded border cursor-pointer transition-all ${
          isSelected 
            ? 'bg-blue-500 border-blue-400' 
            : 'bg-slate-700 border-slate-600 hover:border-blue-400'
        }`}
        style={{
          width: `${floorNumberSize}px`,
          height: `${floorNumberSize}px`,
          fontSize: `${Math.max(8, floorNumberSize * 0.4)}px`
        }}
        onClick={onClick}
      >
        {floor}
      </div>

      {/* Up/Down Buttons */}
      <div className="flex flex-col gap-0.5">
        {canGoUp && (
          <Button
            variant={hasUpRequest ? 'default' : 'outline'}
            className={`p-0 border transition-all ${
              hasUpRequest 
                ? 'bg-green-500 border-green-400 animate-pulse hover:bg-green-600' 
                : 'bg-slate-700 border-slate-600 hover:border-green-400 hover:bg-slate-600'
            }`}
            style={{
              width: `${buttonSize}px`,
              height: `${buttonSize}px`,
              minHeight: 'auto'
            }}
            onClick={() => onFloorRequest(floor, 'up')}
          >
            <ArrowUp style={{ width: buttonSize * 0.5, height: buttonSize * 0.5 }} />
          </Button>
        )}
        
        {canGoDown && (
          <Button
            variant={hasDownRequest ? 'default' : 'outline'}
            className={`p-0 border transition-all ${
              hasDownRequest 
                ? 'bg-blue-500 border-blue-400 animate-pulse hover:bg-blue-600' 
                : 'bg-slate-700 border-slate-600 hover:border-blue-400 hover:bg-slate-600'
            }`}
            style={{
              width: `${buttonSize}px`,
              height: `${buttonSize}px`,
              minHeight: 'auto'
            }}
            onClick={() => onFloorRequest(floor, 'down')}
          >
            <ArrowDown style={{ width: buttonSize * 0.5, height: buttonSize * 0.5 }} />
          </Button>
        )}
      </div>

      {/* Floor Label */}
      <div 
        className="text-slate-400 truncate flex-1"
        style={{ fontSize: `${fontSize}px` }}
      >
        {floor === 1 ? 'Lobby' : 
         floor === totalFloors ? 'Top' : 
         `Floor ${floor}`}
      </div>

      {/* Request Count */}
      {floorRequests.length > 0 && (
        <div 
          className="bg-red-500 text-white rounded-full font-bold flex items-center justify-center"
          style={{
            width: `${Math.max(12, buttonSize * 0.6)}px`,
            height: `${Math.max(12, buttonSize * 0.6)}px`,
            fontSize: `${Math.max(6, buttonSize * 0.3)}px`
          }}
        >
          {floorRequests.length}
        </div>
      )}
    </div>
  )
}

export default FloorIndicator