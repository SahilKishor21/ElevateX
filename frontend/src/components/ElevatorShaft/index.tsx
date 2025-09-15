'use client'

import React, { useMemo } from 'react'
import ElevatorCar from './ElevatorCar'
import FloorIndicator from './FloorIndicator'
import { useSimulation } from '@/hooks/useSimulation'
import { useUIStore } from '@/store/uiStore'

const ElevatorShaft: React.FC = () => {
  const { elevators, config, floorRequests, actions } = useSimulation()
  const { selectedElevator, selectedFloor, setSelectedElevator, setSelectedFloor } = useUIStore()

  // Calculate responsive dimensions
  const dimensions = useMemo(() => {
    const minFloorHeight = Math.max(40, Math.min(80, 800 / config.numFloors)) // Responsive floor height
    const minElevatorWidth = Math.max(60, Math.min(100, 600 / config.numElevators)) // Responsive elevator width
    const elevatorSpacing = 10
    const floorIndicatorWidth = 120
    

    return {
      floorHeight: minFloorHeight,
      elevatorWidth: minElevatorWidth,
      elevatorSpacing,
      floorIndicatorWidth,
      totalWidth: (config.numElevators * (minElevatorWidth + elevatorSpacing)) + floorIndicatorWidth + 100,
      totalHeight: config.numFloors * minFloorHeight
    }
  }, [config.numElevators, config.numFloors])

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900">
      <div className="p-4 h-full flex flex-col">
        {/* Header */}
        <div className="mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-white mb-1">Elevator System Simulation</h2>
          <p className="text-slate-400 text-sm">
            {config.numElevators} Elevators • {config.numFloors} Floors
          </p>
        </div>

        {/* Scrollable Simulation Container */}
        <div className="flex-1 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
          <div className="h-full overflow-auto p-4">
            <div 
              className="relative mx-auto bg-slate-900/50 rounded-lg border border-slate-700"
              style={{ 
                width: `${dimensions.totalWidth}px`,
                height: `${dimensions.totalHeight + 60}px`,
                minHeight: '400px'
              }}
            >
              {/* Floor Grid Lines */}
              <div className="absolute inset-4">
                {Array.from({ length: config.numFloors }, (_, i) => (
                  <div
                    key={`grid-${i}`}
                    className="absolute w-full border-b border-slate-600/20"
                    style={{
                      top: `${i * dimensions.floorHeight}px`,
                      height: `${dimensions.floorHeight}px`
                    }}
                  />
                ))}
              </div>

              {/* Elevator Shafts */}
              {elevators.map((elevator, index) => (
                <div
                  key={`shaft-${elevator.id}`}
                  className="absolute"
                  style={{
                    left: `${20 + index * (dimensions.elevatorWidth + dimensions.elevatorSpacing)}px`,
                    top: '20px',
                    width: `${dimensions.elevatorWidth}px`,
                    height: `${dimensions.totalHeight}px`
                  }}
                >
                  {/* Shaft Background */}
                  <div className="absolute inset-0 bg-slate-800/30 border-l border-r border-slate-600/30 rounded-sm" />
                  
                  {/* Shaft Label */}
                  <div 
                    className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-medium text-slate-400"
                    style={{ fontSize: Math.max(10, Math.min(12, dimensions.elevatorWidth / 8)) }}
                  >
                    E{index + 1}
                  </div>

                  {/* Elevator Car */}
                  <ElevatorCar
                    elevator={elevator}
                    totalFloors={config.numFloors}
                    floorHeight={dimensions.floorHeight}
                    elevatorWidth={dimensions.elevatorWidth}
                    isSelected={selectedElevator === elevator.id}
                    onClick={() => setSelectedElevator(selectedElevator === elevator.id ? null : elevator.id)}
                  />
                </div>
              ))}

              {/* Floor Indicators - Right Side */}
              <div 
                className="absolute top-5"
                style={{
                  right: '20px',
                  width: `${dimensions.floorIndicatorWidth}px`,
                  height: `${dimensions.totalHeight}px`
                }}
              >
                {Array.from({ length: config.numFloors }, (_, i) => {
                  const floor = config.numFloors - i
                  return (
                    <FloorIndicator
                      key={`floor-${floor}`}
                      floor={floor}
                      totalFloors={config.numFloors}
                      floorHeight={dimensions.floorHeight}
                      requests={floorRequests}
                      onFloorRequest={actions.addFloorCall}
                      isSelected={selectedFloor === floor}
                      onClick={() => setSelectedFloor(selectedFloor === floor ? null : floor)}
                      position={i * dimensions.floorHeight}
                    />
                  )
                })}
              </div>

              {/* Legend - Top Right */}
              <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700 max-w-40">
                <h4 className="text-xs font-medium text-white mb-2">Legend</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-slate-300">Moving</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-slate-300">Request</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <span className="text-slate-300">Idle</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selection Info */}
        {(selectedElevator !== null || selectedFloor !== null) && (
          <div className="mt-3 p-3 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 flex-shrink-0">
            {selectedElevator !== null && elevators[selectedElevator] && (
              <div className="text-sm">
                <h4 className="font-medium text-white mb-1">Elevator {selectedElevator + 1}</h4>
                <div className="flex gap-4 text-slate-300">
                  <span>Floor: <span className="text-white">{elevators[selectedElevator].currentFloor}</span></span>
                  <span>State: <span className="text-white capitalize">{elevators[selectedElevator].state.replace('_', ' ')}</span></span>
                  <span>Load: <span className="text-white">{elevators[selectedElevator].passengers.length}/{elevators[selectedElevator].capacity}</span></span>
                </div>
              </div>
            )}
            
            {selectedFloor !== null && (
              <div className="text-sm">
                <h4 className="font-medium text-white mb-1">Floor {selectedFloor}</h4>
                <div className="flex gap-4 text-slate-300">
                  <span>Type: <span className="text-white">
                    {selectedFloor === 1 ? 'Lobby' : selectedFloor === config.numFloors ? 'Top' : 'Standard'}
                  </span></span>
                  <span>Requests: <span className="text-white">{floorRequests.filter(r => r.floor === selectedFloor).length}</span></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ElevatorShaft