module.exports = {
  apps: [
    {
      // Backend: Express.js (Port 5000)
      name: "vaulteer-backend",
      cwd: "/opt/Vaulteer/backend",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      // Important: This tells PM2 to watch your .env file for changes
      watch: false, 
      env: {
        NODE_ENV: "production",
        TRUST_PROXY: "1",
        REDIS_HOST: "127.0.0.1",
        REDIS_PORT: "6379",
        REDIS_PASSWORD: "",
      },
      // Ensures PM2 uses the .env file in the backend directory
      env_file: ".env", 
      max_memory_restart: "700M",
      error_file: "/home/ubuntu/vaulteer_logs/backend-error.log",
      out_file: "/home/ubuntu/vaulteer_logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      autorestart: true,
      restart_delay: 4000, // 4s delay gives Redis/DB time to recover
    },
    {
      // Frontend: Next.js (Port 3000)
      name: "vaulteer-frontend",
      cwd: "/opt/Vaulteer/frontend",
      // Optimization: Calling 'node_modules/.bin/next' directly is faster/more stable than 'npx'
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_file: ".env",
      max_memory_restart: "1G", // Next.js build/start can be memory intensive
      error_file: "/home/ubuntu/vaulteer_logs/frontend-error.log",
      out_file: "/home/ubuntu/vaulteer_logs/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      autorestart: true,
      restart_delay: 4000,
    },
    {
      // 3. Redis Server
      name: "vaulteer-redis",
      // Path to the redis-server binary (default for Ubuntu)
      script: "/usr/bin/redis-server",
      // Pass the config file path if you have custom settings
      args: "--port 6379 --protected-mode no",
      instances: 1,
      exec_mode: "fork",
      // Logs setup consistent with your other apps
      error_file: "/home/ubuntu/vaulteer_logs/redis-error.log",
      out_file: "/home/ubuntu/vaulteer_logs/redis-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      autorestart: true,
      // No need for env_file here as Redis uses its own .conf file
    },
  ],
};