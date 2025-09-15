const generateId = () => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

const calculateDistance = (floor1, floor2) => {
  return Math.abs(floor1 - floor2)
}

const formatTime = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max)
}

const getRandomInRange = (min, max) => {
  return Math.random() * (max - min) + min
}

const shuffleArray = (array) => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const getCurrentHour = () => {
  return new Date().getHours()
}

const isRushHour = (hour = getCurrentHour()) => {
  return (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)
}

const getTimeOfDay = (hour = getCurrentHour()) => {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

const calculatePercentile = (array, percentile) => {
  if (array.length === 0) return 0
  
  const sorted = [...array].sort((a, b) => a - b)
  const index = (percentile / 100) * (sorted.length - 1)
  
  if (Number.isInteger(index)) {
    return sorted[index]
  } else {
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index - lower
    return sorted[lower] * (1 - weight) + sorted[upper] * weight
  }
}

const exponentialBackoff = (attempt, baseDelay = 1000, maxDelay = 30000) => {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  return delay + Math.random() * 1000 // Add jitter
}

const validateElevatorConfig = (config) => {
  const errors = []
  
  if (config.numElevators < 1 || config.numElevators > 10) {
    errors.push('Number of elevators must be between 1 and 10')
  }
  
  if (config.numFloors < 2 || config.numFloors > 50) {
    errors.push('Number of floors must be between 2 and 50')
  }
  
  if (config.capacity < 1 || config.capacity > 30) {
    errors.push('Elevator capacity must be between 1 and 30')
  }
  
  if (config.speed < 0.1 || config.speed > 10) {
    errors.push('Simulation speed must be between 0.1 and 10')
  }
  
  return errors
}

const sanitizeConfig = (config) => {
  return {
    numElevators: clamp(parseInt(config.numElevators) || 3, 1, 10),
    numFloors: clamp(parseInt(config.numFloors) || 15, 2, 50),
    capacity: clamp(parseInt(config.capacity) || 8, 1, 30),
    speed: clamp(parseFloat(config.speed) || 1, 0.1, 10),
    requestFrequency: clamp(parseFloat(config.requestFrequency) || 2, 0.1, 20)
  }
}

module.exports = {
  generateId,
  calculateDistance,
  formatTime,
  clamp,
  getRandomInRange,
  shuffleArray,
  getCurrentHour,
  isRushHour,
  getTimeOfDay,
  calculatePercentile,
  exponentialBackoff,
  validateElevatorConfig,
  sanitizeConfig
}