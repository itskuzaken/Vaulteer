/**
 * Centralized error handler middleware
 * Masks stack traces in production and provides consistent error responses
 */

function errorHandler(err, req, res, next) {
  // Log the full error for debugging (use proper logging service in production)
  console.error("[Error Handler]", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Default to 500 if no status code is set
  const statusCode = err.statusCode || res.statusCode || 500;

  // Send appropriate response based on environment
  res.status(statusCode).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

/**
 * 404 handler for unmatched routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path,
  });
}

module.exports = { errorHandler, notFoundHandler };
