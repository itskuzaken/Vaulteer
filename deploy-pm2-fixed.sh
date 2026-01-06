#!/bin/bash
# deploy-pm2.sh - PM2 deployment (Redis managed by system service)

set -e

echo "🚀 Starting Vaulteer Deployment with PM2..."

# Stop all existing processes
echo "⏸️  Stopping existing PM2 processes..."
pm2 stop all || true

# Delete old processes (clean slate)
echo "🗑️  Removing old PM2 processes..."
pm2 delete all || true

# Build Frontend
echo "🔨 Building Next.js frontend..."
cd /opt/Vaulteer/frontend
npm install --production=false
npm run build
cd /opt/Vaulteer

# Verify system Redis is running (managed by systemctl, not PM2)
echo "🔍 Checking system Redis service..."
if ! redis-cli -h 127.0.0.1 -p 6379 ping > /dev/null 2>&1; then
  echo "⚠️  Redis not responding, attempting to start system service..."
  sudo systemctl start redis-server || sudo systemctl start redis
  sleep 2
  if ! redis-cli -h 127.0.0.1 -p 6379 ping > /dev/null 2>&1; then
    echo "❌ Failed to start Redis service"
    echo "   Try: sudo systemctl status redis"
    exit 1
  fi
fi
echo "✅ Redis is ready!"

# Start Backend
echo "🔧 Starting Backend..."
pm2 start ecosystem.config.js --only vaulteer-backend

# Wait 3 seconds for backend to initialize
sleep 3

# Start Frontend
echo "🎨 Starting Frontend..."
pm2 start ecosystem.config.js --only vaulteer-frontend

# Save PM2 process list for auto-restart on reboot
echo "💾 Saving PM2 process list..."
pm2 save

# Setup PM2 startup script (only needs to be done once, but safe to repeat)
echo "🔄 Setting up PM2 startup script..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu | grep -v "PM2" | bash || true

# Show status
echo ""
echo "✅ Deployment Complete!"
echo ""
pm2 status

echo ""
echo "📊 Checking logs..."
echo ""
pm2 logs --lines 10 --nostream

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "Monitor logs with: pm2 logs"
echo "Check status with: pm2 status"
echo "Restart all with: pm2 restart all"
