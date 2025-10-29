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

const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (no origin header)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject others
    return callback(new Error("CORS not allowed for origin: " + origin));
  },
  credentials: true,
});

module.exports = { corsMiddleware, lanAddress };
