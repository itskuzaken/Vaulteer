const rateLimit = require("express-rate-limit");

// Helper: derive a reliable client identifier for rate limiting.
// - Prefer Express' `req.ip` (which respects `trust proxy` when configured)
// - Fallback to socket remoteAddress or x-real-ip header
// - Normalize IPv4-mapped IPv6 addresses
function getClientIp(req) {
  let ip =
    req.ip ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown";
  if (typeof ip === "string" && ip.startsWith("::ffff:"))
    ip = ip.replace("::ffff:", "");
  return ip;
}

/**
 * General API rate limiter (500 requests per 15 minutes per IP)
 * Increased from 100 to accommodate auth-heavy dashboard patterns
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  // Use a custom key generator so we only rely on Express' computed `req.ip` (which
  // will respect trust proxy if set) and avoid express-rate-limit throwing when
  // X-Forwarded-For exists but trust proxy is not configured.
  keyGenerator: (req /*, res */) => getClientIp(req),
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res /*, next */) => {
    const who = getClientIp(req);
    console.warn(`[rateLimiter] apiLimiter blocked ${who} ${req.method} ${req.originalUrl}`);
    // Attempt to compute a sensible Retry-After in seconds
    let retryAfterSec = Math.ceil((req.rateLimit && req.rateLimit.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : (15 * 60)));
    if (!isFinite(retryAfterSec) || retryAfterSec < 1) retryAfterSec = Math.ceil(15 * 60);
    res.set('Retry-After', String(retryAfterSec));
    res.status(429).json({ error: 'Too many requests from this IP, please try again later.', retryAfter: retryAfterSec });
  }
});

/**
 * Auth endpoint rate limiter (50 attempts per 15 minutes per IP)
 * Increased from 10 to handle legitimate dashboard auth checks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  // For authentication endpoints prefer to rate limit by user (if authenticated)
  // otherwise by IP. Also skip counting successful requests so legitimate
  // logins don't count towards the limit.
  keyGenerator: (req /*, res */) => {
    // If we have a resolved firebase uid from prior auth middleware, use it
    if (req.firebaseUid) return `uid:${req.firebaseUid}`;
    return getClientIp(req);
  },
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Count only failed requests (helps reduce false positives)
  handler: (req, res /*, next */) => {
    const who = req.firebaseUid ? `uid:${req.firebaseUid}` : getClientIp(req);
    console.warn(`[rateLimiter] authLimiter blocked ${who} ${req.method} ${req.originalUrl}`);
    let retryAfterSec = Math.ceil((req.rateLimit && req.rateLimit.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : (15 * 60)));
    if (!isFinite(retryAfterSec) || retryAfterSec < 1) retryAfterSec = Math.ceil(15 * 60);
    res.set('Retry-After', String(retryAfterSec));
    res.status(429).json({ error: 'Too many authentication attempts, please try again later.', retryAfter: retryAfterSec });
  }
});

/**
 * Moderate rate limiter for write operations (30 requests per 15 minutes per IP)
 */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req /*, res */) => {
    // For write endpoints use a combined key when available: prefer uid then IP
    if (req.firebaseUid) return `uid:${req.firebaseUid}`;
    return getClientIp(req);
  },
  message: {
    error: "Too many write requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Log a warning for blocked clients so we can investigate repeated write abuse
  handler: (req, res /*, next */) => {
    const who = req.firebaseUid ? `uid:${req.firebaseUid}` : getClientIp(req);
    console.warn(
      `[rateLimiter] writeLimiter blocked ${who} ${req.method} ${req.originalUrl}`
    );
    res
      .status(429)
      .json({ error: "Too many write requests, please try again later." });
  },
});

module.exports = { apiLimiter, authLimiter, writeLimiter };
