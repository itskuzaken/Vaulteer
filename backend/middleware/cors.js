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
});

module.exports = { corsMiddleware, lanAddress };
