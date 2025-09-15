# Elevator Simulation System

A comprehensive elevator simulation system with advanced scheduling algorithms and real-time visualization.

## Features

### Core Simulation
- **Multiple Elevators**: Support for 1-8 elevators
- **Configurable Floors**: 2-50 floors
- **Real-time Animation**: Smooth elevator movements and door operations
- **Dynamic Requests**: Interactive request generation and automatic traffic patterns

### Advanced Scheduling Algorithm
- **Hybrid Dynamic Scheduler**: Combines SCAN algorithm with intelligent priority management
- **Traffic Pattern Recognition**: Adapts to morning rush, lunch time, and evening rush patterns
- **Anti-Starvation**: Prevents requests from waiting indefinitely (>60 seconds)
- **Predictive Positioning**: Positions idle elevators based on expected traffic

### User Experience Priorities
- **Wait Time Escalation**: Priority increases exponentially after 30 seconds
- **Rush Hour Optimization**: Special handling for lobby-to-upper-floor requests (8-10 AM)
- **Load Balancing**: Distributes requests across elevators to prevent overcrowding
- **Emergency Handling**: Immediate assignment for critical situations

### Performance Analytics
- **Real-time Metrics**: Average wait time, system utilization, throughput
- **Performance Grading**: A-F grade based on efficiency metrics
- **Historical Tracking**: Charts and trends over time
- **Stress Testing**: Handles 100+ simultaneous requests

## Technology Stack

### Frontend
- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components with shadcn/ui
- **Recharts** for data visualization
- **Zustand** for state management
- **Framer Motion** for animations
- **Socket.IO Client** for real-time updates

### Backend
- **Node.js** with Express
- **Socket.IO** for WebSocket communication
- **In-memory state management** (no database required)
- **Advanced scheduling algorithms**
- **Real-time metrics calculation**

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd elevator-simulation