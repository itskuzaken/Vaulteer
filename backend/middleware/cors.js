const cors = require("cors");
const os = require("os");
const { CONFIG } = require("../config/env");

// Determine LAN IP automatically if not provided
function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

const detectedLan = getLanIp();
const lanAddress = CONFIG.LAN_ADDRESS || detectedLan;

// Build allowed origins list
const allowedOrigins = [
  "http://localhost:3000",
  `http://${lanAddress}:3000`,
  CONFIG.FRONTEND_URL,
].filter(Boolean);

function isPrivateNetworkHost(hostname) {
  if (!hostname) {
    return false;
  }

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === lanAddress
  ) {
    return true;
  }

  if (/^192\.168\./.test(hostname)) {
    return true;
  }

  if (/^10\./.test(hostname)) {
    return true;
  }

  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
    return true;
  }

  return false;
}

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    try {
      const { hostname } = new URL(origin);
      if (CONFIG.NODE_ENV !== "production" && isPrivateNetworkHost(hostname)) {
        return callback(null, true);
      }
    } catch (parseError) {
      console.warn("Failed to parse origin for CORS check:", parseError);
    }

    return callback(new Error("CORS not allowed for origin: " + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
});

// More permissive CORS for static files (images, etc.)
const staticFilesCorsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, Postman, or same-origin)
    if (!origin) {
      return callback(null, true);
    }

    // Allow all localhost and LAN origins in development
    if (CONFIG.NODE_ENV !== "production") {
      try {
        const { hostname } = new URL(origin);
        if (isPrivateNetworkHost(hostname)) {
          return callback(null, true);
        }
      } catch (parseError) {
        // If URL parsing fails, allow it in development
        return callback(null, true);
      }
    }

    // Allow configured origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, true); // More permissive for static files
  },
  credentials: false, // Static files don't need credentials
  methods: ['GET', 'HEAD', 'OPTIONS'],
});

module.exports = { corsMiddleware, staticFilesCorsMiddleware, lanAddress };
