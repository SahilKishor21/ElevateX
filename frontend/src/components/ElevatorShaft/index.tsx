'use client'

import React, { useMemo } from 'react'
import ElevatorCar from './ElevatorCar'
import FloorIndicator from './FloorIndicator'
import { useSimulation } from '@/hooks/useSimulation'
import { useUIStore } from '@/store/uiStore'

const ElevatorShaft: React.FC = () => {
  const { elevators, config, floorRequests, actions } = useSimulation()
  const { selectedElevator, selectedFloor, setSelectedElevator, setSelectedFloor } = useUIStore()

  // Intelligent responsive calculations for scalability
  const dimensions = useMemo(() => {
    // Base calculations that scale intelligently
    const baseFloorHeight = 70
    const baseElevatorWidth = 90
    
    // Scale down as numbers increase to maintain tidiness
    const floorHeightScale = Math.max(0.6, 1 - (config.numFloors - 5) * 0.02)
    const elevatorWidthScale = Math.max(0.7, 1 - (config.numElevators - 3) * 0.05)
    
    const floorHeight = Math.max(50, baseFloorHeight * floorHeightScale)
    const elevatorWidth = Math.max(65, baseElevatorWidth * elevatorWidthScale)
    
    const shaftSpacing = Math.max(8, elevatorWidth * 0.15)
    const sideMargin = 30
    
    const floorIndicatorWidth = 140
    
    // Total dimensions
    const shaftAreaWidth = (config.numElevators * elevatorWidth) + ((config.numElevators - 1) * shaftSpacing)
    const totalWidth = shaftAreaWidth + floorIndicatorWidth + (sideMargin * 3)
    const totalHeight = config.numFloors * floorHeight
    
    return {
      floorHeight,
      elevatorWidth,
      shaftSpacing,
      sideMargin,
      floorIndicatorWidth,
      shaftAreaWidth,
      totalWidth,
      totalHeight,
      // Calculated positions
      shaftStartX: sideMargin,
      floorIndicatorX: sideMargin + shaftAreaWidth + sideMargin
    }
  }, [config.numElevators, config.numFloors])

  return (
    <div className="h-full bg-slate-100 dark:bg-slate-900">
      <div className="p-6 h-full flex flex-col relative">
        {/* Header */}
        <div className="mb-6 flex-shrink-0 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Elevator System Simulation</h2>
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                {config.numElevators} Elevators
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                {config.numFloors} Floors
              </span>
            </div>
          </div>

          {/* Legend - Positioned parallel to heading */}
          <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-gray-200/50 shadow-xl dark:bg-slate-800/90 dark:border-slate-600/50">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Status</h4>
            <div className="flex items-center gap-4 text-xs">
              {[
                { color: 'bg-green-500', label: 'Moving Up' },
                { color: 'bg-blue-500', label: 'Moving Down' },
                { color: 'bg-yellow-500', label: 'Loading' },
                { color: 'bg-gray-500', label: 'Idle' },
                { color: 'bg-red-500', label: 'Maintenance' }
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-gray-600 dark:text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Simulation Area */}
        <div className="flex-1 bg-gray-100/20 backdrop-blur-sm rounded-xl border border-gray-200/50 overflow-hidden dark:bg-slate-800/20 dark:border-slate-700/50 no-scrollbar">
          <div className="h-full overflow-auto p-4 no-scrollbar">
            <div 
              className="relative mx-auto bg-gray-200/30 rounded-xl border border-gray-300/30 shadow-2xl dark:bg-slate-900/30 dark:border-slate-600/30"
              style={{ 
                width: `${dimensions.totalWidth}px`,
                height: `${dimensions.totalHeight}px`,
                minWidth: '600px',
                minHeight: '400px'
              }}
            >
              {/* Background Grid */}
              <div className="absolute inset-0 overflow-hidden rounded-xl">
                {/* Vertical grid lines for elevator shafts */}
                {Array.from({ length: config.numElevators + 1 }, (_, i) => (
                  <div
                    key={`v-grid-${i}`}
                    className="absolute top-0 bottom-0 w-px bg-gray-300/20 dark:bg-slate-600/20"
                    style={{
                      left: `${dimensions.shaftStartX + (i * (dimensions.elevatorWidth + dimensions.shaftSpacing)) - dimensions.shaftSpacing/2}px`
                    }}
                  />
                ))}
                
                {/* Horizontal grid lines for floors */}
                {Array.from({ length: config.numFloors + 1 }, (_, i) => (
                  <div
                    key={`h-grid-${i}`}
                    className="absolute left-0 right-0 h-px bg-gray-300/20 dark:bg-slate-600/20"
                    style={{
                      top: `${i * dimensions.floorHeight}px`
                    }}
                  />
                ))}
              </div>

              {/* Floor Numbers (Left Side) */}
              <div className="absolute left-0 top-0" style={{ width: '15px' }}>
                {Array.from({ length: config.numFloors }, (_, i) => {
                  const floor = config.numFloors - i
                  return (
                    <div
                      key={`floor-num-${floor}`}
                      className="absolute flex items-center justify-center text-gray-500 font-medium text-xs dark:text-slate-400"
                      style={{
                        top: `${i * dimensions.floorHeight + (dimensions.floorHeight - 20) / 2}px`,
                        height: '20px',
                        width: '15px'
                      }}
                    >
                      {floor === 1 ? 'G' : floor}
                    </div>
                  )
                })}
              </div>

              {/* Elevator Shafts */}
              <div 
                className="absolute top-0" 
                style={{
                  left: `${dimensions.shaftStartX}px`,
                  width: `${dimensions.shaftAreaWidth}px`,
                  height: `${dimensions.totalHeight}px`
                }}
              >
                {elevators.map((elevator, index) => (
                  <div
                    key={`shaft-${elevator.id}`}
                    className="absolute"
                    style={{
                      left: `${index * (dimensions.elevatorWidth + dimensions.shaftSpacing)}px`,
                      top: '0px',
                      width: `${dimensions.elevatorWidth}px`,
                      height: `${dimensions.totalHeight}px`
                    }}
                  >
                    {/* Shaft Background */}
                    <div className="absolute inset-0 bg-white/10 border-l border-r border-gray-300/20 rounded-sm dark:bg-slate-800/10 dark:border-slate-600/20" />
                    
                    {/* Shaft Header */}
                    <div 
                      className="absolute -top-8 left-0 right-0 text-center"
                      style={{ height: '20px' }}
                    >
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200/80 backdrop-blur-sm rounded-md border border-gray-300 dark:bg-slate-700/80 dark:border-slate-600">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: elevator.color || '#6b7280' }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">E{elevator.id + 1}</span>
                      </div>
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
              </div>

              {/* Floor Controls (Right Side) */}
              <div 
                className="absolute top-0"
                style={{
                  left: `${dimensions.floorIndicatorX}px`,
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
            </div>
          </div>
        </div>

        {/* Selection Info Panel */}
        {(selectedElevator !== null || selectedFloor !== null) && (
          <div className="mt-4 p-4 bg-gray-100/40 backdrop-blur-sm rounded-xl border border-gray-200/50 flex-shrink-0 dark:bg-slate-800/40 dark:border-slate-600/50">
            <div className="flex gap-8">
              {selectedElevator !== null && elevators[selectedElevator] && (
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: elevators[selectedElevator].color || '#6b7280' }}
                    />
                    Elevator {selectedElevator + 1}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-slate-400">Current Floor:</span>
                      <div className="text-gray-900 font-medium dark:text-white">{elevators[selectedElevator].currentFloor}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400">Status:</span>
                      <div className="text-gray-900 font-medium capitalize dark:text-white">
                        {elevators[selectedElevator].state.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400">Capacity:</span>
                      <div className="text-gray-900 font-medium dark:text-white">
                        {elevators[selectedElevator].passengers?.length || 0}/{elevators[selectedElevator].capacity}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400">Queue:</span>
                      <div className="text-gray-900 font-medium dark:text-white">
                        {elevators[selectedElevator].requestQueue?.length || 0} requests
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedFloor !== null && (
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Floor {selectedFloor}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-slate-400">Type:</span>
                      <div className="text-gray-900 font-medium dark:text-white">
                        {selectedFloor === 1 ? 'Ground Floor' : 
                          selectedFloor === config.numFloors ? 'Top Floor' : 
                          'Standard Floor'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400">Active Requests:</span>
                      <div className="text-gray-900 font-medium dark:text-white">
                        {floorRequests.filter(r => r.floor === selectedFloor).length}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ElevatorShaft