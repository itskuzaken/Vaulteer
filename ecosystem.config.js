module.exports = {
  apps: [
    {
      // Backend: Express.js (Port 5000)
      name: "vaulteer-backend",
      cwd: "/opt/Vaulteer/backend", 
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        TRUST_PROXY: "1", 
      },
      max_memory_restart: "700M",
      error_file: "/home/ubuntu/vaulteer_logs/backend-error.log",
      out_file: "/home/ubuntu/vaulteer_logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
    },
    {
      // Frontend: Next.js (Port 3000)
      name: "vaulteer-frontend",
      cwd: "/opt/Vaulteer/frontend", 
      script: "npx",
      args: "next start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "700M",
      error_file: "/home/ubuntu/vaulteer_logs/frontend-error.log",
      out_file: "/home/ubuntu/vaulteer_logs/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
    },
  ],
};