const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack)

  let error = { ...err }
  error.message = err.message

  // Validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message)
    error = { message, statusCode: 400 }
  }

  // Simulation error
  if (err.message.includes('simulation')) {
    error = { message: err.message, statusCode: 400 }
  }

  // Elevator assignment error
  if (err.message.includes('elevator')) {
    error = { message: err.message, statusCode: 422 }
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    timestamp: new Date().toISOString()
  })
}

module.exports = errorHandler