const {
  createLog,
  LOG_TYPES,
  SEVERITY_LEVELS,
} = require("../services/activityLogService");

/**
 * Middleware to automatically log API requests
 * Use this for sensitive operations that should be audited
 */
function logActivity(options = {}) {
  return async (req, res, next) => {
    const {
      type = LOG_TYPES.DATA_ACCESS,
      action = req.method,
      description,
      severity = SEVERITY_LEVELS.INFO,
      getTargetResource,
      getChanges,
    } = options;

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Only log successful operations (status 200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Capture timestamp at the moment of action
        const actionTimestamp = new Date();

        // Don't await - log in background
        createLog({
          type,
          action,
          performedBy: {
            userId: req.user?.uid || "anonymous",
            name: req.user?.name || req.user?.email || "Anonymous",
            role: req.user?.role || "unknown",
          },
          targetResource: getTargetResource
            ? getTargetResource(req, body)
            : null,
          changes: getChanges ? getChanges(req, body) : null,
          description: description || `${action} request to ${req.originalUrl}`,
          severity,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers["user-agent"],
          sessionId: req.session?.id || null,
          metadata: {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            timestamp: actionTimestamp.toISOString(),
            localTime: actionTimestamp.toLocaleString(),
          },
        }).catch((error) => {
          console.error("Failed to create activity log:", error);
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Helper function to create a manual log entry
 * Use this for custom logging in route handlers
 */
async function logAction(
  req,
  {
    type,
    action,
    targetResource = null,
    changes = null,
    description = "",
    severity = "INFO",
    metadata = null,
  }
) {
  try {
    // Capture timestamp at the moment of action
    const actionTimestamp = new Date();

    await createLog({
      type,
      action,
      performedBy: {
        userId: req.user?.uid || "system",
        name: req.user?.name || req.user?.email || "System",
        role: req.user?.role || "system",
      },
      targetResource,
      changes,
      description,
      severity,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
      sessionId: req.session?.id || null,
      metadata: {
        ...metadata,
        timestamp: actionTimestamp.toISOString(),
        localTime: actionTimestamp.toLocaleString(),
      },
    });
  } catch (error) {
    console.error("Failed to create activity log:", error);
    // Don't throw - logging failure shouldn't break the request
  }
}

/**
 * Predefined logging middleware for common operations
 */
const logMiddleware = {
  // Authentication logs
  loginSuccess: logActivity({
    type: LOG_TYPES.AUTH,
    action: "LOGIN",
    description: "User logged in successfully",
    severity: SEVERITY_LEVELS.INFO,
  }),

  loginFailed: logActivity({
    type: LOG_TYPES.AUTH,
    action: "FAILED_LOGIN",
    description: "Failed login attempt",
    severity: SEVERITY_LEVELS.MEDIUM,
  }),

  logout: logActivity({
    type: LOG_TYPES.AUTH,
    action: "LOGOUT",
    description: "User logged out",
    severity: SEVERITY_LEVELS.INFO,
  }),

  // Volunteer management
  createVolunteer: logActivity({
    type: LOG_TYPES.VOLUNTEER_MANAGEMENT,
    action: "CREATE",
    description: "Created new volunteer",
    severity: SEVERITY_LEVELS.INFO,
    getTargetResource: (req, res) => ({
      type: "volunteer",
      id: res.data?.id || req.body?.id,
      name: req.body?.name || "Unknown",
    }),
  }),

  updateVolunteer: logActivity({
    type: LOG_TYPES.VOLUNTEER_MANAGEMENT,
    action: "UPDATE",
    description: "Updated volunteer information",
    severity: SEVERITY_LEVELS.INFO,
    getTargetResource: (req) => ({
      type: "volunteer",
      id: req.params?.id,
      name: req.body?.name || "Unknown",
    }),
    getChanges: (req) => req.body,
  }),

  deleteVolunteer: logActivity({
    type: LOG_TYPES.VOLUNTEER_MANAGEMENT,
    action: "DELETE",
    description: "Deleted volunteer",
    severity: SEVERITY_LEVELS.MEDIUM,
    getTargetResource: (req) => ({
      type: "volunteer",
      id: req.params?.id,
    }),
  }),

  approveVolunteer: logActivity({
    type: LOG_TYPES.VOLUNTEER_MANAGEMENT,
    action: "APPROVE",
    description: "Approved volunteer application",
    severity: SEVERITY_LEVELS.INFO,
    getTargetResource: (req) => ({
      type: "volunteer",
      id: req.params?.id,
    }),
  }),

  // Staff management
  createStaff: logActivity({
    type: LOG_TYPES.STAFF_MANAGEMENT,
    action: "CREATE",
    description: "Created new staff account",
    severity: SEVERITY_LEVELS.MEDIUM,
    getTargetResource: (req, res) => ({
      type: "staff",
      id: res.data?.id || req.body?.id,
      name: req.body?.name || "Unknown",
    }),
  }),

  deleteStaff: logActivity({
    type: LOG_TYPES.STAFF_MANAGEMENT,
    action: "DELETE",
    description: "Deleted staff account",
    severity: SEVERITY_LEVELS.HIGH,
    getTargetResource: (req) => ({
      type: "staff",
      id: req.params?.id,
    }),
  }),

  // Event management
  createEvent: logActivity({
    type: LOG_TYPES.EVENT,
    action: "CREATE",
    description: "Created new event",
    severity: SEVERITY_LEVELS.INFO,
    getTargetResource: (req, res) => ({
      type: "event",
      id: res.data?.id || req.body?.id,
      name: req.body?.title || "Unknown Event",
    }),
  }),

  // Settings changes
  updateSettings: logActivity({
    type: LOG_TYPES.SETTINGS,
    action: "UPDATE_CONFIG",
    description: "Updated system settings",
    severity: SEVERITY_LEVELS.MEDIUM,
    getChanges: (req) => req.body,
  }),

  // Security events
  unauthorizedAccess: logActivity({
    type: LOG_TYPES.SECURITY,
    action: "UNAUTHORIZED_ACCESS",
    description: "Attempted unauthorized access",
    severity: SEVERITY_LEVELS.HIGH,
  }),

  // Data access
  viewSensitiveData: logActivity({
    type: LOG_TYPES.DATA_ACCESS,
    action: "VIEW_SENSITIVE_INFO",
    description: "Accessed sensitive information",
    severity: SEVERITY_LEVELS.MEDIUM,
  }),
};

module.exports = {
  logActivity,
  logAction,
  logMiddleware,
};
