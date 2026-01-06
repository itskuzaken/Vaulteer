module.exports = {
  apps: [
    {
      // Backend: Express.js (Port 5000)
      // Note: Redis managed by system service (systemctl), not PM2
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
      restart_delay: 3000, // 3s delay for clean startup
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