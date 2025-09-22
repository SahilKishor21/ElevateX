# Real-Time Elevator Simulation System

A sophisticated web-based elevator scheduling system with intelligent algorithms, real-time visualization, and comprehensive performance monitoring.

## Overview

### Main Simulation Interface
![Elevator System Dashboard](https://res.cloudinary.com/djqkofsv0/image/upload/v1758540650/Screenshot_2025-09-22_165751_xf7ot9.png)

### Algorithm Comparison & Metrics Dashboard
![Performance Metrics](https://res.cloudinary.com/djqkofsv0/image/upload/v1758540803/Screenshot_2025-09-22_170252_ww7ft6.png)

## Features

### Core Functionality
- **Real-time 3D elevator visualization** with smooth animations
- **Intelligent hybrid scheduling algorithm** with starvation prevention
- **Dynamic algorithm switching** (Hybrid vs SCAN) without restart
- **Peak hour traffic simulation** with predictive positioning
- **Assignment compliance tracking** for traffic pattern requirements

### Advanced Features
- **Multi-level starvation prevention** (early → moderate → severe → critical escalation)
- **User experience biases** (30s escalation, lobby priority, positioning)
- **Comprehensive performance metrics** and real-time monitoring
- **Stress testing capabilities** for high-volume request scenarios
- **Live algorithm performance comparison**

### User Interface
- **Interactive controls** for elevators, floors, and request frequency
- **Real-time dashboards** with performance analytics
- **Multiple view modes** (simulation, metrics, algorithms, testing)
- **Dark/light theme support** with system preference detection
- **Responsive design** optimized for desktop and tablet

## Architecture

```
├── backend/                 # Node.js + Express + Socket.IO
│   ├── src/
│   │   ├── controllers/     # API endpoints and algorithm control
│   │   │   ├── elevatorController.js
│   │   │   └── algorithmController.js
│   │   ├── services/        # Core simulation engine and metrics
│   │   │   ├── simulationEngine.js
│   │   │   ├── metricsService.js
│   │   │   └── trafficAnalyzer.js
│   │   ├── models/          # Elevator, Request, Building entities
│   │   │   ├── Elevator.js
│   │   │   ├── Request.js
│   │   │   └── Building.js
│   │   ├── algorithms/      # Scheduling algorithms and priority logic
│   │   │   ├── hybridScheduler.js
│   │   │   ├── scanAlgorithm.js
│   │   │   └── priorityCalculator.js
│   │   └── utils/           # Constants and helper functions
│   └── server.js            # WebSocket server with real-time updates
│
├── frontend/                # Next.js 14 + TypeScript
│   ├── src/
│   │   ├── app/            # Next.js app router pages
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/     # React components organized by feature
│   │   │   ├── Layout/
│   │   │   ├── Dashboard/
│   │   │   ├── Algorithm/
│   │   │   └── Testing/
│   │   ├── hooks/          # Custom hooks for business logic
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useSimulation.ts
│   │   │   ├── useMetrics.ts
│   │   │   └── useTheme.ts
│   │   ├── store/          # Zustand state management
│   │   │   ├── elevatorStore.ts
│   │   │   ├── metricsStore.ts
│   │   │   └── uiStore.ts
│   │   ├── lib/            # Utilities and constants
│   │   │   ├── utils.ts
│   │   │   └── constants.ts
│   │   └── types/          # TypeScript type definitions
│   └── package.json
```

## Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/SahilKishor21/ElevateX
   cd elevator-system
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file in backend directory
   touch .env
   ```
   
   Add the following configuration:
   ```env
   PORT=3001
   FRONTEND_URL=https://elevate-x-seven.vercel.app/
   NODE_ENV=development
   DEFAULT_ELEVATORS=3
   DEFAULT_FLOORS=15
   DEFAULT_CAPACITY=8
   SIMULATION_SPEED=1
   MAX_REQUESTS_HISTORY=1000
   MAX_METRICS_HISTORY=100
   OPTIMIZATION_INTERVAL=500
   WEBSOCKET_TIMEOUT=5000
   HEARTBEAT_INTERVAL=30000
   ```

4. **Start the backend server**
   ```bash
   npm start
   # Or for development with hot reload:
   npm run dev
   ```

   The backend server will start on `http://localhost:3001`

### Frontend Setup

1. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

2. **Configure environment variables**
   ```bash
   # Create .env.local file in frontend directory
   touch .env.local
   ```
   
   Add the following configuration:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_WS_URL=ws://localhost:3001
   NEXT_PUBLIC_ENABLE_DEBUG=true
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

### Production Deployment

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   npm start
   ```

2. **Deploy backend**
   ```bash
   cd backend
   npm install -g pm2
   pm2 start server.js --name elevator-backend
   pm2 startup
   pm2 save
   ```

## Usage

### Basic Operation

1. **Start the simulation**
   - Click "Start Simulation" in the control panel
   - Adjust elevator count (1-8), floor count (5-50), and request frequency
   - Use speed controls (0.5x to 10x) for different viewing preferences

2. **Add requests manually**
   - **Floor calls**: Click floor buttons (↑/↓) for pickup requests
   - **Direct requests**: Use "Add Request" with origin and destination floors
   - **Peak traffic**: Use "Generate Peak Traffic" for rush hour simulation

3. **Monitor performance**
   - Switch to "Metrics" view for detailed performance analytics
   - Check "Assignment Compliance" for traffic pattern adherence
   - View real-time alerts for system issues

### Advanced Features

#### Algorithm Comparison
The system supports live switching between two algorithms:

- **Hybrid Dynamic Scheduler**: Optimizes for user experience with priority biases
- **SCAN Algorithm**: Traditional elevator algorithm for performance comparison

```javascript
// Switch algorithms via WebSocket
socket.emit('switch_algorithm', { algorithm: 'hybrid' | 'scan' });
```

#### Stress Testing
Navigate to "Testing" view to:
- Configure test parameters (request count, duration, pattern)
- Monitor system performance under high load
- Analyze elevator capacity and response times

#### Peak Hour Simulation
The system implements realistic traffic patterns:
- **Morning Rush (8-10 AM)**: 70% requests from lobby to upper floors
- **Lunch Period (12-2 PM)**: Mixed traffic with middle floor emphasis
- **Evening Rush (5-7 PM)**: 70% requests from upper floors to lobby

## Technical Implementation

### Real-Time Communication

**WebSocket Events (Client → Server):**
- `start_simulation`: Initialize simulation with config
- `stop_simulation`: Pause simulation (preserves state)
- `reset_simulation`: Reset all elevators and requests
- `add_request`: Add passenger request
- `config_change`: Update simulation parameters
- `emergency_stop`: Immediate safety halt

**WebSocket Events (Server → Client):**
- `simulation_update`: Real-time state updates (elevators, requests, status)
- `metrics_update`: Performance metrics and assignment compliance
- `config_updated`: Configuration change confirmation
- `error`: Error notifications and recovery suggestions

### Scheduling Algorithms

#### Hybrid Dynamic Scheduler (hybridScheduler.js)
- **Immediate Assignment Strategy**: Requests assigned within milliseconds
- **Multi-Factor Scoring**: Considers distance, load, direction, and urgency
- **Starvation Prevention**: Four-tier escalation system
- **User Experience Biases**: Implements all three required optimizations

#### SCAN Algorithm (scanAlgorithm.js)
- **Traditional SCAN Implementation**: Elevator continues in one direction until no more requests
- **Direction Reversal Logic**: Automatically reverses at building boundaries
- **Queue Optimization**: Sorts requests based on scan direction

### Priority System (priorityCalculator.js)

**Starvation Escalation:**
```javascript
// Wait time escalation thresholds
early: 30 seconds    // +75 priority boost, 1.8x multiplier
moderate: 45 seconds // +150 priority boost, 2.0x multiplier  
severe: 60 seconds   // +300 priority boost, 3.0x multiplier
critical: 90 seconds // +500 priority boost, 5.0x multiplier
```

**Traffic Pattern Bonuses:**
- Morning rush (9 AM): +40 points for lobby→upper requests
- Evening rush (6 PM): +35 points for upper→lobby requests
- Peak hour multipliers: Up to 2.0x priority increase

### State Management (Frontend)

**Zustand Stores:**
- **elevatorStore.ts**: Elevator positions, requests, configuration
- **metricsStore.ts**: Performance data, historical trends, alerts
- **uiStore.ts**: Theme, sidebar, view modes, user preferences

**Custom Hooks:**
- **useWebSocket.ts**: Socket.IO integration with automatic reconnection
- **useSimulation.ts**: Simulation lifecycle and request management
- **useMetrics.ts**: Performance data processing and formatting
- **useTheme.ts**: Dark/light mode with system preference detection

## Configuration

### Backend Configuration (.env)
```env
PORT=3001                           # Server port
FRONTEND_URL=https://elevate-x-seven.vercel.app/  # CORS origin
NODE_ENV=development                # Environment mode
DEFAULT_ELEVATORS=3                 # Initial elevator count
DEFAULT_FLOORS=15                   # Initial floor count
DEFAULT_CAPACITY=8                  # Passenger capacity per elevator
SIMULATION_SPEED=1                  # Base simulation speed
MAX_REQUESTS_HISTORY=1000           # Maximum stored requests
MAX_METRICS_HISTORY=100             # Maximum stored metrics
OPTIMIZATION_INTERVAL=500           # Algorithm optimization frequency (ms)
WEBSOCKET_TIMEOUT=5000              # WebSocket connection timeout
HEARTBEAT_INTERVAL=30000            # Connection heartbeat interval
```

### Frontend Configuration (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001      # Backend API URL
NEXT_PUBLIC_WS_URL=ws://localhost:3001         # WebSocket URL
NEXT_PUBLIC_ENABLE_DEBUG=true                  # Debug logging
```

## API Reference

### REST Endpoints

#### GET `/api/status`
Returns current simulation status, elevator states, and system health.

#### GET `/api/algorithm-comparison`
Provides real-time performance comparison between Hybrid and SCAN algorithms.

#### POST `/api/switch-algorithm`
```json
{
  "algorithm": "hybrid" | "scan"
}
```

### WebSocket Communication

The system uses Socket.IO for real-time bidirectional communication with events defined in `constants.ts`:

```javascript
export const WEBSOCKET_EVENTS = {
  SIMULATION_UPDATE: 'simulation_update',
  METRICS_UPDATE: 'metrics_update',
  CONFIG_CHANGE: 'config_change',
  ADD_REQUEST: 'add_request',
  EMERGENCY_STOP: 'emergency_stop',
  // ... additional events
}
```

## Development

### Code Structure

**Backend Services:**
- **SimulationEngine**: Core orchestrator managing elevator fleet and requests
- **MetricsService**: Performance tracking and assignment compliance monitoring  
- **TrafficAnalyzer**: Pattern recognition and predictive positioning
- **HybridScheduler**: Advanced scheduling with user experience optimization
- **PriorityCalculator**: Multi-factor priority scoring with starvation prevention

**Frontend Architecture:**
- **Component Organization**: Features grouped by functionality (Layout, Dashboard, Algorithm, Testing)
- **State Management**: Reactive Zustand stores with TypeScript
- **Custom Hooks**: Business logic abstraction for reusable functionality
- **Real-time Updates**: WebSocket-driven UI with optimistic rendering

### Debug Mode
```bash
# Backend debugging
NODE_ENV=development npm start

# Frontend debugging  
NEXT_PUBLIC_ENABLE_DEBUG=true npm run dev
```

## Testing

Run the simulation and test different scenarios:
- **Normal Load**: Default configuration with moderate request frequency
- **Peak Hour**: High request frequency with lobby traffic bias
- **Stress Test**: Maximum request volume to test system limits

Monitor the following metrics during testing:
- Average wait time and maximum wait time
- Elevator utilization rates
- Starvation event count (target: 0)
- Assignment compliance during peak hours
- System stability under load

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes with proper TypeScript types
4. Test your changes thoroughly
5. Submit a pull request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured rules
- **Documentation**: Comment complex algorithms and business logic

