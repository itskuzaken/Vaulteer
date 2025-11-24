/**
 * Middleware to protect internal-only routes
 * Requires X-INTERNAL-TOKEN header to match INTERNAL_API_TOKEN env variable
 *
 * Use this for routes that should ONLY be callable by your server (Next.js SSR, cron jobs, etc.)
 * NOT for routes that need to be accessible from user browsers
 */

const { CONFIG } = require("../config/env");

function internalOnly(req, res, next) {
  const token = process.env.INTERNAL_API_TOKEN;

  // In production, INTERNAL_API_TOKEN is required
  if (!token) {
    if (CONFIG.NODE_ENV === "production") {
      console.error(
        "[internalOnly] INTERNAL_API_TOKEN not configured in production"
      );
      return res.status(500).json({ error: "Server misconfiguration" });
    }
    // In development, allow bypass for convenience
    console.warn(
      "[internalOnly] dev mode: INTERNAL_API_TOKEN not set, allowing request"
    );
    return next();
  }

  const supplied = req.headers["x-internal-token"];

  if (supplied === token) {
    return next();
  }

  // Log unauthorized attempts
  console.warn("[internalOnly] rejected unauthorized internal API call", {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  return res.status(403).json({ error: "Forbidden" });
}

module.exports = internalOnly;
