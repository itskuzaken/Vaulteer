module.exports = {
  apps: [
    {
      // Redis Server - MUST START FIRST
      name: "vaulteer-redis",
      script: "/usr/bin/redis-server",
      // Bind only to localhost for security (no external access)
      args: "--port 6379 --bind 127.0.0.1 --maxmemory 256mb --maxmemory-policy allkeys-lru",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      error_file: "/home/ubuntu/vaulteer_logs/redis-error.log",
      out_file: "/home/ubuntu/vaulteer_logs/redis-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      restart_delay: 2000,
    },
    {
      // Backend: Express.js (Port 5000) - Starts after Redis
      name: "vaulteer-backend",
      cwd: "/opt/Vaulteer/backend",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false, 
      env: {
        NODE_ENV: "production",
        TRUST_PROXY: "1",
        REDIS_HOST: "127.0.0.1",
        REDIS_PORT: "6379",
        REDIS_PASSWORD: "",
      },
      env_file: ".env", 
      max_memory_restart: "700M",
      error_file: "/home/ubuntu/vaulteer_logs/backend-error.log",
      out_file: "/home/ubuntu/vaulteer_logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      autorestart: true,
      restart_delay: 5000, // 5s delay ensures Redis is ready
    },
    {
      // Frontend: Next.js (Port 3000)
      name: "vaulteer-frontend",
      cwd: "/opt/Vaulteer/frontend",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_file: ".env",
      max_memory_restart: "1G",
      error_file: "/home/ubuntu/vaulteer_logs/frontend-error.log",
      out_file: "/home/ubuntu/vaulteer_logs/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      autorestart: true,
      restart_delay: 4000,
    },
  ],
};